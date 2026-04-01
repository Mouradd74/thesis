"""
ML Microservice API

FastAPI server hosting DKT and Student Performance Predictor models.
Provides prediction endpoints called by the Next.js application.

Usage:
    cd thesis
    uvicorn ml.api.main:app --reload --port 8000
"""

import os
import sys
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from ml.models.dkt import DKTModel, encode_interaction
from ml.models.clustering import load_model as load_cluster_model, extract_features as extract_cluster_features, FEATURE_NAMES as CLUSTER_FEATURES
from ml.models.style_classifier import load_model as load_style_model, extract_style_features

# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Adaptive Learning ML API",
    description="Deep Knowledge Tracing (DKT) and Student Performance Prediction endpoints",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Loading ───────────────────────────────────────────────────────────

DKT_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'dkt_model.pt')
dkt_model = None
dkt_num_skills = 0
dkt_skill_map = {}
dkt_reverse_skill_map = {}

cluster_pipeline = None
cluster_feature_names = None
cluster_labels_list = None

style_pipeline = None
style_feature_names = None
style_classes = None


def load_dkt():
    """Load the trained DKT model from disk."""
    global dkt_model, dkt_num_skills, dkt_skill_map, dkt_reverse_skill_map

    if not os.path.exists(DKT_MODEL_PATH):
        print(f"[API] DKT model not found at {DKT_MODEL_PATH} — endpoint will return errors until trained")
        return False

    checkpoint = torch.load(DKT_MODEL_PATH, map_location='cpu', weights_only=False)
    dkt_num_skills = checkpoint['num_skills']
    dkt_skill_map = checkpoint['skill_map']
    dkt_reverse_skill_map = {v: k for k, v in dkt_skill_map.items()}
    hidden_size = checkpoint.get('hidden_size', 128)

    dkt_model = DKTModel(num_skills=dkt_num_skills, hidden_size=hidden_size)
    dkt_model.load_state_dict(checkpoint['model_state_dict'])
    dkt_model.eval()

    print(f"[API] DKT model loaded: {dkt_num_skills} skills, hidden_size={hidden_size}")
    return True

def load_clustering():
    global cluster_pipeline, cluster_feature_names, cluster_labels_list
    path = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'clustering_model.pkl')
    if not os.path.exists(path):
        print(f"[API] Clustering model not found at {path}")
        return False
    cluster_pipeline, cluster_feature_names, cluster_labels_list = load_cluster_model(path)
    print(f"[API] Clustering model loaded: {len(cluster_labels_list)} clusters")
    return True

def load_style():
    global style_pipeline, style_feature_names, style_classes
    path = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'style_classifier.pkl')
    if not os.path.exists(path):
        print(f"[API] Style classifier not found at {path}")
        return False
    style_pipeline, style_feature_names, style_classes = load_style_model(path)
    print(f"[API] Style classifier loaded: {style_classes}")
    return True




@app.on_event("startup")
async def startup():
    """Load models when the server starts."""
    print("[API] Starting ML Microservice...")
    dkt_ok = load_dkt()
    clustering_ok = load_clustering()
    style_ok = load_style()
    if dkt_ok and clustering_ok and style_ok:
        print("[API] All models loaded successfully ✓")
    else:
        print("[API] Some models missing — train them first with:")
        print("      python -m ml.training.train_dkt")
        print("      python -m ml.training.train_clustering")
        print("      python -m ml.training.train_style_classifier")


# ─── Request/Response Schemas ────────────────────────────────────────────────

class Interaction(BaseModel):
    skill_id: int
    correct: bool


class MasteryRequest(BaseModel):
    student_interactions: list[Interaction]


class MasteryResponse(BaseModel):
    mastery_probabilities: dict[str, float]
    overall_mastery: float
    num_interactions: int
    model: str = "DKT-LSTM"


class HealthResponse(BaseModel):
    status: str
    dkt_loaded: bool
    clustering_loaded: bool
    style_loaded: bool

class StylePredictRequest(BaseModel):
    student_id: str
    interactions: list[dict]

class StylePredictResponse(BaseModel):
    predicted_style: str
    confidence: float

class ClusterStudentsRequest(BaseModel):
    students_features: list[dict]

class ClusterStudentsResponse(BaseModel):
    clusters: list[dict]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check — shows which models are loaded."""
    return HealthResponse(
        status="ok",
        dkt_loaded=dkt_model is not None,
        clustering_loaded=cluster_pipeline is not None,
        style_loaded=style_pipeline is not None,
    )


@app.post("/predict/mastery", response_model=MasteryResponse)
async def predict_mastery(request: MasteryRequest):
    """
    Predict concept mastery probabilities using the DKT LSTM model.
    
    Takes a sequence of student interactions (skill_id, correct) and returns
    the predicted mastery probability for each skill encountered.
    """
    if dkt_model is None:
        raise HTTPException(status_code=503, detail="DKT model not loaded. Run: python -m ml.training.train_dkt")

    interactions = request.student_interactions
    if len(interactions) == 0:
        raise HTTPException(status_code=400, detail="At least one interaction is required")

    # Map skill IDs to model indices
    encoded_seq = []
    encountered_skills = set()

    for interaction in interactions:
        skill_idx = dkt_skill_map.get(interaction.skill_id)
        if skill_idx is not None:
            vec = encode_interaction(skill_idx, interaction.correct, dkt_num_skills)
            encoded_seq.append(vec)
            encountered_skills.add(skill_idx)

    if len(encoded_seq) == 0:
        raise HTTPException(status_code=400, detail="No valid skill IDs found in interactions")

    # Create tensor and predict
    input_tensor = torch.tensor([encoded_seq], dtype=torch.float32)
    lengths = torch.tensor([len(encoded_seq)], dtype=torch.long)

    with torch.no_grad():
        probs = dkt_model(input_tensor, lengths)  # (1, seq_len, num_skills)

    # Get the final timestep predictions for encountered skills
    last_probs = probs[0, len(encoded_seq) - 1, :]  # (num_skills,)

    mastery_dict = {}
    for skill_idx in encountered_skills:
        original_skill_id = dkt_reverse_skill_map.get(skill_idx, skill_idx)
        prob = last_probs[skill_idx].item()
        mastery_dict[str(original_skill_id)] = round(prob, 4)

        overall=float(np.mean(list(mastery_dict.values()))) if mastery_dict else 0.0

    return MasteryResponse(
        mastery_probabilities=mastery_dict,
        overall_mastery=round(overall, 4),
        num_interactions=len(interactions),
    )

@app.post("/predict/learning-style", response_model=StylePredictResponse)
async def predict_learning_style(request: StylePredictRequest):
    if style_pipeline is None:
        raise HTTPException(status_code=503, detail="Style classifier not loaded.")
        
    print(f"\n[DEBUG: Style Predictor] Received request for student: {request.student_id}")
    print(f"[DEBUG: Style Predictor] Incoming interactions count: {len(request.interactions)}")
        
    import pandas as pd
    df_inter = pd.DataFrame(request.interactions)
    features = extract_style_features(request.student_id, df_inter)
    
    if features is None:
        print("[DEBUG: Style Predictor] Could not extract features, returning 'undetermined'")
        return StylePredictResponse(predicted_style="undetermined", confidence=0.0)
        
    df_f = pd.DataFrame([features])
    X = df_f[style_feature_names]
    
    print(f"[DEBUG: Style Predictor] Extracted model features: \n{X.to_dict(orient='records')[0]}")
    
    pred = style_pipeline.predict(X)[0]
    probas = style_pipeline.predict_proba(X)[0]
    conf = float(max(probas)) * 100
    
    print(f"[DEBUG: Style Predictor] Prediction complete -> Style: {pred} | Confidence: {conf:.2f}%\n")
    
    return StylePredictResponse(predicted_style=pred, confidence=conf)

@app.post("/cluster/students", response_model=ClusterStudentsResponse)
async def cluster_students(request: ClusterStudentsRequest):
    if cluster_pipeline is None:
        raise HTTPException(status_code=503, detail="Clustering model not loaded.")
        
    print(f"\n[DEBUG: Clustering] Received request to cluster {len(request.students_features)} students.")
        
    if not request.students_features:
        return ClusterStudentsResponse(clusters=[])
        
    import pandas as pd
    df_f = pd.DataFrame(request.students_features)
    X = df_f[cluster_feature_names]
    
    print("[DEBUG: Clustering] Performing KMeans segmentation...")
    preds = cluster_pipeline.predict(X)
    
    # Group students by cluster
    clusters = []
    colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]
    
    for i in range(len(cluster_labels_list)):
        mask = (preds == i)
        student_ids = df_f[mask]['student_id'].tolist()
        
        clusters.append({
            "id": i,
            "label": cluster_labels_list[i],
            "color": colors[i % len(colors)],
            "students": student_ids,
            "count": len(student_ids)
        })
        
        if len(student_ids) > 0:
            print(f"[DEBUG: Clustering] -> Cluster {i} ({cluster_labels_list[i]}): {len(student_ids)} students")
            
    print("[DEBUG: Clustering] Segmentation complete!\n")
    return ClusterStudentsResponse(clusters=clusters)




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
