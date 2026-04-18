-- Migration: Computerized Adaptive Testing (CAT) Extensions
-- Adds CAT-specific columns to the exams table for adaptive session tracking.

-- Item bank stores all candidate questions for the adaptive algorithm to select from
ALTER TABLE exams ADD COLUMN IF NOT EXISTS item_bank JSONB DEFAULT '[]';

-- The student's ability estimate at the start of the CAT session
ALTER TABLE exams ADD COLUMN IF NOT EXISTS initial_theta FLOAT DEFAULT 0.0;

-- Flag to distinguish adaptive exams from legacy static exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT false;

-- Full response history: array of { bank_index, answer, correct, theta_after, se_after }
ALTER TABLE exams ADD COLUMN IF NOT EXISTS cat_responses JSONB DEFAULT '[]';

-- Final calibrated ability estimate after convergence
ALTER TABLE exams ADD COLUMN IF NOT EXISTS final_theta FLOAT;

-- Standard error at the point of convergence
ALTER TABLE exams ADD COLUMN IF NOT EXISTS standard_error FLOAT;

-- Timestamp when the CAT session was completed
ALTER TABLE exams ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
