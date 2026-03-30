export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'undetermined'

export interface EventLikelihoods {
  visual: number
  auditory: number
  reading: number
}

export type EventType = 
  | 'content_open_video'
  | 'content_open_audio'
  | 'content_open_text'
  | 'hint_used_level_1'
  | 'hint_used_level_2'
  | 'quiz_score_high_video'
  | 'quiz_score_high_text'
  | 'quiz_score_high_audio'
  | 'content_reopen'

// Likelihoods: P(Event | Style)
export const LIKELIHOODS: Record<EventType, EventLikelihoods> = {
  content_open_video: { visual: 0.70, auditory: 0.20, reading: 0.10 },
  content_open_audio: { visual: 0.10, auditory: 0.75, reading: 0.15 },
  content_open_text: { visual: 0.10, auditory: 0.10, reading: 0.80 },
  hint_used_level_1: { visual: 0.35, auditory: 0.35, reading: 0.30 },
  hint_used_level_2: { visual: 0.15, auditory: 0.15, reading: 0.70 },
  quiz_score_high_video: { visual: 0.65, auditory: 0.25, reading: 0.10 },
  quiz_score_high_text: { visual: 0.10, auditory: 0.10, reading: 0.80 },
  quiz_score_high_audio: { visual: 0.15, auditory: 0.70, reading: 0.15 },
  content_reopen: { visual: 0.33, auditory: 0.33, reading: 0.34 },
}

export interface BayesianProfile {
  visualProb: number
  auditoryProb: number
  readingProb: number
}

// Bayes' Theorem: P(Style | Event) ∝ P(Event | Style) * P(Style)
export function updateBayesianProfile(
  current: BayesianProfile,
  event: EventType
): BayesianProfile {
  const likelihood = LIKELIHOODS[event]
  if (!likelihood) return current // Ignore unknown events

  // 1. Calculate unnormalized posteriors: Posterior ∝ Likelihood * Prior
  const unnormVisual = likelihood.visual * current.visualProb
  const unnormAuditory = likelihood.auditory * current.auditoryProb
  const unnormReading = likelihood.reading * current.readingProb

  // 2. Normalize so they sum to 1
  const sum = unnormVisual + unnormAuditory + unnormReading
  if (sum === 0) return current

  return {
    visualProb: unnormVisual / sum,
    auditoryProb: unnormAuditory / sum,
    readingProb: unnormReading / sum,
  }
}

export function determineStyleAndConfidence(profile: BayesianProfile): {
  predictedStyle: LearningStyle
  confidence: number
} {
  const { visualProb, auditoryProb, readingProb } = profile
  
  // Find highest prob
  let maxProb = visualProb
  let predictedStyle: LearningStyle = 'visual'
  
  if (auditoryProb > maxProb) {
    maxProb = auditoryProb
    predictedStyle = 'auditory'
  }
  if (readingProb > maxProb) {
    maxProb = readingProb
    predictedStyle = 'reading'
  }

  // If the max probability isn't significantly higher than equal chance (0.33), 
  // or if it's too close to the runner-up, we might call it undetermined.
  // For simplicity, let's just use it directly, but map 0.33 -> 0% conf, 1.0 -> 100% conf
  let confidence = Math.max(0, (maxProb - 0.333) / (1 - 0.333) * 100)
  
  // If confidence is very low, mark as undetermined
  if (confidence < 15) {
    predictedStyle = 'undetermined'
  }

  return {
    predictedStyle,
    confidence: Math.round(confidence)
  }
}
