/**
 * ML Microservice Client
 *
 * Calls the Python FastAPI prediction endpoints from Next.js server actions.
 */

const RAW_URL = process.env.ML_API_URL || 'http://localhost:8000'
const ML_API_URL = RAW_URL.replace(/\/+$/, '')

interface MasteryPrediction {
  mastery_probabilities: Record<string, number>
  overall_mastery: number
  num_interactions: number
  model: string
}

interface StylePrediction {
  predicted_style: string
  confidence: number
}

interface ClusterResponse {
  clusters: {
    id: number
    label: string
    color: string
    students: string[]
    count: number
  }[]
}

interface HealthStatus {
  status: string
  dkt_loaded: boolean
  clustering_loaded: boolean
  style_loaded: boolean
}

/**
 * Predict concept mastery using the DKT LSTM model.
 */
export async function predictMastery(
  interactions: { skill_id: number; correct: boolean }[]
): Promise<MasteryPrediction | null> {
  try {
    const res = await fetch(`${ML_API_URL}/predict/mastery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_interactions: interactions }),
      signal: AbortSignal.timeout(20000), // 5s timeout
    })

    if (!res.ok) {
      console.warn('[ML Client] Mastery prediction failed:', res.status)
      return null
    }

    return await res.json()
  } catch (err) {
    console.warn('[ML Client] Mastery prediction unavailable:', err)
    return null
  }
}

/**
 * Predict learning style using the trained Random Forest model.
 */
export async function predictLearningStyle(
  studentId: string,
  interactions: any[]
): Promise<StylePrediction | null> {
  try {
    const res = await fetch(`${ML_API_URL}/predict/learning-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, interactions }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      console.warn('[ML Client] Style prediction failed:', res.status)
      return null
    }

    return await res.json()
  } catch (err) {
    console.warn('[ML Client] Style prediction unavailable:', err)
    return null
  }
}

/**
 * Cluster students using the K-Means pipeline.
 */
export async function clusterStudents(
  studentsFeatures: any[]
): Promise<ClusterResponse | null> {
  try {
    const res = await fetch(`${ML_API_URL}/cluster/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students_features: studentsFeatures }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      console.warn('[ML Client] Clustering failed:', res.status)
      return null
    }

    return await res.json()
  } catch (err) {
    console.warn('[ML Client] Clustering unavailable:', err)
    return null
  }
}

/**
 * Check ML service health.
 */
export async function checkMLHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${ML_API_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
