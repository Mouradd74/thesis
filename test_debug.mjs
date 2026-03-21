import pkg from 'youtube-transcript'
const { YoutubeTranscript } = pkg
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function run() {
  const url = 'https://www.youtube.com/watch?v=AA621UofTUA'
  console.log("1. Fetching transcript...")
  const transcript = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' })
  const transcriptText = transcript.map(t => t.text).join(' ')
  console.log("Transcript length:", transcriptText.length)

  console.log("2. Running Gemini...")
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  const podcastPrompt = `You are two expert educational podcasters, Alex (male) and Sarah (female). 
Write a lively, highly-energetic, and engaging 2-minute podcast script discussing the core concepts from this transcript.
Return the output STRICTLY as a JSON array of objects. Do not include any formatting, markdown, or backticks! 
Example format:
[{"speaker":"Alex","text":"Welcome to the deep dive!"}, {"speaker":"Sarah","text":"Today we're talking about..."}]
Transcript: ${transcriptText.substring(0, 3000)}`

  const podcastResult = await model.generateContent(podcastPrompt)
  const rawText = podcastResult.response.text()
  
  console.log("Gemini Output (First 100 chars):", rawText.substring(0, 100))

  const jsonMatch = rawText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("Regex failed to find JSON array. Gemini Output was: " + rawText)
  
  const script = JSON.parse(jsonMatch[0])
  console.log("Parsed JSON array length:", script.length)

  console.log("3. Generating TTS Audio...")
  for (const line of script) {
    if (!line.speaker || !line.text) continue;
    console.log(`TTS for ${line.speaker}:`, line.text.substring(0, 50))
    const tts = new MsEdgeTTS()
    const voice = line.speaker.includes('Sarah') ? 'en-US-AriaNeural' : 'en-US-ChristopherNeural'
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    
    const streamObj = tts.toStream(line.text)
    let chunks = 0
    for await (const chunk of streamObj.audioStream) {
      chunks++
    }
    console.log(`-> Received ${chunks} chunks`)
  }
  
  console.log("SUCCESS!")
}

run().catch(e => console.error("ERROR:", e))
