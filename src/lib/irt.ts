/**
 * Returns the probability of a correct response using the 1PL (Rasch) model.
 * @param theta Student ability level
 * @param b Question difficulty
 * @returns Probability between 0 and 1
 */
export function calculateProbability(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/**
 * Updates a student's ability estimate (theta) based on a new response,
 * using a simple proportionate update mechanism (similar to EAP or basic gradient update).
 * 
 * @param currentTheta Current ability estimate
 * @param b Difficulty of the question answered
 * @param isCorrect Whether the answer was correct (true) or incorrect (false)
 * @param learningRate How much the ability can change in one step
 * @returns New ability estimate
 */
export function updateAbility(
  currentTheta: number,
  b: number,
  isCorrect: boolean,
  learningRate: number = 0.3
): number {
  const pCorrect = calculateProbability(currentTheta, b);
  const actualResponse = isCorrect ? 1.0 : 0.0;
  
  // Residual (error): if they got it right but probability was low, large positive update.
  const residual = actualResponse - pCorrect;
  
  return currentTheta + learningRate * residual;
}

export interface IRTQuestion {
  questionText: string;
  difficulty: number;
}

/**
 * Selects the optimal next questions from a pool based on Maximum Information.
 * In a Rasch model, maximum information occurs when question difficulty (b) matches student ability (theta).
 * 
 * @param theta The student's current ability level
 * @param pool Array of available questions
 * @param count Number of questions to return
 * @returns Optimized subset of questions
 */
export function selectOptimalQuestions<T extends IRTQuestion>(
  theta: number,
  pool: T[],
  count: number
): T[] {
  // Sort questions by their distance from student's ability
  // The closer |b - theta| is to 0, the more informative the question is.
  const sorted = [...pool].sort((q1, q2) => {
    const diff1 = Math.abs(q1.difficulty - theta);
    const diff2 = Math.abs(q2.difficulty - theta);
    return diff1 - diff2;
  });

  return sorted.slice(0, count);
}

// ============================================================
// Computerized Adaptive Testing (CAT) Extensions
// ============================================================

/**
 * Fisher Information for a single item at a given theta.
 * I(θ) = P(θ) * Q(θ) where P = prob correct, Q = 1 - P
 * Maximum information occurs when P(θ) = 0.5, i.e., when θ = b.
 */
export function fisherInformation(theta: number, b: number): number {
  const p = calculateProbability(theta, b);
  return p * (1 - p);
}

/**
 * Calculates the Standard Error of the ability estimate.
 * SE(θ) = 1 / sqrt(Σ I(θ, b_i)) for all answered questions.
 * Lower SE = more precise estimate = exam can stop.
 */
export function calculateStandardError(
  theta: number,
  answeredDifficulties: number[]
): number {
  if (answeredDifficulties.length === 0) return Infinity;

  const totalInformation = answeredDifficulties.reduce(
    (sum, b) => sum + fisherInformation(theta, b),
    0
  );

  if (totalInformation <= 0) return Infinity;
  return 1 / Math.sqrt(totalInformation);
}

export interface CATQuestion {
  question: string;
  options: string[];
  answer: string;
  hints?: string[];
  difficulty: number;
  bank_index: number; // Position in the item bank for tracking
}

export interface CATResponse {
  bank_index: number;
  answer: string;
  correct: boolean;
  theta_after: number;
  se_after: number;
}

/**
 * Selects the single best next question for a CAT session.
 * Picks the unanswered question that maximizes Fisher Information at the current θ.
 */
export function selectNextCATQuestion(
  theta: number,
  itemBank: CATQuestion[],
  answeredIndices: Set<number>
): CATQuestion | null {
  const remaining = itemBank.filter(q => !answeredIndices.has(q.bank_index));
  if (remaining.length === 0) return null;

  // Sort by Fisher Information descending (most informative first)
  remaining.sort((a, b) => {
    const infoA = fisherInformation(theta, a.difficulty);
    const infoB = fisherInformation(theta, b.difficulty);
    return infoB - infoA;
  });

  return remaining[0];
}

/** CAT convergence threshold — exam stops when SE drops below this */
export const CAT_SE_THRESHOLD = 0.3;

/** Maximum number of questions in a CAT session */
export const CAT_MAX_QUESTIONS = 15;

/** Minimum number of questions before allowing convergence */
export const CAT_MIN_QUESTIONS = 5;

/**
 * Maps a theta value to a human-readable ability label.
 */
export function getAbilityLabel(theta: number): { label: string; color: string } {
  if (theta >= 2.0) return { label: 'Expert', color: 'emerald' };
  if (theta >= 1.0) return { label: 'Advanced', color: 'blue' };
  if (theta >= 0.0) return { label: 'Proficient', color: 'cyan' };
  if (theta >= -1.0) return { label: 'Developing', color: 'amber' };
  return { label: 'Novice', color: 'red' };
}
