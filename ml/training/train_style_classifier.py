import os
import pandas as pd
import numpy as np

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from ml.training.train_clustering import load_supabase_client, fetch_data
from ml.models.style_classifier import build_style_pipeline, extract_style_features, FEATURE_NAMES, save_model

def derive_ground_truth(student_id: str, df_inter, df_quizzes):
    """
    Derives the "true" learning style for a student:
    The content type that produced their highest average quiz scores.
    """
    # Group interactions by subject_id to find their dominant prep method per subject
    # Or keep it simple: over all time, what was the correlation?
    
    # Simple heuristic for ground truth:
    # Look at their synthetic profile prediction (which encodes their true archetype in our seeded data)
    # In a fully real system without synthetic labels, we'd map (quiz_score -> previous content_type interactions).
    pass

def train_style_classifier():
    print("Loading data from Supabase...")
    supabase = load_supabase_client()
    df_inter, df_quizzes = fetch_data(supabase)

    if df_inter.empty:
        print("No interactions found. Cannot run.")
        return

    # We need the 'predicted_style' from learning_style_profiles to act as our ground truth for training
    # because our seeder correctly assigned it based on the archetype!
    print("Fetching ground truth labels from learning_style_profiles...")
    profiles_res = supabase.table('learning_style_profiles').select('student_id, predicted_style').execute()
    df_profiles = pd.DataFrame(profiles_res.data)

    if df_profiles.empty:
        print("No labels found.")
        return

    features_list = []
    labels = []

    student_ids = df_inter['student_id'].unique()
    for sid in student_ids:
        # Find label
        s_prof = df_profiles[df_profiles['student_id'] == sid]
        if s_prof.empty:
            continue
        
        # In case a student has multiple profiles for multiple subjects, take the mode
        label = s_prof['predicted_style'].mode()[0]
        
        s_inter = df_inter[df_inter['student_id'] == sid].sort_values('created_at')
        
        # We simulate training on the FIRST 10 interactions to predict the label early!
        # If we train on all interactions, the model is 'cheating'. We want to predict style early.
        early_inter = s_inter.head(10)
        
        f = extract_style_features(sid, early_inter)
        if f is not None:
            features_list.append(f)
            labels.append(label)

    df_features = pd.DataFrame(features_list)
    X = df_features[FEATURE_NAMES]
    y = np.array(labels)

    print(f"Extracted features and labels for {len(X)} students.")
    if len(X) < 10:
        print("Need more data to train a good classifier (at least 10). Exiting.")
        if len(X) == 0: return

    print("Training Random Forest Classifier...")
    pipeline = build_style_pipeline()
    pipeline.fit(X, y)

    score = pipeline.score(X, y)
    print(f"Training Accuracy: {score:.2f}")

    path = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'style_classifier.pkl')
    save_model(pipeline, path)
    print(f"Learning Style Classifier saved to {path}")

if __name__ == "__main__":
    train_style_classifier()
