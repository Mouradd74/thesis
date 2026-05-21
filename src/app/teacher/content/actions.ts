'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { YoutubeTranscript } from 'youtube-transcript'
// @ts-ignore
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import * as crypto from 'crypto'
import OpenAI from 'openai'
import { updateMastery } from '@/lib/knowledgeTracing'
import { updateAbility, selectOptimalQuestions, calculateStandardError, selectNextCATQuestion, CAT_SE_THRESHOLD, CAT_MAX_QUESTIONS, CAT_MIN_QUESTIONS, CATQuestion, CATResponse } from '@/lib/irt'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'placeholder',
  baseURL: 'https://openrouter.ai/api/v1',
})

// Remove the makeOpenAI wrapper — openai is used directly

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
        // Assign default difficulty 0 for IRT
        return validQuestions.map(q => ({ ...q, difficulty: 0.0 })) as QuizQuestion[];
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
  if (subjectId) revalidatePath(`/teacher/content/${subjectId}`)
}

export async function updateSubject(formData: FormData) {
  const supabase = await createClient()
  const subjectId = formData.get('subject_id') as string

  await supabase.from('subjects').update({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
  }).eq('id', subjectId)

  revalidatePath('/teacher/content')
  revalidatePath(`/teacher/content/${subjectId}`)
  revalidatePath(`/student/subjects/${subjectId}`)
}

export async function deleteSubject(formData: FormData) {
  const supabase = await createClient()
  const subjectId = formData.get('subject_id') as string

  await supabase.from('subjects').delete().eq('id', subjectId)

  revalidatePath('/teacher/content')
  redirect('/teacher/content')
}

export async function updateContent(formData: FormData) {
  const supabase = await createClient()
  const contentId = formData.get('content_id') as string
  const subjectId = formData.get('subject_id') as string

  await supabase.from('content').update({
    title: formData.get('title') as string,
    url: (formData.get('url') as string) || null,
    body: (formData.get('body') as string) || null,
  }).eq('id', contentId)

  revalidatePath(`/teacher/content/${subjectId}`)
  revalidatePath(`/student/subjects/${subjectId}`)
}

export async function deleteContent(formData: FormData) {
  const supabase = await createClient()
  const contentId = formData.get('content_id') as string
  const subjectId = formData.get('subject_id') as string

  await supabase.from('content').delete().eq('id', contentId)

  revalidatePath(`/teacher/content/${subjectId}`)
  revalidatePath(`/student/subjects/${subjectId}`)
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

  // Create an uncached fetch to bypass Next.js's default fetch caching.
  // Next.js patches globalThis.fetch with { cache: 'force-cache' } which causes
  // YouTube API responses (especially caption track URLs with expiry params) to
  // go stale, resulting in "transcript not available" errors on repeat calls.
  const uncachedFetch: typeof globalThis.fetch = (input, init) =>
    globalThis.fetch(input, { ...init, cache: 'no-store' })

  // Attempt 1: Use youtube-transcript library with uncached fetch
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { fetch: uncachedFetch })
    transcriptText = transcript.map(t => t.text).join(' ')
    if (transcriptText.trim().length > 0) {
      hasTranscript = true
      console.log(`[Transcript] Library success: ${transcriptText.length} chars`)
    } else {
      console.warn('[Transcript] Library returned empty transcript, trying edge fallback...')
    }
  } catch (err: any) {
    console.error('[Transcript] Library failed:', err?.message || err)
  }

  // Attempt 2: Edge Function route (runs on Cloudflare's edge network, not AWS)
  // YouTube blocks AWS Lambda IPs but is less aggressive with Cloudflare edge IPs
  if (!hasTranscript) {
    try {
      console.log('[Transcript] Attempting Edge Function fallback...')
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

      const edgeRes = await uncachedFetch(`${baseUrl}/api/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      })

      if (edgeRes.ok) {
        const data = await edgeRes.json()
        if (data.success && data.text?.trim()) {
          transcriptText = data.text
          hasTranscript = true
          console.log(`[Transcript] Edge Function success (${data.method}): ${transcriptText.length} chars`)
        } else {
          console.warn('[Transcript] Edge Function returned no transcript:', data.error)
        }
      } else {
        console.warn('[Transcript] Edge Function HTTP error:', edgeRes.status)
      }
    } catch (edgeErr: any) {
      console.error('[Transcript] Edge Function fallback failed:', edgeErr?.message || edgeErr)
    }
  }

  if (!hasTranscript) {
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

    // -------- Neural TTS Script Generation --------
    let audioScript = studyGuide
    try {
      const scriptRes = await openai.chat.completions.create({
        model: 'openrouter/auto',
        messages: [
          {
            role: 'user',
            content: `You are an engaging, energetic educational podcast host. Take the following study guide and rewrite it into a short, conversational, and highly engaging script meant to be read ALOUD. 
            
            STRICT REQUIREMENTS:
            1. DO NOT use any markdown, bullet points, asterisks, hashtags, or symbols. 
            2. Spell out acronyms and numbers clearly.
            3. Use transitional phrases (e.g., "Now, let's talk about...", "The really fascinating part is...").
            4. Keep it relatively short (under 400 words) but cover the core concepts.
            5. Start directly with the script, no intros or outtros acknowledging the prompt.
            
            STUDY GUIDE:
            ${studyGuide.slice(0, 5000)}`
          }
        ]
      })
      if (scriptRes.choices[0].message.content) {
        audioScript = scriptRes.choices[0].message.content
      }
    } catch (e) {
      console.warn('Audio script generation failed, falling back to stripping markdown manually.')
      audioScript = audioScript.replace(/[#*`_\[\]]/g, '').replace(/-/g, ' ')
    }

    // -------- Simple TTS (No Fluff) --------
    try {
      console.log(`[TTS] Generating audio from study guide (${audioScript.length} chars)`)
      const tts = new MsEdgeTTS()
      // Changed to a more authoritative, conversational voice
      await tts.setMetadata('en-US-ChristopherNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

      const { audioStream } = tts.toStream(audioScript.slice(0, 4000)) // Limit to 4k chars for safety
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

  // BKT and IRT Updates 
  try {
    const { data: quizData } = await supabase.from('quizzes').select('subject_id, lesson_title, questions').eq('id', quizId).single()
    if (quizData) {
      const { subject_id, lesson_title, questions } = quizData
      
      // 1. Fetch current Ability (IRT)
      let { data: abilityData } = await supabase.from('student_abilities').select('ability_theta').eq('student_id', user.id).eq('subject_id', subject_id).maybeSingle()
      let currentTheta = abilityData?.ability_theta || 0.0;
      
      // 2. Fetch current Mastery (BKT)
      let { data: masteryData } = await supabase.from('knowledge_states').select('p_mastery, attempts_count').eq('student_id', user.id).eq('subject_id', subject_id).eq('concept', lesson_title).maybeSingle()
      let currentMastery = masteryData?.p_mastery || 0.1;
      let attemptsCount = masteryData?.attempts_count || 0;

      // 3. Process each question
      questions.forEach((q: any, idx: number) => {
        const isCorrect = answers[idx] === q.answer;
        currentTheta = updateAbility(currentTheta, q.difficulty || 0.0, isCorrect);
        currentMastery = updateMastery(currentMastery, isCorrect);
      });

      // 4. Save Updates
      await supabase.from('student_abilities').upsert({
        student_id: user.id,
        subject_id: subject_id,
        ability_theta: currentTheta,
        last_updated: new Date().toISOString()
      }, { onConflict: 'student_id, subject_id' });

      await supabase.from('knowledge_states').upsert({
        student_id: user.id,
        subject_id: subject_id,
        concept: lesson_title,
        p_mastery: currentMastery,
        attempts_count: attemptsCount + 1,
        last_updated: new Date().toISOString()
      }, { onConflict: 'student_id, subject_id, concept' });
    }
  } catch (err) {
    console.error('Failed to update adaptive models:', err);
  }

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

  // Check if an adaptive exam already exists for this student+subject
  const { data: existingExam } = await supabase
    .from('exams')
    .select('id, is_adaptive, completed_at')
    .eq('student_id', user.id)
    .eq('subject_id', subjectId)
    .maybeSingle()
  if (existingExam) return existingExam.id

  // Fetch all quiz attempts for this subject
  const { data: attempts, error: fetchError } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes!inner(id, subject_id, questions)')
    .eq('student_id', user.id)
    .eq('quizzes.subject_id', subjectId)
  
  if (fetchError) throw fetchError
  if (!attempts || attempts.length < 3) return null

  // Build the full item bank from all quiz questions
  const allQuestions: any[] = []
  const seenQuestions = new Set<string>()

  attempts.forEach(attempt => {
    const questions = (attempt.quizzes as any).questions
    questions.forEach((q: any) => {
      if (!seenQuestions.has(q.question)) {
        seenQuestions.add(q.question)
        allQuestions.push(q)
      }
    })
  })

  if (allQuestions.length < 5) return null

  // LLM Difficulty Recalibration for items missing proper difficulty
  const needsCalibration = allQuestions.filter(q => !q.difficulty || q.difficulty === 0.0)
  if (needsCalibration.length > 0 && process.env.OPENROUTER_API_KEY) {
    try {
      const batch = needsCalibration.slice(0, 20) // Limit batch size
      const questionsText = batch.map((q, i) => `${i + 1}. ${q.question}`).join('\n')

      const res = await openai.chat.completions.create({
        model: 'openrouter/auto',
        messages: [{
          role: 'user',
          content: `You are an IRT psychometrician. Estimate the difficulty of each question on a Rasch IRT scale from -3.0 (trivial) to +3.0 (extremely hard). Return ONLY a JSON array of numbers, one per question, in the same order.

Example response: [-1.2, 0.5, 1.8, -0.3]

Questions:
${questionsText}`
        }]
      })

      const content = res.choices[0].message.content?.trim() || ''
      // Extract JSON array from response
      const match = content.match(/\[([\s\S]*?)\]/)
      if (match) {
        const difficulties: number[] = JSON.parse(`[${match[1]}]`)
        batch.forEach((q, i) => {
          if (difficulties[i] !== undefined && !isNaN(difficulties[i])) {
            q.difficulty = Math.max(-3.0, Math.min(3.0, difficulties[i]))
          }
        })
      }
    } catch (e) {
      console.warn('[CAT] LLM difficulty calibration failed, using defaults')
    }
  }

  // Build final item bank with bank_index for tracking
  const itemBank: CATQuestion[] = allQuestions.map((q, idx) => ({
    question: q.question,
    options: q.options,
    answer: q.answer,
    hints: q.hints || [],
    difficulty: q.difficulty || 0.0,
    bank_index: idx
  }))

  // Get current theta as starting point
  const { data: abilityData } = await supabase
    .from('student_abilities')
    .select('ability_theta')
    .eq('student_id', user.id)
    .eq('subject_id', subjectId)
    .maybeSingle()
  const initialTheta = abilityData?.ability_theta || 0.0

  // Create the adaptive exam
  const { data: newExam, error: insertError } = await supabase.from('exams').insert({
    student_id: user.id,
    subject_id: subjectId,
    questions: [], // Legacy field — kept empty for adaptive exams
    item_bank: itemBank,
    initial_theta: initialTheta,
    is_adaptive: true,
    cat_responses: []
  }).select().single()

  if (insertError) throw insertError
  return newExam.id
}

/**
 * Get the next question for a CAT session, or signal that the exam is complete.
 * Called by the client after each answer to get the adaptively-selected next question.
 */
export async function getNextCATQuestion(examId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('student_id', user.id)
    .single()

  if (!exam) throw new Error('Exam not found')

  // If already completed, return the final results
  if (exam.completed_at) {
    return {
      finished: true,
      finalTheta: exam.final_theta,
      standardError: exam.standard_error,
      totalQuestions: (exam.cat_responses as CATResponse[]).length,
      responses: exam.cat_responses as CATResponse[]
    }
  }

  const itemBank = exam.item_bank as CATQuestion[]
  const responses = (exam.cat_responses || []) as CATResponse[]
  const answeredIndices = new Set(responses.map(r => r.bank_index))

  // Current theta from last response, or initial
  const currentTheta = responses.length > 0
    ? responses[responses.length - 1].theta_after
    : exam.initial_theta || 0.0

  // Check convergence
  const answeredDifficulties = responses.map(r => {
    const q = itemBank.find(item => item.bank_index === r.bank_index)
    return q?.difficulty || 0.0
  })
  const se = calculateStandardError(currentTheta, answeredDifficulties)

  const hasConverged = responses.length >= CAT_MIN_QUESTIONS && se < CAT_SE_THRESHOLD
  const maxReached = responses.length >= CAT_MAX_QUESTIONS
  const bankExhausted = answeredIndices.size >= itemBank.length

  if (hasConverged || maxReached || bankExhausted) {
    // Mark exam as completed
    await supabase.from('exams').update({
      final_theta: currentTheta,
      standard_error: se,
      completed_at: new Date().toISOString()
    }).eq('id', examId)

    // Also update the student's global ability for this subject
    await supabase.from('student_abilities').upsert({
      student_id: user.id,
      subject_id: exam.subject_id,
      ability_theta: currentTheta,
      last_updated: new Date().toISOString()
    }, { onConflict: 'student_id, subject_id' })

    return {
      finished: true,
      finalTheta: currentTheta,
      standardError: se,
      totalQuestions: responses.length,
      responses
    }
  }

  // Select the next optimal question
  const nextQuestion = selectNextCATQuestion(currentTheta, itemBank, answeredIndices)
  if (!nextQuestion) {
    return { finished: true, finalTheta: currentTheta, standardError: se, totalQuestions: responses.length, responses }
  }

  return {
    finished: false,
    currentTheta,
    standardError: se,
    questionNumber: responses.length + 1,
    question: nextQuestion
  }
}

/**
 * Submit a single answer during a CAT session AND return the next question.
 * The client passes its full answer history to avoid stale DB reads.
 */
export async function submitCATAnswer(
  examId: string,
  bankIndex: number,
  answer: string,
  previousAnswers: { bank_index: number; answer: string }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: exam } = await supabase
    .from('exams')
    .select('item_bank, initial_theta, subject_id, completed_at')
    .eq('id', examId)
    .eq('student_id', user.id)
    .single()

  if (!exam || exam.completed_at) throw new Error('Exam not available')

  const itemBank = exam.item_bank as CATQuestion[]

  // Reconstruct full response history from client-provided data (avoids stale DB reads)
  const allAnswers = [...previousAnswers, { bank_index: bankIndex, answer }]
  let theta = exam.initial_theta || 0.0
  const fullResponses: CATResponse[] = []

  for (const a of allAnswers) {
    const q = itemBank.find(item => item.bank_index === a.bank_index)
    if (!q) continue
    const correct = a.answer === q.answer
    theta = updateAbility(theta, q.difficulty, correct)
    const difficulties = fullResponses.map(r => itemBank.find(i => i.bank_index === r.bank_index)?.difficulty || 0)
    difficulties.push(q.difficulty)
    const se = calculateStandardError(theta, difficulties)
    fullResponses.push({
      bank_index: a.bank_index,
      answer: a.answer,
      correct,
      theta_after: theta,
      se_after: se
    })
  }

  const lastResponse = fullResponses[fullResponses.length - 1]
  const isCorrect = lastResponse.correct
  const se = lastResponse.se_after

  // Persist the full state to DB
  await supabase.from('exams').update({
    cat_responses: fullResponses
  }).eq('id', examId)

  // ---- Compute the next question ----
  const answeredIndices = new Set(fullResponses.map(r => r.bank_index))
  const hasConverged = fullResponses.length >= CAT_MIN_QUESTIONS && se < CAT_SE_THRESHOLD
  const maxReached = fullResponses.length >= CAT_MAX_QUESTIONS
  const bankExhausted = answeredIndices.size >= itemBank.length

  let nextResult: any = null

  if (hasConverged || maxReached || bankExhausted) {
    await supabase.from('exams').update({
      final_theta: theta,
      standard_error: se,
      completed_at: new Date().toISOString()
    }).eq('id', examId)

    await supabase.from('student_abilities').upsert({
      student_id: user.id,
      subject_id: exam.subject_id,
      ability_theta: theta,
      last_updated: new Date().toISOString()
    }, { onConflict: 'student_id, subject_id' })

    nextResult = {
      finished: true,
      finalTheta: theta,
      standardError: se,
      totalQuestions: fullResponses.length,
      responses: fullResponses
    }
  } else {
    const nextQuestion = selectNextCATQuestion(theta, itemBank, answeredIndices)
    if (!nextQuestion) {
      nextResult = { finished: true, finalTheta: theta, standardError: se, totalQuestions: fullResponses.length, responses: fullResponses }
    } else {
      nextResult = {
        finished: false,
        currentTheta: theta,
        standardError: se,
        questionNumber: fullResponses.length + 1,
        question: nextQuestion
      }
    }
  }

  return {
    correct: isCorrect,
    correctAnswer: itemBank.find(q => q.bank_index === bankIndex)?.answer || '',
    thetaAfter: theta,
    seAfter: se,
    questionNumber: fullResponses.length,
    next: nextResult
  }
}