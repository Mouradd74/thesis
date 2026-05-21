// Edge runtime runs on Cloudflare's network — different IPs than AWS Lambda,
// so YouTube is far less likely to block these requests.
export const runtime = 'edge'

const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false'
const CLIENT_VERSION = '20.10.38'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)'
const ANDROID_UA = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}

function parseTranscriptXml(xml: string): string[] {
  const segments: string[] = []

  // srv3 format: <p t="ms" d="ms">text</p>
  const pRegex = /<p\s+t="\d+"\s+d="\d+"[^>]*>([\s\S]*?)<\/p>/g
  let match
  while ((match = pRegex.exec(xml)) !== null) {
    let inner = match[1]
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g
    let sMatch, combined = ''
    while ((sMatch = sRegex.exec(inner)) !== null) combined += sMatch[1]
    if (!combined) combined = inner.replace(/<[^>]+>/g, '')
    combined = decodeEntities(combined).trim()
    if (combined) segments.push(combined)
  }

  // Classic format: <text start="s" dur="s">text</text>
  if (segments.length === 0) {
    const textRegex = /<text start="[^"]*" dur="[^"]*">([^<]*)<\/text>/g
    while ((match = textRegex.exec(xml)) !== null) {
      const text = decodeEntities(match[1]).trim()
      if (text) segments.push(text)
    }
  }

  return segments
}

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json()
    if (!videoId) return Response.json({ success: false, error: 'Missing videoId' }, { status: 400 })

    // --- Method 1: InnerTube API (Android client) ---
    try {
      const res = await fetch(INNERTUBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': ANDROID_UA },
        body: JSON.stringify({
          context: { client: { clientName: 'ANDROID', clientVersion: CLIENT_VERSION } },
          videoId
        })
      })

      if (res.ok) {
        const json = await res.json()
        const tracks = json?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        if (Array.isArray(tracks) && tracks.length > 0) {
          const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0]
          const trackRes = await fetch(track.baseUrl, { headers: { 'User-Agent': USER_AGENT } })
          if (trackRes.ok) {
            const xml = await trackRes.text()
            const segments = parseTranscriptXml(xml)
            if (segments.length > 0) {
              return Response.json({ success: true, text: segments.join(' '), method: 'innertube' })
            }
          }
        }
      }
    } catch (e) {
      console.error('[Edge Transcript] InnerTube failed:', e)
    }

    // --- Method 2: Web page scraping fallback ---
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': USER_AGENT }
      })
      const html = await pageRes.text()

      if (html.includes('class="g-recaptcha"')) {
        return Response.json({ success: false, error: 'YouTube captcha block' }, { status: 429 })
      }

      // Extract ytInitialPlayerResponse JSON
      const varName = 'var ytInitialPlayerResponse = '
      const idx = html.indexOf(varName)
      if (idx !== -1) {
        const start = idx + varName.length
        let depth = 0
        for (let i = start; i < html.length; i++) {
          if (html[i] === '{') depth++
          else if (html[i] === '}') {
            depth--
            if (depth === 0) {
              const obj = JSON.parse(html.slice(start, i + 1))
              const tracks = obj?.captions?.playerCaptionsTracklistRenderer?.captionTracks
              if (Array.isArray(tracks) && tracks.length > 0) {
                const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0]
                const trackRes = await fetch(track.baseUrl, { headers: { 'User-Agent': USER_AGENT } })
                if (trackRes.ok) {
                  const xml = await trackRes.text()
                  const segments = parseTranscriptXml(xml)
                  if (segments.length > 0) {
                    return Response.json({ success: true, text: segments.join(' '), method: 'webpage' })
                  }
                }
              }
              break
            }
          }
        }
      }
    } catch (e) {
      console.error('[Edge Transcript] Web page scrape failed:', e)
    }

    return Response.json({ success: false, error: 'All methods failed' }, { status: 404 })
  } catch (e: any) {
    return Response.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
