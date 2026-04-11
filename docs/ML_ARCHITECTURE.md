# ML Architecture — Deep Dive

> Technical reference for the machine learning subsystems powering EduPlatform's adaptive learning engine.

---

## Overview

EduPlatform employs a **hybrid intelligence architecture** with two distinct execution tiers:

| Tier | Runtime | Models | Latency | Use Case |
|---|---|---|---|---|
| **Tier 1: Edge** | TypeScript (Next.js) | BKT, IRT, Naïve Bayes, MAB | < 1ms | Real-time personalization on every interaction |
| **Tier 2: Service** | Python (FastAPI) | DKT-LSTM, Random Forest, K-Means | 50-200ms | Batch predictions, analytics, classification |

This separation ensures that students receive instant feedback (Tier 1) while teachers get sophisticated analytics (Tier 2) without impacting the critical path of the learning experience.

---

## Tier 1: Edge Models (TypeScript)

### Bayesian Knowledge Tracing (BKT)

**File:** `src/lib/knowledgeTracing.ts`

BKT is a Hidden Markov Model that tracks the probability a student has mastered a specific concept. It operates as a two-state model: `mastered` and `not mastered`.

#### State Transition Diagram

```
                    P(Transit)
    ┌─────────────────────────┐
    │                         ▼
┌───┴───────┐          ┌──────────┐
│   NOT     │          │          │
│ MASTERED  │          │ MASTERED │
│           │          │          │
└───────────┘          └──────────┘
    │                         │
    │     Observation:        │
    │  ┌──────────────────┐   │
    ├──│ Correct: P(1-S)  │───┤
    │  │ Incorrect: P(S)  │   │
    │  └──────────────────┘   │
    │                         │
    │  ┌──────────────────┐   │
    └──│ Correct: P(G)    │───┘
       │ Incorrect: P(1-G)│
       └──────────────────┘
```

#### Update Algorithm

```typescript
// Step 1: Compute posterior based on observation
if (isCorrect) {
  posterior = (prior * (1 - P_SLIP)) / (prior * (1 - P_SLIP) + (1 - prior) * P_GUESS)
} else {
  posterior = (prior * P_SLIP) / (prior * P_SLIP + (1 - prior) * (1 - P_GUESS))
}

// Step 2: Account for learning transfer
newMastery = posterior + (1 - posterior) * P_TRANSIT
```

#### Persistence

Updated per quiz submission via `knowledge_states` table, keyed on `(student_id, subject_id, concept)`.

---

### Item Response Theory (IRT) — 1PL Rasch Model

**File:** `src/lib/irt.ts`

IRT models the interaction between student ability (θ) and question difficulty (b).

#### Core Functions

| Function | Purpose |
|---|---|
| `calculateProbability(θ, b)` | Returns P(correct) using the logistic function |
| `updateAbility(θ, b, isCorrect, lr)` | Gradient-based θ update after each response |
| `selectOptimalQuestions(θ, pool, count)` | Selects questions maximizing Fisher information |

#### Ability Update Mechanism

```
P(correct) = σ(θ - b)        // Sigmoid (logistic function)
residual = actual - P(correct) // Error signal
θ_new = θ + lr × residual     // Gradient step (lr = 0.3 default)
```

**Key Insight:** When a student answers correctly on a difficult question (low P, high residual), their ability increases significantly. When they answer incorrectly on an easy question, it decreases significantly.

#### Adaptive Exam Construction

The `selectOptimalQuestions` function sorts candidate questions by `|b - θ|` and selects those closest to the student's ability level. In the Rasch model, maximum Fisher information occurs when `b = θ`, making these questions the most informative for ability estimation.

---

### Naïve Bayes Learning Style Classifier

**File:** `src/lib/naiveBayes.ts`

A generative classifier that maintains a posterior probability distribution over three learning styles: `visual`, `auditory`, `reading`.

#### Likelihood Table

| Event | P(E|Visual) | P(E|Auditory) | P(E|Reading) |
|---|---|---|---|
| `content_open_video` | 0.70 | 0.20 | 0.10 |
| `content_open_audio` | 0.10 | 0.75 | 0.15 |
| `content_open_text` | 0.10 | 0.10 | 0.80 |
| `hint_used_level_1` | 0.35 | 0.35 | 0.30 |
| `hint_used_level_2` | 0.15 | 0.15 | 0.70 |
| `quiz_score_high_video` | 0.65 | 0.25 | 0.10 |
| `quiz_score_high_text` | 0.10 | 0.10 | 0.80 |
| `quiz_score_high_audio` | 0.15 | 0.70 | 0.15 |
| `content_reopen` | 0.33 | 0.33 | 0.34 |

#### Confidence Metric

```
confidence = max(0, (maxProb - 0.333) / (1 - 0.333) × 100)
```

Maps from the theoretical range `[1/3, 1]` (equal probability → certainty) to `[0%, 100%]`. Styles below 15% confidence are classified as `undetermined`.

---

### Multi-Armed Bandit (ε-Greedy)

**File:** `src/lib/banditEngine.ts`

Balances exploration of new content formats vs. exploitation of known-effective formats.

| Parameter | Value | Rationale |
|---|---|---|
| Arms | video, audio, text | Three content delivery formats |
| ε | 0.2 | 20% exploration rate |
| Reward | quiz score ≥ 70% | Binary: content led to successful learning |
| Initialization | 0.5 win rate | Optimistic initial values for cold start |

#### Selection Logic

```
With probability ε → select random arm (explore)
With probability 1-ε → select arm with highest win_rate (exploit)
    where win_rate = wins / trials (or 0.5 if trials = 0)
```

---

## Tier 2: Service Models (Python/FastAPI)

### Deep Knowledge Tracing (DKT-LSTM)

**Files:** `ml/models/dkt.py`, `ml/training/train_dkt.py`

#### Model Architecture

```
Input (2 × num_skills)
    │
    ▼
┌──────────────────────────────────────┐
│            LSTM Layer                 │
│  input_size = 2 × 123 = 246         │
│  hidden_size = 128                    │
│  num_layers = 1                       │
│  dropout = 0.2                        │
│  batch_first = True                   │
│  Packed sequences for variable length │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│          Dropout (0.2)                │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│    Linear (128 → 123 skills)         │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│           Sigmoid                     │
│  Output: P(correct) per skill        │
│  Shape: (batch, seq_len, num_skills) │
└──────────────────────────────────────┘
```

#### Training Pipeline

1. **Load** ASSISTments CSV (~327K interactions, 4,151 students, 123 skills)
2. **Pre-process:** Drop nulls, remap skill IDs to contiguous `[0, N)`, build per-student sequences
3. **Filter:** Students with ≥ 5 interactions
4. **Truncate:** Sequences to max 200 timesteps
5. **Split:** 80/20 by student (not by interaction)
6. **Train:** BCE loss with masking, Adam optimizer, gradient clipping (max norm = 5.0)
7. **Evaluate:** AUC-ROC on held-out students

#### Checkpoint Format

```python
{
    "model_state_dict": ...,  # PyTorch state dict
    "num_skills": 123,        # Number of unique skills
    "hidden_size": 128,       # LSTM hidden dimension
    "skill_map": {...}        # Original skill_id → contiguous index mapping
}
```

---

### Random Forest Style Classifier

**Files:** `ml/models/style_classifier.py`, `ml/training/train_style_classifier.py`

#### Feature Engineering

| Feature | Type | Description |
|---|---|---|
| `video_open_count` | int | Times student opened video content |
| `audio_open_count` | int | Times student opened audio content |
| `text_open_count` | int | Times student opened text content |
| `reopen_count` | int | Total content re-opens (engagement signal) |
| `hint_usage_rate` | float | Proportion of interactions involving hints |
| `total_interactions` | int | Total logged events |
| `first_content_type` | int | Encoded first content opened (0=video, 1=audio, 2=text) |

#### Training Strategy

The model is trained on the **first 10 interactions** per student rather than all interactions. This enables **early-stage prediction** — detecting learning style before the student has engaged extensively with the platform.

#### Ground Truth Labels

In synthetic data, ground truth is derived from the student archetype's dominant content preference. In production, labels come from the Naïve Bayes profiler's `predicted_style` in `learning_style_profiles`.

---

### K-Means Student Clustering

**Files:** `ml/models/clustering.py`, `ml/training/train_clustering.py`

#### Feature Vector (8 dimensions)

| Feature | Range | Description |
|---|---|---|
| `pct_video` | [0, 1] | Proportion of video interactions |
| `pct_audio` | [0, 1] | Proportion of audio interactions |
| `pct_text` | [0, 1] | Proportion of text interactions |
| `avg_quiz_score` | [0, 100] | Mean quiz score |
| `avg_hints_per_quiz` | [0, ∞) | Average hints used per quiz |
| `total_interactions` | [1, ∞) | Total event count |
| `reopen_rate` | [0, 1] | Proportion of re-open events |
| `quiz_pass_rate` | [0, 1] | Proportion of quizzes scoring ≥ 70% |

#### Auto-Labeling Algorithm

After fitting K-Means, cluster centroids are inverse-transformed from scaled space to original feature space. Each centroid is then analyzed:

1. **Content Preference:** Dominant content type among `pct_video`, `pct_audio`, `pct_text` → "Visual" / "Auditory" / "Reading"
2. **Performance Level:** `avg_quiz_score ≥ 75` → "High-Performing", `≥ 50` → "Average", else "Struggling"
3. **Engagement Level:** `total_interactions ≥ median` → "Engaged", else "Low-Engagement"

**Output:** Composite labels like `"High-Performing Visual Engaged Learner"` or `"Struggling Reading Low-Engagement Learner"`

---

## Model Serving Architecture

```
┌──────────────────────────────────────────────────┐
│                FastAPI Application                │
│                                                   │
│  @app.on_event("startup")                        │
│  ├── load_dkt()     → dkt_model (PyTorch)        │
│  ├── load_clustering() → cluster_pipeline (sklearn)│
│  └── load_style()   → style_pipeline (sklearn)    │
│                                                   │
│  /health             → Model status check         │
│  /predict/mastery    → DKT inference pipeline      │
│  /predict/learning-style → RF inference pipeline   │
│  /cluster/students   → KMeans inference pipeline   │
│                                                   │
│  CORS: Allow all origins (development)            │
│  Timeout: 5s (mastery, style), 10s (clustering)   │
└──────────────────────────────────────────────────┘
```

All models are loaded into memory at startup for sub-second inference. The Next.js application communicates with this service via `src/lib/mlClient.ts`, which wraps all HTTP calls with timeouts and graceful fallbacks.

---

## Data Flow: End-to-End Adaptive Cycle

```
Student opens content
    │
    ├──► logInteraction() [Server Action]
    │    ├──► INSERT student_interactions (Supabase)
    │    ├──► updateBayesianProfile() [Naïve Bayes]
    │    └──► UPSERT learning_style_profiles (Supabase)
    │
Student completes quiz
    │
    ├──► submitQuizAttempt() [Server Action]
    │    ├──► INSERT quiz_attempts (Supabase)
    │    ├──► updateMastery() [BKT] per question
    │    │    └──► UPSERT knowledge_states (Supabase)
    │    ├──► updateAbility() [IRT] per question
    │    │    └──► UPSERT student_abilities (Supabase)
    │    └──► recordBanditReward() [MAB]
    │         └──► UPSERT bandit_arms (Supabase)
    │
Student returns to subject page
    │
    ├──► getLearningStyleProfile() → determines content type
    ├──► getBanditRecommendation() → fallback if style undetermined
    ├──► predictMastery() → DKT inference (via Python service)
    └──► Render personalized view:
         ├── Recommended content tab pre-selected
         ├── BKT vs DKT mastery comparison
         └── Personalized exam (if ≥ 3 quizzes completed)
```
