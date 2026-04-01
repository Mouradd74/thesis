-- Migration: BKT and IRT Features

-- 1. Knowledge States table for BKT
CREATE TABLE IF NOT EXISTS knowledge_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    concept TEXT NOT NULL, -- usually the lesson_title
    p_mastery FLOAT NOT NULL DEFAULT 0.1, -- initial prior P(L0)
    attempts_count INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, subject_id, concept)
);

-- 2. Student Ability table for IRT
CREATE TABLE IF NOT EXISTS student_abilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    ability_theta FLOAT NOT NULL DEFAULT 0.0, -- average initial ability
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, subject_id)
);

-- Note: for quizzes.questions, since it's a JSONB array, we don't strictly need a schema migration 
-- to add the 'difficulty' field. We will just start including `difficulty: number` in the JSON objects.
