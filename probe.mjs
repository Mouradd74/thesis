import pkg from 'youtube-transcript';
const { YoutubeTranscript } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const url = 'https://youtu.be/1UQ5IbihJNI?si=D66SRneNwmChDCew';
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' });
    const text = transcript.map(t => t.text).join(' ');
    console.log("Transcript length:", text.length);
    console.log("Gemini Key Exists:", !!process.env.GEMINI_API_KEY);
  } catch (e) {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        const text = transcript.map(t => t.text).join(' ');
        console.log("Fallback Transcript length:", text.length);
    } catch (e2) {
        console.error("Total fail", e2.message);
    }
  }
}
check();
