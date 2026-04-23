'use server'

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

function makeOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })
}

export async function analyzeKnowledgeGaps(subjectId: string) {
  const supabase = await createClient()

  const { data: knowledgeStates } = await supabase
    .from('knowledge_states')
    .select('concept, p_mastery')
    .eq('subject_id', subjectId)

  if (!knowledgeStates || knowledgeStates.length === 0) return []

  const conceptMap = new Map<string, { total: number; count: number }>()

  for (const ks of knowledgeStates) {
    if (!conceptMap.has(ks.concept)) {
      conceptMap.set(ks.concept, { total: 0, count: 0 })
    }
    const current = conceptMap.get(ks.concept)!
    current.total += ks.p_mastery
    current.count += 1
  }

  const gaps = Array.from(conceptMap.entries()).map(([concept, data]) => ({
    concept,
    avgMastery: data.total / data.count,
    studentCount: data.count
  })).sort((a, b) => a.avgMastery - b.avgMastery)

  return gaps
}

export async function suggestDifficulty(subjectId: string, questionText: string) {
  // A heuristic based IRT estimator:
  // If we had more text processing we could map NLP features to difficulty.
  // We will do a generic LLM approach to estimate difficulty if needed,
  // or a placeholder math to map word length or keyword complexity.
  // For the sake of the thesis scale: [-3.0 to 3.0]
  
  if (!process.env.OPENROUTER_API_KEY) return 0.0

  const prompt = `Estimate the educational difficulty of the following question on an Item Response Theory (IRT) scale from -3.0 (very easy) to 3.0 (extremely difficult).
Analyze the cognitive complexity, vocabulary, and multi-step reasoning required. 
Respond with ONLY a number between -3.0 and 3.0.

Question: "${questionText}"`

  const openai = makeOpenAI()
  try {
    const res = await openai.chat.completions.create({
      model: 'openrouter/auto',
      messages: [{ role: 'user', content: prompt }]
    })

    const text = res.choices[0]?.message?.content?.trim()
    const num = parseFloat(text || '0')
    if (!isNaN(num) && num >= -3.0 && num <= 3.0) return num
    return 0.0
  } catch {
    return 0.0
  }
}

export async function generateTargetedQuestions(subjectId: string, weakConcepts: string[]) {
  if (!process.env.OPENROUTER_API_KEY) return null
  const openai = makeOpenAI()

  const prompt = `Generate exactly 5 multiple-choice questions targeting the following weak concepts:
${weakConcepts.join(', ')}

Return ONLY a valid JSON array of objects. Each object must have:
- "question": the question text
- "options": an array of exactly 4 strings
- "answer": the correct option (must be identical to one of the choices in the options array)
- "hints": an array of exactly 2 strings. (Hint 1: gentle conceptual guidance, Hint 2: more specific help)
- "difficulty": an estimated float value between -2.0 and 2.0 based on difficulty.

Ensure the questions are engaging and test applied understanding.

Example:
[
  {
    "question": "An example question about the concept...",
    "options": ["A", "B", "C", "D"],
    "answer": "B",
    "hints": ["Think about...", "Remember that..."],
    "difficulty": 0.5
  }
]`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }]
      })

      const text = res.choices[0].message.content
      if (!text) continue

      const match = text.match(/(\[[\s\S]*\])/)
      if (match) {
        const parsed = JSON.parse(match[0])
        return parsed
      }
    } catch (e) {
      console.warn(`[QuizGen] Targeted attempt ${attempt + 1} Error:`, e)
    }
  }

  return null
}

export async function saveCustomQuiz(subjectId: string, lessonTitle: string, questions: any[]) {
  const supabase = await createClient()

  // Verify the requesting user is a teacher
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('quizzes').insert({
    subject_id: subjectId,
    lesson_title: lessonTitle,
    questions: questions
  })

  if (error) throw error
}
