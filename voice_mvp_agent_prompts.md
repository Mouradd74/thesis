# Voice Prompting MVP — Coding Agent Prompts

Two prompts, one per repo. Each is written to be pasted as-is into a coding
agent that only has access to that one repo. Run the backend prompt first,
verify the endpoint works with a real curl request, then run the CLI prompt.

Both prompts pin down the exact same API contract so the two pieces meet in
the middle correctly even though the agents build them separately:

```
POST {shared_backend_base_url}/v1/voice/transcribe
Content-Type: multipart/form-data

fields:
  audio     — file, wav or webm, required
  language  — string, optional, BCP-47 hint e.g. "en"
  prompt    — string, optional, vocabulary/context bias

200 response:
{
  "text": "string, the transcript",
  "durationMs": 3210,
  "model": "gpt-4o-mini-transcribe",
  "confidence": 0.94   // optional, omit if not available
}

4xx/5xx response: match whatever error shape this repo's other API routes
already use — do not invent a new error format.
```

If you change this contract while implementing either side, update it in
both prompts before running the second one.

---

## Prompt 1 — Backend repo (shared-services)

```
I'm adding a voice-to-text feature to our coding agent CLI. This repo is
the shared backend that already handles auth, model routing, and quotas
for the CLI. I need a new proxy endpoint for audio transcription.

Before writing anything, look at how an existing route works end to end —
pick whichever chat/completions route is simplest — and specifically note:
- how auth/session is validated on incoming requests
- how the OpenAI (or other provider) API key is loaded and attached to
  outbound requests
- how errors are shaped in responses
- how requests get logged/counted for usage or rate limiting
- how config values (model names, base URLs) are sourced (env vars,
  config file, etc.)

Then implement a new endpoint following those exact same conventions:

POST /v1/voice/transcribe
- Accepts multipart/form-data with:
  - audio: file (wav or webm), required
  - language: string, optional — BCP-47 hint like "en"
  - prompt: string, optional — passed through as OpenAI's transcription
    "prompt" parameter to bias vocabulary/style, not a chat prompt
- Validates: audio file present, reasonable size cap (reject anything over
  ~25MB with a clear error), reasonable duration if you can check it
  cheaply — otherwise skip duration validation, don't add heavy audio
  processing dependencies just to check length.
- Forwards the audio to OpenAI's transcription endpoint
  (POST https://api.openai.com/v1/audio/transcriptions) using the same
  API key management this repo already uses elsewhere. Use
  "gpt-4o-mini-transcribe" as the model, but don't hardcode that string
  in the handler — read it from config the same way other model names in
  this repo are configured, with gpt-4o-mini-transcribe as the default.
- Do NOT set stream:true on the OpenAI request — buffer the full response
  and return it as one JSON payload.
- On success, respond 200 with:
  { "text": string, "durationMs": number, "model": string,
    "confidence": number | omitted }
  Compute durationMs from the audio file if easily available, otherwise
  from request timing as a fallback — note in a comment which one you used.
- On failure (missing audio, OpenAI error, timeout), respond using this
  repo's existing error response shape — do not invent a new one. Make
  sure a malformed/empty audio file produces a clean 4xx, not a 500.
- Apply the same auth middleware and rate limiting / usage logging that
  the chat/completions route uses, so voice requests are tracked the same
  way as everything else. Voice should NOT bypass quota enforcement.
- Do not persist the uploaded audio to disk or a database. Process it in
  memory/temp storage only and ensure it's discarded once the request
  completes (success or failure). Add a code comment noting this is
  intentional (privacy requirement), not an oversight.
- Do not log the raw audio bytes or the transcript text in general request
  logs — treat transcript text with the same care this repo already gives
  chat message content, if it has any redaction/exclusion pattern for that.

Write tests:
- A unit test that hits the route with a small fixture WAV file (generate
  or include a tiny sample — a second or two of silence or a tone is
  fine), mocking the OpenAI call, asserting the response shape.
- A test for the missing-audio-file case returns a clean 4xx.
- A test that confirms the OpenAI API key is never included in the
  response body or logs.

When you're done, tell me the exact route path, how to set the model name
via config, and give me a working curl example I can run against a local
instance to sanity check it.
```

---

## Prompt 2 — CLI repo (opencode fork)

```
I'm adding a voice-to-text input mode to this CLI's interactive TUI, for
the first version only — push-to-talk (or toggle-to-record), no realtime
streaming. The flow: user presses a key, we record their mic, send the
recording to our backend for transcription, drop the resulting text into
the prompt input box for them to review/edit, and only send it as a normal
chat message when they hit Enter like they normally would.

Before writing anything, explore this repo and tell me:
- What language/framework the TUI is built with, and what (if any) TUI
  styling library it uses (for adding a recording indicator and styling
  voice-originated messages differently).
- Whether this repo has its own local server process that proxies
  requests to an external backend (I believe it does, for model calls) —
  if so, find where outbound calls to that backend are made and what
  base URL / auth mechanism they use.
- How chat messages are represented internally (the struct/type/interface)
  and how the message history is rendered to the terminal.
- How keybindings are currently registered/configured, so I can follow
  the same pattern for a new voice-record keybinding.

Then implement:

1. Audio capture
   - Add a way to record from the default microphone at 16kHz mono PCM16
     (or record to WAV — whichever integrates more cleanly given the
     capture library you choose for this language/platform).
   - Pick whatever audio capture approach best fits the existing stack
     you found above (a native binding if this is Go, a well-maintained
     npm package if this is Node, etc.) — prefer something that doesn't
     require shelling out to external binaries like ffmpeg/sox unless no
     reasonable in-process option exists for this language.
   - Handle mic permission errors gracefully: if capture fails to start
     (permission denied, no device found), surface a clear inline message
     in the TUI and fall back to normal text input — do not crash or hang.

2. Recording state machine, bound to a new keybinding (pick one that
   doesn't collide with existing bindings; toggle style — one press to
   start, another press or Esc to stop/cancel — not press-and-hold):
   idle → recording → transcribing → reviewing (editable text in the
   normal input box) → sent, with Esc at any point in recording/
   transcribing canceling and discarding, returning to idle.
   - While recording: show a visible indicator (a recording dot/icon,
     an elapsed-time counter). An amplitude/level meter is a nice-to-have,
     skip it if it adds significant complexity.
   - Cap recording length at 2 minutes; auto-stop and proceed to
     transcription if that's hit.
   - If the recording is essentially silent (near-zero amplitude
     throughout), skip the network call entirely and return to idle
     rather than sending an empty/junk request.

3. Sending for transcription
   - Send the recorded audio via the repo's existing backend-proxy
     mechanism (found above), to this contract — implement it exactly:

     POST {backend_base_url}/v1/voice/transcribe
     multipart/form-data: audio=<file>, language=<optional>, prompt=<optional>
     200 response: { "text": string, "durationMs": number,
                      "model": string, "confidence": number | absent }

   - For the optional "prompt" field, build a short bias string from
     available session context if cheap to do (e.g. current repo name,
     currently open file names) — keep it under a couple hundred
     characters. If that context isn't readily available, omit the field
     entirely rather than adding new plumbing to fetch it.
   - Show a "transcribing…" state while waiting.
   - On success, populate the normal chat input field with the returned
     text — do NOT auto-submit it. The user reviews/edits it and presses
     Enter themselves, exactly like a typed message.
   - On failure, show the error inline where "transcribing…" was, offer a
     retry that resends the already-recorded audio (don't require
     re-recording), and don't lose the audio buffer until the user
     dismisses the error or retries successfully.

4. Message schema
   - Add an `inputMethod: "text" | "voice"` field to the message
     type/struct, defaulting existing/typed messages to "text".
   - Add an optional voice metadata field alongside it, e.g.:
     `voiceMeta: { transcriptionModel: string, audioDurationMs: number,
     confidence?: number, edited: boolean }`
     Set `edited: true` if the user changed the transcribed text before
     sending, false if they sent it unmodified — compare the final sent
     text to what was returned from transcription.

5. Visual differentiation in the rendered message history
   - Style messages with `inputMethod: "voice"` distinctly from typed
     ones using whatever the existing TUI styling library supports:
     italic body text, a distinct accent color on the message's
     border/gutter, and a small prefix glyph (e.g. a mic icon or similar)
     before the message. Do not attempt to change font family — that's
     not controllable from a terminal; use style/color only.

6. Settings
   - Add a config option to enable/disable the voice feature entirely.
   - Add a config option for input device selection if the audio library
     you chose supports listing/selecting devices; otherwise default to
     system default input and note that device selection isn't yet
     exposed.
   - Make the new keybinding configurable through whatever mechanism
     existing keybindings use.

Write tests where this repo's existing test setup makes it reasonable to
(e.g. state machine transitions, message schema serialization). Audio
capture itself likely isn't unit-testable without real hardware — don't
force it, just note in comments where manual testing is required.

When you're done, tell me: the keybinding you chose, the config flag to
enable/disable the feature, and any manual steps needed to test it locally
(e.g. env var for the backend base URL).
```

---

## Notes on running these

- Run the backend prompt first and actually curl the resulting endpoint
  with a real short WAV file before touching the CLI repo — confirms the
  contract works before the CLI side depends on it.
- If the agent working the backend repo deviates from the contract above
  (different field names, wrapped response, etc.), copy its actual final
  shape into Prompt 2 before running it, so the CLI agent implements
  against reality, not the spec.
- Both prompts explicitly tell the agent to inspect existing patterns
  first rather than inventing new ones — that's the difference between
  code that fits your codebase and code that technically works but looks
  bolted on. Don't skip that instruction if you shorten these later.
