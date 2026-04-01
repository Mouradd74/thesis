import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from ml.models.clustering import build_clustering_pipeline, extract_features, generate_cluster_labels, save_model, FEATURE_NAMES

def load_supabase_client() -> Client:
    load_dotenv('.env.local')
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise ValueError("Supabase URL and Key must be set in .env.local")
    return create_client(url, key)

def fetch_data(supabase: Client):
    print("Fetching interactions...")
    interactions_res = supabase.table('student_interactions').select('*').execute()
    df_inter = pd.DataFrame(interactions_res.data)

    print("Fetching quiz attempts...")
    quizzes_res = supabase.table('quiz_attempts').select('*').execute()
    df_quizzes = pd.DataFrame(quizzes_res.data)

    return df_inter, df_quizzes

def train_clustering():
    print("Loading data from Supabase...")
    supabase = load_supabase_client()
    df_inter, df_quizzes = fetch_data(supabase)

    if df_inter.empty:
        print("No interactions found. Cannot run clustering.")
        return

    print("Extracting features per student...")
    student_ids = df_inter['student_id'].unique()
    features_list = []

    for sid in student_ids:
        s_inter = df_inter[df_inter['student_id'] == sid]
        s_quiz = df_quizzes[df_quizzes['student_id'] == sid] if not df_quizzes.empty else pd.DataFrame()
        f = extract_features(sid, s_inter, s_quiz)
        if f is not None:
            features_list.append(f)

    df_features = pd.DataFrame(features_list)
    X = df_features[FEATURE_NAMES]

    print(f"Extracted features for {len(X)} students.")
    if len(X) < 4:
        print("Not enough students to form 4 clusters. Assuming fewer clusters for now...")
        n_clusters = len(X)
        if n_clusters == 0:
            return
    else:
        n_clusters = 4

    print(f"Training K-Means with {n_clusters} clusters...")
    pipeline = build_clustering_pipeline(n_clusters=n_clusters)
    pipeline.fit(X)

    # Calculate cluster centroids in original scale
    scaler = pipeline.named_steps['scaler']
    kmeans = pipeline.named_steps['kmeans']
    
    # Original scale centroids
    centroids = scaler.inverse_transform(kmeans.cluster_centers_)
    
    # Generate labels
    labels = generate_cluster_labels(centroids)
    print("Generated Cluster Labels:")
    for i, lbl in enumerate(labels):
        print(f"Cluster {i}: {lbl}")

    path = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'clustering_model.pkl')
    save_model(pipeline, labels, path)
    print(f"Clustering model saved to {path}")

if __name__ == "__main__":
    train_clustering()
