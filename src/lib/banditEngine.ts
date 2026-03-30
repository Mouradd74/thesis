export type ContentType = 'video' | 'audio' | 'text'

export interface BanditArm {
  content_type: ContentType
  trials: number
  wins: number
}

// ε-Greedy Bandit Engine
export function selectBanditArm(arms: BanditArm[], epsilon: number = 0.2): ContentType {
  // If we don't have all 3 arms yet, or no trials, explore randomly or return a default
  const defaultTypes: ContentType[] = ['video', 'audio', 'text']
  
  // Explore: with probability epsilon, pick a random content type
  if (Math.random() < epsilon) {
    return defaultTypes[Math.floor(Math.random() * defaultTypes.length)]
  }

  // Exploit: pick the arm with the highest win rate (wins / trials)
  let bestArm: ContentType = 'video'
  let bestWinRate = -1

  for (const type of defaultTypes) {
    const arm = arms.find(a => a.content_type === type)
    const trials = arm?.trials || 0
    const wins = arm?.wins || 0
    
    // Smooth the win rate slightly to handle 0 trials symmetrically (e.g. Laplace smoothing or simple optimism)
    // If 0 trials, we assume a slightly optimistic win rate so it gets tried.
    const winRate = trials === 0 ? 0.5 : wins / trials

    if (winRate > bestWinRate) {
      bestWinRate = winRate
      bestArm = type
    }
  }

  return bestArm
}
