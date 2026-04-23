'use server'

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

export async function generateProgressReport(studentId: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })

  const supabase = await createClient()

  // Fetch all necessary data
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', studentId).single()
  const { data: enrollments } = await supabase.from('enrollments').select('*, subjects(title)').eq('student_id', studentId)
  const { data: styleProfiles } = await supabase.from('learning_style_profiles').select('*, subjects(title)').eq('student_id', studentId)
  const { data: knowledgeStates } = await supabase.from('knowledge_states').select('*, subjects(title)').eq('student_id', studentId)
  const { data: abilities } = await supabase.from('student_abilities').select('*, subjects(title)').eq('student_id', studentId)
  const { data: quizAttempts } = await supabase.from('quiz_attempts').select('score, quizzes(subject_id, lesson_title)').eq('student_id', studentId)
  const { data: interactions } = await supabase.from('student_interactions').select('content_type, event_type').eq('student_id', studentId)

  if (!profile) return { error: 'Student not found' }

  // Restructure data for the LLM prompt
  const dataSummary = {
    studentName: profile.full_name || 'Student',
    enrollments: enrollments?.map(e => e.subjects?.title) || [],
    learningStyles: styleProfiles?.map(s => ({
      subject: s.subjects?.title,
      style: s.predicted_style,
      confidence: s.confidence
    })) || [],
    masteryLevels: knowledgeStates?.map(k => ({
      subject: k.subjects?.title,
      concept: k.concept,
      masteryPct: Math.round(k.p_mastery * 100)
    })) || [],
    cognitiveAbilities: abilities?.map(a => ({
      subject: a.subjects?.title,
      thetaScore: a.ability_theta.toFixed(2)
    })) || [],
    quizPerformance: quizAttempts?.map(q => ({
      lesson: (q.quizzes as any)?.lesson_title,
      score: q.score
    })) || [],
    interactionCounts: {
      video: interactions?.filter(i => i.content_type === 'video').length || 0,
      audio: interactions?.filter(i => i.content_type === 'audio').length || 0,
      text: interactions?.filter(i => i.content_type === 'text').length || 0,
      hintsUsed: interactions?.filter(i => i.event_type === 'hint_used').length || 0,
    }
  }

  const prompt = `You are an expert computational educational analyst. Generate a professional student progress report based on the following ML-driven telemetry data.

Student Data Context (JSON):
${JSON.stringify(dataSummary, null, 2)}

Structure the report using Markdown with the following sections EXACTLY:
1. **Executive Summary**: 2-3 sentences summarizing overall standing.
2. **Academic Performance**: High-level trends inferred from quiz scores and IRT cognitive abilities (theta).
3. **Learning Profile**: Synthesize their dominant learning style and content engagement preferences (video/audio/text).
4. **Mastery Strengths**: Identify concepts where mastery is high (>80%).
5. **Areas for Improvement**: Highlight concepts where mastery is low (<50%) or scores are dragging.
6. **Teacher Recommendations**: 3 actionable, specific steps the teacher can take to support this student based on their data.

Keep the tone objective, encouraging, and data-informed. Do not invent data outside the JSON context.`

  try {
    const res = await openai.chat.completions.create({
      model: 'openrouter/auto',
      messages: [{ role: 'user', content: prompt }]
    })

    const reportMarkdown = res.choices[0]?.message?.content
    if (!reportMarkdown) return { error: 'Failed to generate content' }

    return { report: reportMarkdown }
  } catch (err: any) {
    console.error('LLM Report Error:', err)
    return { error: err.message || 'Error communicating with AI service' }
  }
}
