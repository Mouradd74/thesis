import pkg from 'youtube-transcript';
const { YoutubeTranscript } = pkg;

async function check() {
  const url = 'https://youtu.be/1UQ5IbihJNI?si=D66SRneNwmChDCew';
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' });
    const text = transcript.map(t => t.text).join(' ');
    console.log("Transcript length:", text.length);
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
