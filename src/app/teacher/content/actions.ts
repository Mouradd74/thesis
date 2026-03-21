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

  // -------- OpenRouter AI --------
  if (apiEnabled && hasTranscript) {
    // Study Guide
    try {
      const chunks = chunkText(transcriptText)
      const summaries: string[] = []

      for (const chunk of chunks) {
        const res = await openai.chat.completions.create({
          model: 'openrouter/auto',
          messages: [
            { role: 'user', content: `Provide a direct, comprehensive explanation of the following content. Avoid conversational filler, introductory/concluding remarks, or fluff. Focus purely on the educational facts and concepts . Do not add any hashtags or so this text you generate will be directly displayed in an educational platform for students so make it look sensible with professional formatting :\n${chunk}` }
          ]
        })
        const content = res.choices[0].message.content
        if (content) summaries.push(content)
      }
      studyGuide = summaries.join('\n\n')
    } catch (e) {
      console.warn('Study guide generation failed, using raw transcript.')
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

  // Save study guide
  await supabase.from('content').insert({ subject_id: subjectId, title, type: 'text', body: studyGuide })

  // Save audio if exists
  if (audioUrl) {
    await supabase.from('content').insert({ subject_id: subjectId, title, type: 'audio', url: audioUrl })
  }

  revalidatePath('/teacher/content')
  revalidatePath(`/student/subjects/${subjectId}`)
}