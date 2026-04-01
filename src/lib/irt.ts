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
