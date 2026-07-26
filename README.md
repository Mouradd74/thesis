<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-61dafb?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/PyTorch-2.0+-ee4c2c?style=for-the-badge&logo=pytorch" alt="PyTorch" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-3ecf8e?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
</p>

# EduPlatform — Adaptive Learning System

> **A full-stack intelligent tutoring system that personalizes educational content delivery using machine learning, Bayesian inference, and reinforcement learning techniques.**

EduPlatform is a multi-role web application (Student + Teacher) that adapts to each learner's cognitive profile in real time. It combines classical educational data mining models (BKT, IRT, Naïve Bayes) with modern deep learning (DKT-LSTM, Random Forest, K-Means) and an ε-Greedy Multi-Armed Bandit to deliver a data-driven, personalized learning experience.

---

## Table of Contents

- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Machine Learning Pipeline](#machine-learning-pipeline)
  - [Deep Knowledge Tracing (DKT)](#1-deep-knowledge-tracing-dkt)
  - [Learning Style Classifier](#2-learning-style-classifier)
  - [Student Clustering](#3-student-clustering)
  - [Bayesian Knowledge Tracing (BKT)](#4-bayesian-knowledge-tracing-bkt)
  - [Item Response Theory (IRT)](#5-item-response-theory-irt)
  - [Naïve Bayes Profiler](#6-naïve-bayes-profiler)
  - [Multi-Armed Bandit](#7-multi-armed-bandit-ε-greedy)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Content Ingestion Pipeline](#content-ingestion-pipeline)
- [Authentication & Authorization](#authentication--authorization)
- [Synthetic Data Generation](#synthetic-data-generation)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Key Features

### Student Portal
| Feature | Description |
|---|---|
| **Adaptive Content Delivery** | Content format (video, audio, text) is recommended based on the student's detected learning style |
| **AI-Powered Chatbot** | Per-lesson streaming chatbot grounded in the lesson's study guide via RAG-like context injection |
| **Multi-Format Lessons** | Each lesson is auto-generated as a 3-part module: embedded YouTube video, AI-generated study guide, and TTS audio narration |
| **Intelligent Quizzes** | LLM-generated MCQ quizzes with 2-tier progressive hint system |
| **Personalized Exams** | Auto-generated subject exams that prioritize previously failed questions and use IRT for optimal question selection |
| **ML Mastery Insights** | Side-by-side comparison of BKT (heuristic) vs. DKT (neural) mastery predictions per concept |
| **Learning Style Badge** | Real-time Bayesian + ML learning style classification with confidence metrics |
| **To-Do List** | Adaptive task management for student self-organization |

### Teacher Portal
| Feature | Description |
|---|---|
| **Curriculum Management** | Create subjects and manually upload content layers (video/audio/text) |
| **Magic Auto-Ingestor** | One-click YouTube → multi-format lesson pipeline with AI study guide, TTS audio, and quiz generation |
| **AI Analytics Dashboard** | K-Means student clustering with auto-labeled archetypes (e.g., "High-Performing Visual Engaged Learner") |
| **360° Student Profiles** | Deep-dive into any student's cognitive abilities (IRT θ), concept mastery (BKT), learning style, and activity metrics |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│                    Next.js 16 App Router (RSC)                      │
│         ┌──────────┐  ┌──────────┐  ┌──────────────────┐           │
│         │ Student  │  │ Teacher  │  │  Auth (Login/    │           │
│         │ Portal   │  │ Portal   │  │  Signup)         │           │
│         └────┬─────┘  └────┬─────┘  └────────┬─────────┘           │
└──────────────┼─────────────┼─────────────────┼──────────────────────┘
               │             │                 │
               ▼             ▼                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER (Node.js)                       │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Server Actions  │  │  TypeScript ML Engines (Edge Runtime)  │   │
│  │  (Content CRUD,  │  │  • Bayesian Knowledge Tracing (BKT)    │   │
│  │   Quiz Submit,   │  │  • Item Response Theory (IRT 1PL)      │   │
│  │   Interactions)  │  │  • Naïve Bayes Style Profiler           │   │
│  └────────┬─────────┘  │  • ε-Greedy Multi-Armed Bandit          │   │
│           │            └────────────────┬────────────────────────┘   │
│           │                             │                            │
│  ┌────────▼─────────┐  ┌───────────────▼────────────────────────┐   │
│  │  API Routes       │  │  ML Client (src/lib/mlClient.ts)      │   │
│  │  /api/chat (SSE)  │  │  HTTP calls to Python microservice     │   │
│  └────────┬─────────┘  └───────────────┬────────────────────────┘   │
└───────────┼─────────────────────────────┼────────────────────────────┘
            │                             │
            ▼                             ▼
┌───────────────────────┐   ┌──────────────────────────────────────────┐
│   External APIs       │   │       PYTHON ML MICROSERVICE             │
│  ┌─────────────────┐  │   │          FastAPI (Port 8000)             │
│  │ OpenRouter LLM  │  │   │                                          │
│  │ (Study Guides,  │  │   │  ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │  Quizzes, Chat) │  │   │  │ DKT LSTM │ │ Style RF  │ │ KMeans │ │
│  ├─────────────────┤  │   │  │ (PyTorch)│ │(Sklearn)  │ │Cluster │ │
│  │ MS Edge TTS     │  │   │  └──────────┘ └───────────┘ └────────┘ │
│  │ (Audio Gen)     │  │   │                                          │
│  ├─────────────────┤  │   │  Endpoints:                              │
│  │ YouTube         │  │   │  POST /predict/mastery                   │
│  │ Transcript API  │  │   │  POST /predict/learning-style            │
│  └─────────────────┘  │   │  POST /cluster/students                  │
└───────────────────────┘   │  GET  /health                            │
                            └──────────────┬───────────────────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │     SUPABASE (PostgreSQL)     │
                            │                              │
                            │  Tables:                     │
                            │  • profiles                  │
                            │  • subjects                  │
                            │  • content                   │
                            │  • quizzes                   │
                            │  • quiz_attempts             │
                            │  • exams / exam_attempts     │
                            │  • student_interactions      │
                            │  • learning_style_profiles   │
                            │  • knowledge_states (BKT)    │
                            │  • student_abilities (IRT)   │
                            │  • bandit_arms               │
                            │  • enrollments               │
                            │                              │
                            │  Storage Buckets:            │
                            │  • audio (TTS mp3 files)     │
                            └──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4 | Server-rendered UI with React Server Components |
| **UI Components** | Radix UI, Lucide Icons, CVA | Accessible, composable primitives |
| **Backend** | Next.js Server Actions, API Routes | Zero-API data mutations, streaming SSE |
| **Database** | Supabase (PostgreSQL) | Auth, ORM-less queries, real-time, storage |
| **Auth** | Supabase Auth + SSR cookies | Role-based (student/teacher) session middleware |
| **ML Microservice** | Python 3.10+, FastAPI, Uvicorn | Model serving with CORS-enabled REST API |
| **Deep Learning** | PyTorch 2.0+ | DKT-LSTM sequence model |
| **Classical ML** | scikit-learn 1.3+ | Random Forest, K-Means, StandardScaler pipelines |
| **LLM Integration** | OpenAI SDK → OpenRouter | Study guide generation, quiz generation, chatbot |
| **Text-to-Speech** | msedge-tts | Neural TTS audio generation for study guides |
| **Data** | ASSISTments 2009-2010 | Training dataset for DKT model (83MB, 123 skills) |

---

## Project Structure

```
thesis/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts              # Streaming AI chatbot endpoint (SSE)
│   │   ├── login/                        # Authentication: login page
│   │   ├── signup/                       # Authentication: registration page
│   │   ├── student/
│   │   │   ├── layout.tsx                # Student shell (sidebar, auth guard)
│   │   │   ├── page.tsx                  # Student dashboard (courses + ML badges)
│   │   │   ├── subjects/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Subject viewer (lessons, exams, ML insights)
│   │   │   │       ├── LessonTabs.tsx    # Tabbed lesson viewer (video/text/audio)
│   │   │   │       ├── LessonChat.tsx    # Per-lesson AI chatbot component
│   │   │   │       ├── QuizPanel.tsx     # Interactive quiz with hints
│   │   │   │       └── ExamPanel.tsx     # Personalized exam component
│   │   │   ├── learning-style/
│   │   │   │   └── actions.ts            # Bayesian profiler + bandit server actions
│   │   │   ├── assignments/              # Student assignments page
│   │   │   └── todo/                     # Adaptive to-do list
│   │   ├── teacher/
│   │   │   ├── layout.tsx                # Teacher shell (sidebar, auth guard)
│   │   │   ├── page.tsx                  # Teacher overview dashboard
│   │   │   ├── content/
│   │   │   │   ├── page.tsx              # Curriculum management UI
│   │   │   │   └── actions.ts            # Content CRUD, YouTube ingestor, quiz gen
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx              # AI-powered student clustering dashboard
│   │   │   └── students/
│   │   │       ├── page.tsx              # Student roster
│   │   │       └── [id]/
│   │   │           └── page.tsx          # 360° student profile (IRT, BKT, style)
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Landing page
│   │   └── globals.css                   # Design system (Tailwind v4 + CSS variables)
│   ├── components/
│   │   └── ui/                           # Reusable UI primitives (Card, Button, Input, etc.)
│   ├── lib/
│   │   ├── knowledgeTracing.ts           # Bayesian Knowledge Tracing (BKT) engine
│   │   ├── irt.ts                        # Item Response Theory (1PL Rasch) engine
│   │   ├── naiveBayes.ts                 # Naïve Bayes learning style classifier
│   │   ├── banditEngine.ts               # ε-Greedy Multi-Armed Bandit for content selection
│   │   ├── mlClient.ts                   # HTTP client for Python ML microservice
│   │   └── utils.ts                      # Shared utilities (cn helper)
│   ├── hooks/
│   │   └── useTyping.ts                  # Typing animation hook for chatbot
│   ├── utils/
│   │   └── supabase/
│   │       ├── client.ts                 # Browser-side Supabase client
│   │       ├── server.ts                 # Server-side Supabase client (cookies)
│   │       └── middleware.ts             # Session refresh middleware
│   └── middleware.ts                     # Next.js route middleware (auth session)
├── ml/
│   ├── api/
│   │   └── main.py                       # FastAPI server (model loading + endpoints)
│   ├── models/
│   │   ├── dkt.py                        # DKT-LSTM model architecture (PyTorch)
│   │   ├── clustering.py                 # K-Means pipeline + feature extraction
│   │   └── style_classifier.py           # Random Forest pipeline + feature extraction
│   ├── training/
│   │   ├── train_dkt.py                  # DKT training on ASSISTments dataset
│   │   ├── train_clustering.py           # K-Means training from Supabase data
│   │   ├── train_style_classifier.py     # Style classifier training from Supabase data
│   │   └── generate_seed_sql_v2.py       # Synthetic data generator (60 students, 4 archetypes)
│   ├── saved_models/
│   │   ├── dkt_model.pt                  # Trained DKT checkpoint (~842KB)
│   │   ├── style_classifier.pkl          # Trained Random Forest (~226KB)
│   │   └── clustering_model.pkl          # Trained K-Means pipeline (~2.5KB)
│   ├── data/
│   │   └── assistments.csv               # ASSISTments 2009-2010 dataset (~83MB)
│   └── requirements.txt                  # Python dependencies
├── scripts/
│   └── backfill_names.sql                # Utility: backfill student names
├── seed_synthetic.sql                    # Pre-generated synthetic seed data (60 students)
├── supabase_migrations.sql               # BKT + IRT table migrations
├── package.json                          # Node.js dependencies
├── tsconfig.json                         # TypeScript configuration
├── next.config.ts                        # Next.js configuration
└── postcss.config.mjs                    # PostCSS + Tailwind configuration
```

---

## Machine Learning Pipeline

EduPlatform employs a **hybrid ML architecture** that combines real-time heuristic models (running in the Next.js TypeScript runtime) with batch-trained deep learning models (served via a Python FastAPI microservice). This dual approach allows the system to provide immediate personalization from the first interaction while progressively improving predictions as more data accumulates.

### 1. Deep Knowledge Tracing (DKT)

| Attribute | Detail |
|---|---|
| **Architecture** | LSTM (Long Short-Term Memory) |
| **Framework** | PyTorch |
| **Training Data** | ASSISTments 2009-2010 Skill-builder (~83MB, 123 skills) |
| **Input** | Sequence of `(skill_id, correctness)` one-hot vectors of dimension `2 × num_skills` |
| **Output** | Per-skill mastery probability at each timestep |
| **Hyperparameters** | `hidden_size=128`, `num_layers=1`, `dropout=0.2`, `lr=0.001`, `epochs=15` |
| **Evaluation** | AUC-ROC on 20% held-out student sequences |
| **Reference** | Piech et al. (2015) — "Deep Knowledge Tracing" |

**Encoding Scheme:**
- Correct answer on skill `k` → one-hot at index `k`
- Incorrect answer on skill `k` → one-hot at index `num_skills + k`

### 2. Learning Style Classifier

| Attribute | Detail |
|---|---|
| **Algorithm** | Random Forest (100 estimators, max_depth=5) |
| **Framework** | scikit-learn |
| **Training Data** | Supabase `student_interactions` + `learning_style_profiles` |
| **Features** | `video_open_count`, `audio_open_count`, `text_open_count`, `reopen_count`, `hint_usage_rate`, `total_interactions`, `first_content_type` |
| **Classes** | `visual`, `auditory`, `reading`, `undetermined` |
| **Pipeline** | StandardScaler → RandomForestClassifier |
| **Strategy** | Trained on first 10 interactions per student for early prediction |

### 3. Student Clustering

| Attribute | Detail |
|---|---|
| **Algorithm** | K-Means (k=4) |
| **Framework** | scikit-learn |
| **Training Data** | Supabase `student_interactions` + `quiz_attempts` |
| **Features** | `pct_video`, `pct_audio`, `pct_text`, `avg_quiz_score`, `avg_hints_per_quiz`, `total_interactions`, `reopen_rate`, `quiz_pass_rate` |
| **Pipeline** | StandardScaler → KMeans |
| **Auto-Labeling** | Centroids are inverse-transformed and mapped to human-readable labels (e.g., "High-Performing Visual Engaged Learner") based on dominant content preference, quiz performance, and engagement level |

### 4. Bayesian Knowledge Tracing (BKT)

Runs **client-side in TypeScript** for zero-latency updates after each quiz interaction.

**Parameters:**
| Parameter | Symbol | Default | Description |
|---|---|---|---|
| Slip | P(S) | 0.10 | Probability of error despite mastery |
| Guess | P(G) | 0.20 | Probability of correct guess without mastery |
| Transit | P(T) | 0.10 | Probability of learning after one attempt |
| Prior | P(L₀) | 0.10 | Initial mastery probability |

**Update Rule:**
```
If correct:  P(L|correct)  = P(L)·(1-P(S)) / [P(L)·(1-P(S)) + (1-P(L))·P(G)]
If incorrect: P(L|incorrect) = P(L)·P(S)     / [P(L)·P(S)     + (1-P(L))·(1-P(G))]

P(Lₙ) = P(L|obs) + (1 - P(L|obs)) · P(T)
```

### 5. Item Response Theory (IRT)

Implements the **1-Parameter Logistic (Rasch) model** in TypeScript for:

1. **Ability Estimation:** Updates student ability θ after each quiz response using gradient-based updates with a configurable learning rate (default: 0.3)
2. **Adaptive Question Selection:** Selects exam questions that maximize Fisher information by minimizing `|b - θ|` (question difficulty vs. student ability)

**Probability Model:**
```
P(correct) = 1 / (1 + e^(-(θ - b)))
```

### 6. Naïve Bayes Profiler

A **real-time Bayesian style classifier** running in TypeScript that updates after every student interaction:

- **Prior:** Uniform (1/3, 1/3, 1/3) across visual, auditory, reading
- **Likelihood Table:** 9 event types × 3 learning styles (hand-tuned)
- **Update:** Standard Bayes posterior calculation with normalization
- **Confidence:** Mapped from `[0.333, 1.0]` → `[0%, 100%]`; styles below 15% confidence are labeled `undetermined`

### 7. Multi-Armed Bandit (ε-Greedy)

Explores vs. exploits content format delivery per student per subject:

- **Arms:** `video`, `audio`, `text`
- **Exploration Rate:** ε = 0.2 (20% random exploration)
- **Reward Signal:** Quiz score ≥ 70% after consuming a content type
- **Cold Start:** Optimistic initialization (0.5 win rate for untried arms)
- **Persistence:** Per-student, per-subject arm statistics stored in Supabase `bandit_arms` table

---

## Database Schema

```sql
-- Core entities
profiles         (id, full_name, role, created_at)
subjects         (id, teacher_id, title, description, created_at)
content          (id, subject_id, title, type, url, body, created_at)
enrollments      (id, student_id, subject_id, motivation_score, attendance_rate)

-- Assessment
quizzes          (id, subject_id, lesson_title, questions[JSONB])
quiz_attempts    (id, student_id, quiz_id, answers[JSONB], hints_used[JSONB], score)
exams            (id, student_id, subject_id, questions[JSONB])
exam_attempts    (id, student_id, exam_id, answers[JSONB], score)

-- Interaction tracking
student_interactions  (id, student_id, subject_id, content_type, event_type, metadata, created_at)

-- ML state tables
learning_style_profiles  (student_id, subject_id, visual_prob, auditory_prob, reading_prob,
                          predicted_style, confidence, interaction_count, updated_at)
knowledge_states         (student_id, subject_id, concept, p_mastery, attempts_count, last_updated)
student_abilities        (student_id, subject_id, ability_theta, last_updated)
bandit_arms              (student_id, subject_id, content_type, trials, wins, updated_at)
```

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18.17+ |
| npm | 9+ |
| Python | 3.10+ |
| pip | 22+ |
| Supabase Account | Free tier (sufficient) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/thesis.git
cd thesis

# 2. Install Node.js dependencies
npm install

# 3. Install Python ML dependencies
pip install -r ml/requirements.txt
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# LLM (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...

# ML Microservice URL (optional, defaults to http://localhost:8000)
ML_API_URL=http://localhost:8000
```

### Database Setup

1. **Create tables** in your Supabase SQL Editor by running the DDL statements corresponding to the schema above.

2. **Run migrations** for BKT and IRT tables:
   ```bash
   # Execute in Supabase SQL Editor
   cat supabase_migrations.sql
   ```

3. **(Optional) Seed synthetic data** for testing ML features:
   ```bash
   # Generate new synthetic data (or use the pre-generated file)
   python -m ml.training.generate_seed_sql_v2

   # Then execute seed_synthetic.sql in Supabase SQL Editor
   ```

### Running the Application

```bash
# Terminal 1: Start the Next.js dev server
npm run dev
# → http://localhost:3000

# Terminal 2: Start the ML microservice
uvicorn ml.api.main:app --reload --port 8000
# → http://localhost:8000/health
```

### Training ML Models

```bash
# Train DKT on ASSISTments dataset (requires ml/data/assistments.csv)
python -m ml.training.train_dkt

# Train clustering from live Supabase data
python -m ml.training.train_clustering

# Train learning style classifier from live Supabase data
python -m ml.training.train_style_classifier
```

> **Note:** The DKT model trains on the ASSISTments 2009-2010 Skill-builder dataset. Download it and place it at `ml/data/assistments.csv`. The clustering and style models require seeded or real interaction data in Supabase.

---

## API Reference

### ML Microservice Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Service health check + model load status | None |
| `POST` | `/predict/mastery` | DKT mastery prediction from interaction sequence | None |
| `POST` | `/predict/learning-style` | Random Forest style prediction from interaction history | None |
| `POST` | `/cluster/students` | K-Means student segmentation from feature vectors | None |

#### `POST /predict/mastery`

**Request:**
```json
{
  "student_interactions": [
    { "skill_id": 42, "correct": true },
    { "skill_id": 42, "correct": false },
    { "skill_id": 15, "correct": true }
  ]
}
```

**Response:**
```json
{
  "mastery_probabilities": { "42": 0.7234, "15": 0.5891 },
  "overall_mastery": 0.6563,
  "num_interactions": 3,
  "model": "DKT-LSTM"
}
```

#### `POST /predict/learning-style`

**Request:**
```json
{
  "student_id": "uuid-here",
  "interactions": [
    { "content_type": "video", "event_type": "content_open" },
    { "content_type": "text", "event_type": "hint_used" }
  ]
}
```

**Response:**
```json
{
  "predicted_style": "visual",
  "confidence": 82.5
}
```

#### `POST /cluster/students`

**Request:**
```json
{
  "students_features": [
    {
      "student_id": "uuid",
      "pct_video": 0.6, "pct_audio": 0.2, "pct_text": 0.2,
      "avg_quiz_score": 85, "avg_hints_per_quiz": 0.5,
      "total_interactions": 42, "reopen_rate": 0.1, "quiz_pass_rate": 0.8
    }
  ]
}
```

**Response:**
```json
{
  "clusters": [
    {
      "id": 0,
      "label": "High-Performing Visual Engaged Learner",
      "color": "#10b981",
      "students": ["uuid-1", "uuid-2"],
      "count": 2
    }
  ]
}
```

### Next.js API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Streaming AI chatbot (SSE) with lesson context grounding |

---

## Content Ingestion Pipeline

The **Magic Auto-Ingestor** transforms a YouTube URL into a complete multi-format lesson:

```
YouTube URL
    │
    ├── 1. Transcript Extraction (youtube-transcript)
    │       └── Raw transcript text
    │
    ├── 2. AI Study Guide Generation (OpenRouter LLM)
    │       └── Markdown study guide with proper formatting
    │
    ├── 3. Text-to-Speech (MS Edge Neural TTS)
    │       └── MP3 audio → Supabase Storage bucket
    │
    ├── 4. Auto Quiz Generation (OpenRouter LLM)
    │       └── 7-question MCQ with 2-tier hints + IRT difficulty
    │
    └── 5. Database Persistence
            ├── content (type: video) → embedded YouTube player
            ├── content (type: text)  → AI study guide
            ├── content (type: audio) → TTS audio player
            └── quizzes               → quiz questions (JSONB)
```

---

## Authentication & Authorization

- **Provider:** Supabase Auth with email/password
- **Session Management:** Server-side cookie-based sessions via `@supabase/ssr`
- **Middleware:** Next.js middleware refreshes auth tokens on every request
- **Role-Based Access:**
  - `profiles.role = 'student'` → redirected to `/student`
  - `profiles.role = 'teacher'` → redirected to `/teacher`
  - Cross-role access is blocked at the layout level with server-side guards

---

## Synthetic Data Generation

The project includes a data generation pipeline for cold-start scenarios:

```bash
python -m ml.training.generate_seed_sql_v2
```

**Configuration:**
- **60 synthetic students** across **4 behavioral archetypes:**

| Archetype | Video % | Audio % | Text % | Avg Score | Hint Rate |
|---|---|---|---|---|---|
| Visual Achiever | 70% | 10% | 20% | 85% | 10% |
| Methodical Reader | 10% | 10% | 80% | 75% | 30% |
| Audio Explorer | 20% | 70% | 10% | 70% | 40% |
| At-Risk Student | 30% | 20% | 50% | 40% | 80% |

The generator produces:
- Auth users + profiles
- Behavioral interaction logs (content opens, reopens, hints, quiz scores)
- Quiz attempts with answers and hint usage
- Pre-computed learning style profiles

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** changes: `git commit -m 'feat: add new feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `refactor:` | Code refactoring |
| `test:` | Test additions/changes |
| `chore:` | Build/tooling changes |

---

## License

This project is part of an academic thesis and is not currently licensed for commercial use.

---

## Acknowledgments

- **ASSISTments** — Training data for the DKT model (Worcester Polytechnic Institute)
- **Piech et al. (2015)** — Deep Knowledge Tracing, the foundational paper for the DKT architecture
- **Khan Academy** — Educational video content used in curriculum modules
- **OpenRouter** — LLM routing for study guide and quiz generation
- **Supabase** — Backend-as-a-Service powering authentication, database, and storage
- **Next.js** — React framework for the full-stack web application
- **OpenAI** — API for natural language processing and generation
- **youtube-transcript** — Extracts YouTube video transcripts for study guide generation
- **msedge-tts** — Neural text-to-speech for audio narration of study guides
- **FastAPI** — Python microservice framework for serving ML models
