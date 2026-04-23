import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  // 1. Initialise client inside handler so env vars are available at runtime
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })

  // 2. Authenticate user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Parse request body
  const { messages, lessonContext } = await request.json()

  if (!messages || !Array.isArray(messages)) {
    return new Response('Invalid messages', { status: 400 })
  }

  if (!lessonContext || typeof lessonContext !== 'string') {
    return new Response('Missing lesson context', { status: 400 })
  }

  // 3. Build the system prompt with lesson context
  const systemPrompt = `You are a friendly and encouraging AI tutor on an educational platform. You are helping a student understand a specific lesson.

### STRICT RULES:
1. **Only use the lesson content below** to answer questions. Do NOT make up information or use outside knowledge.
2. If the student asks something NOT covered in the lesson content, politely say: "That's a great question, but it's not covered in this lesson's material. Try asking your teacher!"
3. Be concise, clear, and supportive. Use simple language.
4. Use markdown formatting for readability (bold key terms, bullet points for lists).
5. If the student seems confused, try explaining the concept differently using analogies.
6. Keep responses short — aim for 2-4 paragraphs max unless the student asks for a detailed explanation.

### LESSON CONTENT:
${lessonContext.slice(0, 8000)}`

  try {
    // 4. Stream the response
    const stream = await openai.chat.completions.create({
      model: 'openrouter/auto',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // Keep last 10 messages for context window
      ],
    })

    // 5. Convert to a ReadableStream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (err) {
          console.error('[Chat API] Stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[Chat API] Error:', err)
    return new Response('Failed to generate response', { status: 500 })
  }
}
