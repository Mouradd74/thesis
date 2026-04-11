# Contributing to EduPlatform

Thank you for your interest in contributing to EduPlatform! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** ≥ 18.17 with npm ≥ 9
- **Python** ≥ 3.10 with pip ≥ 22
- **Git** for version control

### Getting Started

```bash
# Clone the repo
git clone https://github.com/<your-username>/thesis.git
cd thesis

# Install dependencies
npm install
pip install -r ml/requirements.txt

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and API keys

# Start development servers
npm run dev              # Next.js → http://localhost:3000
uvicorn ml.api.main:app --reload --port 8000  # FastAPI → http://localhost:8000
```

## Architecture Guidelines

### Frontend (TypeScript / Next.js)

- **Server Components by default.** Only use `'use client'` when strictly necessary (interactivity, hooks, browser APIs).
- **Server Actions** for all data mutations. Do not create REST API routes for CRUD operations.
- **Supabase client instantiation:**
  - Server Components / Server Actions → `createClient()` from `@/utils/supabase/server`
  - Client Components → `createBrowserClient()` from `@/utils/supabase/client`

### ML Pipeline (Python)

- All models live in `ml/models/` with a consistent interface: `build_*_pipeline()`, `extract_*_features()`, `save_model()`, `load_model()`.
- Training scripts live in `ml/training/` and are executed as modules: `python -m ml.training.train_dkt`.
- The FastAPI server in `ml/api/main.py` loads all models at startup and serves predictions via REST.

### Styling

- Use **Tailwind CSS v4** with the design tokens defined in `src/app/globals.css`.
- Follow the existing dark-mode-first aesthetic with zinc backgrounds and subtle borders.
- Use `class-variance-authority` (CVA) for component variants.

## Code Quality

### TypeScript

- Strict mode is enabled.
- Prefer `interface` over `type` for object shapes.
- Use proper typing for Supabase responses; avoid `any` where possible.

### Python

- Follow PEP 8 conventions.
- Type hints are encouraged for all function signatures.
- Document all public functions with docstrings.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add student progress tracking
fix: resolve BKT update race condition
docs: update API reference for /predict/mastery
refactor: extract quiz generation to shared utility
test: add DKT training validation tests
chore: bump Next.js to 16.2
```

## Pull Request Process

1. **Branch** from `main` using descriptive names: `feature/student-dashboard`, `fix/bkt-calculation`, etc.
2. **Keep PRs focused.** One feature or fix per PR.
3. **Write descriptive PR titles** following commit conventions.
4. **Include screenshots** for any UI changes.
5. **Test your changes:**
   - Verify the Next.js app builds: `npm run build`
   - Verify the ML service starts: `uvicorn ml.api.main:app --port 8000`
   - Manual testing through the UI for affected flows. 
6. **Request review** from at least one maintainer.

## Reporting Issues

When reporting bugs, please include:

- **Environment:** OS, Node.js version, Python version, browser
- **Steps to reproduce** the issue
- **Expected behavior** vs. **actual behavior**
- **Screenshots or logs** if applicable
- **Relevant configuration** (redact API keys)

## Questions?

Open a Discussion or Issue on the repository. We're happy to help!
