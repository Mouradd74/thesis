import json
import random
import uuid

SUBJECT_ID = 'e99b9ace-df80-423d-8b8f-17a077156df3'
QUIZZES = [
    {"id": "811691aa-9fef-4b14-8511-f961d6e031e5", "title": "test quiz 2", "q_count": 5},
    {"id": "7e64d70b-c2db-47e7-9fbf-d2362b64331e", "title": "test for exam 1", "q_count": 7},
    {"id": "28642139-6dfe-4f36-b966-a0852b0495fd", "title": "test for exam 2", "q_count": 7},
    {"id": "66609f74-8eb3-4c96-bdbb-d70ca497992a", "title": "Solving linear equations", "q_count": 7},
    {"id": "fe4aced8-e805-4f6c-9bf1-7e71382e14c3", "title": "intro", "q_count": 7}
]

NUM_STUDENTS = 60

ARCHETYPES = [
    {'name': 'visual_achiever', 'video': 0.7, 'audio': 0.1, 'text': 0.2, 'score': 0.85, 'hints': 0.1},
    {'name': 'methodical_reader', 'video': 0.1, 'audio': 0.1, 'text': 0.8, 'score': 0.75, 'hints': 0.3},
    {'name': 'audio_explorer', 'video': 0.2, 'audio': 0.7, 'text': 0.1, 'score': 0.70, 'hints': 0.4},
    {'name': 'at_risk', 'video': 0.3, 'audio': 0.2, 'text': 0.5, 'score': 0.40, 'hints': 0.8},
]

def format_sql_str(v):
    if v is None:
        return 'NULL'
    if isinstance(v, str):
        return f"'{v}'"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, dict) or isinstance(v, list):
        return f"'{json.dumps(v, ensure_ascii=True)}'::jsonb"
    return str(v)

def generate_inserts(table, rows):
    if not rows:
        return ""
    keys = list(rows[0].keys())
    cols = ", ".join(keys)
    
    inserts = []
    chunk_size = 50
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i+chunk_size]
        vals = []
        for row in chunk:
            str_vals = [format_sql_str(row[k]) for k in keys]
            vals.append(f"({', '.join(str_vals)})")
        inserts.append(f"INSERT INTO {table} ({cols}) VALUES\n{', '.join(vals)};")
    return "\n".join(inserts) + "\n"

profiles = []
auth_users = []
interactions = []
quiz_attempts = []
learning_styles = []

for _ in range(NUM_STUDENTS):
    sid = str(uuid.uuid4())
    profiles.append({'id': sid, 'role': 'student'})
    auth_users.append({
        'id': sid, 
        'aud': 'authenticated', 
        'role': 'authenticated', 
        'email': f'synthetic_{sid[:8]}@example.com',
        'raw_user_meta_data': {'is_synthetic': True}
    })
    
    arch = random.choice(ARCHETYPES)
    types = ['video', 'audio', 'text']
    probs = [arch['video'], arch['audio'], arch['text']]
    
    num_lessons = random.randint(2, 5)
    for q in random.sample(QUIZZES, num_lessons):
        # Generate interactions for this lesson
        num_interactions = random.randint(3, 8)
        for i in range(num_interactions):
            ctype = random.choices(types, weights=probs)[0]
            
            # Content open
            interactions.append({
                'id': str(uuid.uuid4()),
                'student_id': sid,
                'subject_id': SUBJECT_ID,
                'content_type': ctype,
                'event_type': 'content_open',
                'metadata': {'is_synthetic': True}
            })
            
            # Reopen or hint
            if random.random() < arch['hints']:
                event_type = 'hint_used' if random.random() < 0.5 else 'content_reopen'
                interactions.append({
                    'id': str(uuid.uuid4()),
                    'student_id': sid,
                    'subject_id': SUBJECT_ID,
                    'content_type': ctype,
                    'event_type': event_type,
                    'metadata': {'is_synthetic': True}
                })
        
        # Quiz Attempt
        q_count = q['q_count']
        answers = []
        hints_used = []
        score_val = arch['score'] + random.gauss(0, 0.1)
        score_val = max(0.0, min(1.0, score_val))
        num_correct = int(round(score_val * q_count))
        
        for idx in range(q_count):
            answers.append(f"ans_{idx}" if idx < num_correct else f"wrong_ans_{idx}")
            hints_used.append(bool(random.random() < arch['hints']))
            
        quiz_attempts.append({
            'id': str(uuid.uuid4()),
            'student_id': sid,
            'quiz_id': q['id'],
            'answers': answers,
            'score': int(score_val * 100),
            'hints_used': hints_used
        })
        
        interactions.append({
            'id': str(uuid.uuid4()),
            'student_id': sid,
            'subject_id': SUBJECT_ID,
            'content_type': 'general',
            'event_type': 'quiz_score_high' if score_val >= 0.7 else 'quiz_score_low',
            'metadata': {'is_synthetic': True}
        })
        
    # Learning style profile (randomly set for now, will be updated by TS logic if we ran it, or we insert it representing their past)
    predicted_style = 'visual' if arch['video'] > 0.5 else 'reading' if arch['text'] > 0.5 else 'auditory' if arch['audio'] > 0.5 else 'undetermined'
    learning_styles.append({
        'student_id': sid,
        'subject_id': SUBJECT_ID,
        'visual_prob': arch['video'],
        'auditory_prob': arch['audio'],
        'reading_prob': arch['text'],
        'predicted_style': predicted_style,
        'confidence': 80 + random.randint(-10, 10),
        'interaction_count': num_lessons * 5
    })

sql = "-- Generate Synthetic Data\n\n"
sql += generate_inserts('auth.users', auth_users)
sql += generate_inserts('profiles', profiles)
sql += generate_inserts('student_interactions', interactions)
sql += generate_inserts('quiz_attempts', quiz_attempts)
sql += generate_inserts('learning_style_profiles', learning_styles)

with open('seed_synthetic.sql', 'w') as f:
    f.write(sql)

print(f"Generated {len(profiles)} students, {len(interactions)} interactions, {len(quiz_attempts)} quiz attempts.")
