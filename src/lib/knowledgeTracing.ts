export interface BKTParams {
  p_slip: number;    // Probability of making a mistake even if they know it (P(S))
  p_guess: number;   // Probability of guessing correctly without knowing it (P(G))
  p_transit: number; // Probability of learning the concept after an attempt (P(T))
}

const DEFAULT_PARAMS: BKTParams = {
  p_slip: 0.1,
  p_guess: 0.2,
  p_transit: 0.1,
};

/**
 * Updates the probability that a student knows a concept based on a new observation.
 * 
 * @param prior The previous probability the student knew the concept (P(L_{n-1}))
 * @param isCorrect Whether the student answered correctly or not
 * @param params BKT model parameters
 * @returns The posterior probability the student now knows the concept (P(L_n))
 */
export function updateMastery(
  prior: number,
  isCorrect: boolean,
  params: BKTParams = DEFAULT_PARAMS
): number {
  const { p_slip, p_guess, p_transit } = params;

  let posterior: number;

  if (isCorrect) {
    // P(knows | correct) = (P(knows) * (1 - P(slip))) / P(correct)
    // where P(correct) = P(knows) * (1 - P(slip)) + (1 - P(knows)) * P(guess)
    const probCorrect = prior * (1 - p_slip) + (1 - prior) * p_guess;
    posterior = (prior * (1 - p_slip)) / probCorrect;
  } else {
    // P(knows | incorrect) = (P(knows) * P(slip)) / P(incorrect)
    // where P(incorrect) = P(knows) * P(slip) + (1 - P(knows)) * (1 - P(guess))
    const probIncorrect = prior * p_slip + (1 - prior) * (1 - p_guess);
    posterior = (prior * p_slip) / probIncorrect;
  }

  // Account for learning transfer (transit)
  // P(L_n) = P(knows | obs) + (1 - P(knows | obs)) * P(transit)
  const newMastery = posterior + (1 - posterior) * p_transit;

  return Math.min(Math.max(newMastery, 0.0), 1.0); // Clamp between 0 and 1
}
