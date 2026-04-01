import os
import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    'pct_video',
    'pct_audio',
    'pct_text',
    'avg_quiz_score',
    'avg_hints_per_quiz',
    'total_interactions',
    'reopen_rate',
    'quiz_pass_rate'
]

def build_clustering_pipeline(n_clusters=4):
    """Build a sklearn pipeline with scaling and KMeans."""
    from sklearn.pipeline import Pipeline
    return Pipeline([
        ('scaler', StandardScaler()),
        ('kmeans', KMeans(n_clusters=n_clusters, random_state=42, n_init='auto'))
    ])

def extract_features(student_id: str, df_interactions, df_quizzes):
    """
    Given a student's DataFrames (interactions and quiz_attempts),
    extract the 8 feature columns needed for clustering.
    Returns a dict with the features.
    """
    total_interactions = len(df_interactions)
    if total_interactions == 0:
        return None

    # Content type percentages
    video_count = len(df_interactions[df_interactions['content_type'] == 'video'])
    audio_count = len(df_interactions[df_interactions['content_type'] == 'audio'])
    text_count = len(df_interactions[df_interactions['content_type'] == 'text'])

    pct_video = video_count / total_interactions
    pct_audio = audio_count / total_interactions
    pct_text = text_count / total_interactions

    # Reopen rate
    reopen_count = len(df_interactions[df_interactions['event_type'] == 'content_reopen'])
    reopen_rate = reopen_count / total_interactions

    # Quiz features
    num_quizzes = len(df_quizzes)
    if num_quizzes > 0:
        avg_quiz_score = df_quizzes['score'].mean()
        passed = len(df_quizzes[df_quizzes['score'] >= 70])
        quiz_pass_rate = passed / num_quizzes

        # Calculate average hints used per quiz
        hints_used_list = []
        for hints in df_quizzes['hints_used']:
            if isinstance(hints, list):
                hints_used_list.append(sum([1 for h in hints if h is True]))
            else:
                hints_used_list.append(0)
        avg_hints_per_quiz = np.mean(hints_used_list) if hints_used_list else 0.0
    else:
        avg_quiz_score = 0.0
        quiz_pass_rate = 0.0
        avg_hints_per_quiz = 0.0

    return {
        'student_id': student_id,
        'pct_video': pct_video,
        'pct_audio': pct_audio,
        'pct_text': pct_text,
        'avg_quiz_score': avg_quiz_score,
        'avg_hints_per_quiz': avg_hints_per_quiz,
        'total_interactions': total_interactions,
        'reopen_rate': reopen_rate,
        'quiz_pass_rate': quiz_pass_rate
    }

def generate_cluster_labels(cluster_centers):
    """
    Auto-generate human-readable labels for each cluster based on its centroid.
    cluster_centers is a 2D numpy array: (n_clusters, n_features) BEFORE SCALING
    Wait, pipeline.transformers return scaled centers. 
    We should use the inverse transformed centers to evaluate labels.
    """
    labels = []
    
    # Feature indices
    i_video = FEATURE_NAMES.index('pct_video')
    i_audio = FEATURE_NAMES.index('pct_audio')
    i_text = FEATURE_NAMES.index('pct_text')
    i_score = FEATURE_NAMES.index('avg_quiz_score')
    i_eng = FEATURE_NAMES.index('total_interactions')

    median_eng = np.median(cluster_centers[:, i_eng])

    for centroid in cluster_centers:
        content_prefs = {
            'Visual': centroid[i_video],
            'Auditory': centroid[i_audio],
            'Reading': centroid[i_text]
        }
        dominant = max(content_prefs.items(), key=lambda x: x[1])[0]

        score = centroid[i_score]
        if score >= 75.0:
            performance = "High-Performing"
        elif score >= 50.0:
            performance = "Average"
        else:
            performance = "Struggling"

        eng = centroid[i_eng]
        if eng >= median_eng and eng > 0:
            engagement = "Engaged"
        else:
            engagement = "Low-Engagement"

        labels.append(f"{performance} {dominant} {engagement} Learner")

    return labels

def save_model(pipeline, cluster_labels, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump({
        'pipeline': pipeline,
        'feature_names': FEATURE_NAMES,
        'cluster_labels': cluster_labels
    }, path)

def load_model(path: str):
    data = joblib.load(path)
    return data['pipeline'], data['feature_names'], data['cluster_labels']
