import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    'video_open_count',
    'audio_open_count',
    'text_open_count',
    'reopen_count',
    'hint_usage_rate',
    'total_interactions',
    'first_content_type' # 0=video, 1=audio, 2=text
]

CLASSES = ['visual', 'auditory', 'reading', 'undetermined']

def build_style_pipeline():
    """Build a sklearn pipeline with scaling and RandomForest."""
    return Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5))
    ])

def extract_style_features(student_id: str, df_interactions):
    """
    Extract features for predicting learning style from historical interactions.
    """
    if len(df_interactions) == 0:
        return None

    video_open = len(df_interactions[
        (df_interactions['content_type'] == 'video') & 
        (df_interactions['event_type'] == 'content_open')
    ])
    audio_open = len(df_interactions[
        (df_interactions['content_type'] == 'audio') & 
        (df_interactions['event_type'] == 'content_open')
    ])
    text_open = len(df_interactions[
        (df_interactions['content_type'] == 'text') & 
        (df_interactions['event_type'] == 'content_open')
    ])
    
    reopen_count = len(df_interactions[df_interactions['event_type'] == 'content_reopen'])
    
    hints_used = len(df_interactions[df_interactions['event_type'].str.contains('hint')])
    total_interactions = len(df_interactions)
    hint_usage_rate = hints_used / total_interactions if total_interactions > 0 else 0.0
    
    # First content type opened
    opens = df_interactions[df_interactions['event_type'] == 'content_open']
    if len(opens) > 0:
        first_ctype = opens.iloc[0]['content_type']
        first_mapping = {'video': 0, 'audio': 1, 'text': 2}
        first_val = first_mapping.get(first_ctype, 0)
    else:
        first_val = 0

    return {
        'student_id': student_id,
        'video_open_count': video_open,
        'audio_open_count': audio_open,
        'text_open_count': text_open,
        'reopen_count': reopen_count,
        'hint_usage_rate': hint_usage_rate,
        'total_interactions': total_interactions,
        'first_content_type': first_val
    }

def save_model(pipeline, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump({
        'pipeline': pipeline,
        'feature_names': FEATURE_NAMES,
        'classes': pipeline.classes_
    }, path)

def load_model(path: str):
    data = joblib.load(path)
    return data['pipeline'], data['feature_names'], data['classes']
