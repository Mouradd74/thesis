'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { YoutubeTranscript } from 'youtube-transcript'
// @ts-ignore
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import * as crypto from 'crypto'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
  hints: string[] // Array of 2 hints
}

// ---------------- HELPERS ----------------

function extractVideoId(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.searchParams.get('v')) return parsed.searchParams.get('v')
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1)
    if (parsed.pathname.includes('/shorts/')) return parsed.pathname.split('/shorts/')[1]
    if (parsed.pathname.includes('/embed/')) return parsed.pathname.split('/embed/')[1]
    return null
  } catch {
    return null
  }
}

function safeJsonParse(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    try {
      // Improved regex to extract JSON array or object
      const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/g)
      if (match) {
        return JSON.parse(match[0])
      }
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(cleaned)
    } catch {
      return null
    }
  }
}

function chunkText(text: string, size = 3000) {
  const chunks = []
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size))
  return chunks
}

async function generateQuiz(studyGuide: string): Promise<QuizQuestion[] | null> {
  if (!process.env.OPENROUTER_API_KEY) return null

  const prompt = `Based on the following educational content, generate a multiple-choice quiz with exactly 7 questions.
Return ONLY a valid JSON array of objects. Each object must have:
- "question": the question text
- "options": an array of exactly 4 strings
- "answer": the correct option (must be identical to one of the choices in the options array)
- "hints": an array of exactly 2 strings. 
  * Hint 1 should be vague, conceptual, and emotionally supportive/encouraging (e.g., "Don't worry, you've got this! Remember how we talked about..."). 
  * Hint 2 should be more specific and helpful but still encouraging.

Example format:
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "answer": "Paris",
    "hints": ["Take a deep breath! Think about the city known for the Eiffel Tower...", "You're doing great! It starts with a 'P' and is a major center for art and fashion."]
  }
]

Content:
${studyGuide.slice(0, 6000)}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }]
      })
      const text = res.choices[0].message.content
      if (!text) {
        console.warn(`[QuizGen] Attempt ${attempt + 1}: Empty response from LLM`)
        continue
      }

      console.log(`[QuizGen] Attempt ${attempt + 1} raw response:`, text)
      const parsed = safeJsonParse(text)
      if (!Array.isArray(parsed)) {
        console.warn(`[QuizGen] Attempt ${attempt + 1}: Parse failed or not an array`)
        continue
      }

      const validQuestions = parsed.filter(q => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        q.answer && 
        q.options.includes(q.answer) &&
        Array.isArray(q.hints) &&
        q.hints.length === 2
      )

      console.log(`[QuizGen] Attempt ${attempt + 1}: Found ${validQuestions.length} valid questions out of ${parsed.length}`)

      if (validQuestions.length >= 2) {
        return validQuestions as QuizQuestion[]
      }
    } catch (e) {
      console.error(`[QuizGen] Attempt ${attempt + 1} Error:`, e)
    }
  }

  return null
}

// ---------------- ACTIONS ----------------

export async function createSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('subjects').insert({
    teacher_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
  })

  revalidatePath('/teacher/content')
}

export async function createContent(formData: FormData) {
  const supabase = await createClient()
  const subjectId = formData.get('subject_id') as string

  await supabase.from('content').insert({
    subject_id: subjectId,
    title: formData.get('title') as string,
    type: formData.get('type') as string,
    url: (formData.get('url') as string) || null,
  })

  revalidatePath('/teacher/content')
  if (subjectId) revalidatePath(`/student/subjects/${subjectId}`)
}

export async function ingestYouTubeVideo(formData: FormData) {
  const supabase = await createClient()
  const subjectId = formData.get('subject_id') as string
  const url = formData.get('url') as string
  const title = formData.get('title') as string
  if (!subjectId || !url || !title) throw new Error('Missing fields')

  const videoId = extractVideoId(url)
  if (!videoId) throw new Error('Invalid YouTube URL')

  // -------- Transcript --------
  let transcriptText = ''
  let hasTranscript = false
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    transcriptText = transcript.map(t => t.text).join(' ')
    hasTranscript = true
  } catch (err) {
    console.error('Transcript fetch failed:', err)
    transcriptText = 'Transcript unavailable for this video.'
  }

  // Save video record
  await supabase.from('content').insert({ subject_id: subjectId, title, type: 'video', url })

  let studyGuide = transcriptText
  let audioUrl: string | null = null
  const apiEnabled = !!process.env.OPENROUTER_API_KEY

  // -------- AI Processing --------
  if (apiEnabled && hasTranscript && transcriptText.trim().length > 0) {
    // Study Guide
    try {
      const chunks = chunkText(transcriptText)
      const summaries: string[] = []

      for (const chunk of chunks) {
        const res = await openai.chat.completions.create({
          model: 'openrouter/auto',
          messages: [
            { 
              role: 'user', 
              content: `You are an expert Educational Content Architect. Your goal is to transform the following raw transcript into a high-quality, professional Study Guide.
              
              ### STRICT REQUIREMENTS:
              1. **Persona**: Professional, authoritative, and clear. Avoid all conversational filler (e.g., "In this video...", "We will learn...").
              2. **Structure**: Use Markdown headers (###) for major sections. Use bolding (**concept**) for key terms.
              3. **Formatting**: Use clean bullet points for steps or lists. Use LaTeX-style notation ($x = 2$) for all mathematical expressions.
              4. **Content**: Focus only on the core educational facts, definitions, and procedures. If the transcript contains multiple languages, translate everything to clear, academic English.
              5. **Zero Fluff**: Do not include introductory remarks, concluding summaries, or hashtags. The output must be ready for immediate display on a premium educational dashboard.
              
              RAW TRANSCRIPT CHUNK:
              ${chunk}`
            }
          ]
        })
        const content = res.choices[0].message.content
        if (content) summaries.push(content)
      }
      if (summaries.length > 0) {
        studyGuide = summaries.join('\n\n')
      }
    } catch (e) {
      console.warn('Study guide generation failed, remains raw transcript.')
    }

    // -------- Simple TTS (No Fluff) --------
    try {
      console.log(`[TTS] Generating audio from study guide (${studyGuide.length} chars)`)
      const tts = new MsEdgeTTS()
      await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

      const { audioStream } = tts.toStream(studyGuide.slice(0, 4000)) // Limit to 4k chars for safety
      const chunks: Buffer[] = []
      await new Promise((res, rej) => {
        const timeout = setTimeout(() => rej(new Error('TTS Timeout')), 30000)
        audioStream.on('data', d => chunks.push(Buffer.from(d)))
        audioStream.on('close', () => {
          clearTimeout(timeout)
          res(null)
        })
        audioStream.on('error', (err) => {
          clearTimeout(timeout)
          rej(err)
        })
      })

      const finalAudio = Buffer.concat(chunks)
      console.log(`[TTS] Generated audio: ${finalAudio.length} bytes`)

      const fileName = `${crypto.randomUUID()}.mp3`
      const { error } = await supabase.storage.from('audio').upload(fileName, finalAudio, {
        contentType: 'audio/mpeg'
      })

      if (!error) {
        const { data } = supabase.storage.from('audio').getPublicUrl(fileName)
        audioUrl = data.publicUrl

        // Force absolute URL if relative
        if (audioUrl.startsWith('/')) {
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
          audioUrl = `${baseUrl}/storage/v1/object/public/audio/${fileName}`
        }
        console.log(`[Storage] Audio uploaded: ${audioUrl}`)
      } else {
        console.error('[Storage] Upload Error:', error.message)
      }
    } catch (e) {
      console.warn('TTS generation failed, skipping audio:', e)
    }
  }

  // Ensure studyGuide is not empty for UI
  const finalBody = studyGuide?.trim() || 'No text could be extracted or summarized for this lesson. Please ensure the video has subtitles/captions enabled.'

  // Save study guide
  await supabase.from('content').insert({ subject_id: subjectId, title, type: 'text', body: finalBody })

  // Save audio if exists
  if (audioUrl) {
    await supabase.from('content').insert({ subject_id: subjectId, title, type: 'audio', url: audioUrl })
  }

  // -------- Quiz Generation --------
  console.log(`[QuizGen] Starting for lesson: ${title}`)
  const questionsList = await generateQuiz(studyGuide)
  if (questionsList) {
    const { error: quizError } = await supabase.from('quizzes').insert({
      subject_id: subjectId,
      lesson_title: title,
      questions: questionsList
    })
    if (quizError) console.error('[QuizGen] DB Insert Error:', quizError.message)
    else console.log('[QuizGen] Successfully saved quiz to DB')
  } else {
    console.warn('[QuizGen] Failed to generate valid questions after all attempts')
  }

  revalidatePath('/teacher/content')
  revalidatePath(`/student/subjects/${subjectId}`)
}

export async function submitQuizAttempt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const quizId = formData.get('quiz_id') as string
  const answers = JSON.parse(formData.get('answers') as string)
  const hintsUsed = JSON.parse(formData.get('hints_used') as string) || {}
  const score = parseInt(formData.get('score') as string)

  const { error } = await supabase.from('quiz_attempts').insert({
    student_id: user.id,
    quiz_id: quizId,
    answers,
    hints_used: hintsUsed,
    score
  })

  if (error) throw error

  return { success: true }
}

export async function submitExamAttempt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const examId = formData.get('exam_id') as string
  const answers = JSON.parse(formData.get('answers') as string)
  const score = parseInt(formData.get('score') as string)

  const { error } = await supabase.from('exam_attempts').insert({
    student_id: user.id,
    exam_id: examId,
    answers,
    score
  })

  if (error) throw error

  revalidatePath('/student/subjects')

  return { success: true }
}

export async function createExam(subjectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check if exam already exists
  const { data: existingExam } = await supabase.from('exams').select('id').eq('student_id', user.id).eq('subject_id', subjectId).maybeSingle()
  if (existingExam) return existingExam.id

  // Fetch all quiz attempts for this subject
  const { data: attempts, error: fetchError } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes!inner(id, subject_id, questions)')
    .eq('student_id', user.id)
    .eq('quizzes.subject_id', subjectId)
  
  if (fetchError) throw fetchError
  if (!attempts || attempts.length < 3) return null

  const wrongPool: any[] = []
  const hintPool: any[] = [] // Correct but used both hints
  const paddingPool: any[] = []

  attempts.forEach(attempt => {
    const questions = (attempt.quizzes as any).questions
    const answers = attempt.answers
    const hintsUsed = (attempt as any).hints_used || {}
    
    questions.forEach((q: any, idx: number) => {
      if (answers[idx] !== q.answer) {
        wrongPool.push(q)
      } else if (hintsUsed[idx] === 2) {
        hintPool.push(q)
      } else {
        paddingPool.push(q)
      }
    })
  })

  // Deduplicate by question text
  const uniqueWrong = Array.from(new Map(wrongPool.map(q => [q.question, q])).values())
  const uniqueHinted = Array.from(new Map(hintPool.map(q => [q.question, q])).values())
    .filter(hq => !uniqueWrong.some(wq => wq.question === hq.question))
  const uniquePadding = Array.from(new Map(paddingPool.map(q => [q.question, q])).values())
    .filter(pq => !uniqueWrong.some(wq => wq.question === pq.question) && !uniqueHinted.some(hq => hq.question === pq.question))

  let examQuestions = [...uniqueWrong, ...uniqueHinted]
  
  if (examQuestions.length < 8) {
    const remaining = 8 - examQuestions.length
    examQuestions = [...examQuestions, ...uniquePadding.slice(0, remaining)]
  }

  // Shuffle and slice to exactly 8
  const finalQuestions = examQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, 8)

  if (finalQuestions.length < 1) return null

  const { data: newExam, error: insertError } = await supabase.from('exams').insert({
    student_id: user.id,
    subject_id: subjectId,
    questions: finalQuestions
  }).select().single()

  if (insertError) throw insertError
  return newExam.id
}