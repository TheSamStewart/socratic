# Simli implementation plan: a video-call examiner

Status: plan. Demo-only, single developer (Sam). Date: 9 Nov 2026.
Goal: in the viva, the examiner is a real-time talking face (Simli) speaking the existing ElevenLabs voice, inside the call layout from `video-viva-plan.md`.
Simli facts below come from docs.simli.com and the npm registry, read 9 Nov 2026.

## 1. How it fits together

```
Student speaks ─► Web Speech (Composer) ─► chat() ─► FastAPI + Claude ─► examiner text
                                                                             │
                     /api/tts (ElevenLabs MP3, already built + cached) ◄─────┘
                                   │
                     browser: decode MP3 → 16 kHz mono Int16 PCM
                                   │
                     SimliClient.sendAudioData(chunks) ─► Simli (WebRTC)
                                   │
                     <video> + <audio> in the examiner tile: lip-synced face and voice
```

- **The rest of the stack stays the same.** Claude still writes the examiner's lines and ElevenLabs still voices them. Simli only turns that audio into a face.
- **Simli plays the sound too**, through its own `<audio>` element, so voice and lips stay in sync. In Simli mode we do not play the MP3 ourselves.
- **The API key never reaches the browser.** The backend mints a short-lived session token.

## 2. Key facts from Simli's docs

| Item | Value |
|---|---|
| JS package | `simli-client` (latest 3.2.0). **New npm dependency.** |
| Token | `POST https://api.simli.ai/compose/token` with header `x-simli-api-key`. Flat JSON body: `faceId` (required), `apiVersion: "v2"`, `handleSilence` (default true), `maxSessionLength` (s, default 3600), `maxIdleTime` (s, default 300), `audioInputFormat: "pcm16"`. Response: `{ session_token, warnings }`. A 400 returns `session_token: "FAIL TOKEN"`. |
| Client | `new SimliClient(session_token, videoEl, audioEl, null, LogLevel.INFO)`, then `await start()`. Create it right before `start()`. |
| Methods | `sendAudioData(Uint8Array)`, `ClearBuffer()` (capital C), `stop()`, `on(event, cb)`, `off(event, cb)` |
| Events | `start`, `stop`, `speaking`, `silent`, `error`, `startup_error` (no connected / disconnected events) |
| Audio | Raw PCM, signed 16-bit little-endian, 16 kHz, mono, no header. Chunks of about 6000 bytes. |
| Faces | Preset (Trinity-2), e.g. Anna `bf13113a-355a-4d97-8b90-4edccd1da7b2`, Sara `f735e62c-dce7-4c0b-8e85-1c7e21774c45`, Mei `084479bf-de7c-4df0-8d9c-5484193ecd27`. Browse at docs.simli.com/api-reference/preset-faces. |
| Free tier | 50 min/month, 1 concurrent session, template faces. Hobby is $10/month for 1,000 min. |
| Elements | `<video autoPlay playsInline>` and `<audio autoPlay>` |

## 3. Step 0: get the backend running

1. **Check Python 3.15 works** (installed: 3.15.2; the README targets 3.11). In `backend/`:
   ```powershell
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
   If a package (most likely `pydantic-core`) has no wheel for 3.15, install 3.12 alongside with `winget install Python.Python.3.12` and use `py -3.12 -m venv .venv`.
2. Start the backend: `$env:SEED_DEMO="1"; uvicorn app.main:app --port 8000`.
3. Check http://localhost:8000/health. The "Couldn't reach Socratic" banner should go away.
4. Get a Simli API key from app.simli.com and add it to `.env`:
   ```
   SIMLI_API_KEY=...
   SIMLI_FACE_ID=bf13113a-355a-4d97-8b90-4edccd1da7b2   # optional, pick any preset
   ```
5. Add `NEXT_PUBLIC_FACE=simli` to `frontend/.env.local` (`off` gives the existing avatar). Restart `npm run dev`.

## 4. Build steps

### S1. Backend: token endpoint (30 min)
`backend/app/main.py`, next to `/api/tts`:
```python
@api.post("/simli/token")
def simli_token() -> dict:
    key = os.getenv("SIMLI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Simli is not configured")
    r = httpx.post(
        "https://api.simli.ai/compose/token",
        headers={"x-simli-api-key": key},
        json={
            "faceId": os.getenv("SIMLI_FACE_ID", "bf13113a-355a-4d97-8b90-4edccd1da7b2"),
            "apiVersion": "v2",
            "handleSilence": True,     # idle face keeps breathing between lines
            "maxSessionLength": 600,   # 10 min hard cap: protects free minutes
            "maxIdleTime": 120,        # a forgotten tab stops spending after 2 min
        },
        timeout=10,
    )
    data = r.json()
    if r.status_code != 200 or data.get("session_token") in (None, "FAIL TOKEN"):
        raise HTTPException(503, "Simli token failed")
    return {"session_token": data["session_token"]}
```
`httpx` is already a dependency. Never log the key.
**Done when:** `curl -X POST localhost:8000/api/simli/token` returns a token.

### S2. Frontend: Simli wrapper `frontend/lib/simli.ts` (2 h)
`npm install simli-client@3.2.0` (the only new dependency).
```ts
export type FaceSession = {
  say(mp3: ArrayBuffer): Promise<void>;  // resolves when the face has finished talking
  interrupt(): void;                     // barge-in: ClearBuffer()
  close(): Promise<void>;
};
export async function openFace(video: HTMLVideoElement, audio: HTMLAudioElement): Promise<FaceSession>
```
- **Open:** call `POST /api/simli/token`, then `new SimliClient(token, video, audio, null, LogLevel.INFO)`, then `await start()`. Reject on `startup_error`, or after a 15 s timeout.
- **Convert (`say`):**
  - `AudioContext.decodeAudioData(mp3)`, then an `OfflineAudioContext(1, n, 16000)` to resample to 16 kHz mono.
  - Float32 to Int16 (clamp, ×32767), then `Uint8Array`.
  - Send in 6000-byte slices with `sendAudioData`.
  - If the face stutters, pace the slices at real time (6000 B ≈ 188 ms) instead of sending them all at once.
- **Finish detection:** resolve `say` when `silent` fires after a `speaking` event. Add a safety timer of audio duration + 1.5 s in case the event never arrives.
- **Interrupt:** `ClearBuffer()`, then resolve the pending `say`.
- **Close:** `stop()`. Also call `close()` on `pagehide`, so minutes stop counting when the tab closes.

### S3. Plug into `speak()` (1 h)
`frontend/lib/speech.ts`:
- Add `setFaceSink(sink: FaceSession | null)`.
- In `speakEleven`, when a sink is set and the speaker is `examiner`:
  - fetch `/api/tts` as now (MP3, cached on disk)
  - call `await sink.say(await blob.arrayBuffer())`
  - do **not** create an `Audio()`
- `stopSpeaking()` also calls `sink.interrupt()`.
- **Fallbacks:** if `/api/tts` fails (no ElevenLabs), the browser voice can't drive Simli because there's no audio stream to capture. Use the existing browser-voice path and show the static avatar for that line.
- **Result:** `ChatPanel`'s turn loop (speak, then listen, then send, then barge-in) works unchanged.

### S4. Call screen (1–1.5 days)
Follows `video-viva-plan.md` §3 for the layout, with Simli in the main tile:
- **`components/call/PreCall.tsx`:**
  - Mic meter, "Test sound" (also unlocks audio), and an optional camera self-view preview.
  - **Join viva** calls `openFace()`. The face loads behind a "Connecting to examiner…" placeholder. Starting the session here means it's warm before the first question.
- **`components/call/CallStage.tsx`:**
  - Simli `<video>` fills the main tile; the hidden `<audio>` is Simli's.
  - Caption overlay, and a self-view tile (local `getUserMedia` only).
  - Control bar: mute, camera, CC, Repeat, Plain English, Text, End.
  - A blue ring on the tile while `speaking`, and a green ring while the student talks.
- **Shared turn loop:** extract the loop from `ChatPanel` into a `useVivaConversation()` hook, so `ChatPanel` (text / Teach Max) and `CallStage` (viva) share it.
- **End viva:** call `face.close()`, then go to the existing recap.

### S5. Max (30 min)
The free tier allows one concurrent session, and Max's voice isn't the examiner's. When the backend switches to `teach_max`:
- Max appears as a second, smaller tile using the existing 2D `Avatar` and the normal audio path.
- The Simli examiner stays idle (breathing) until the viva resumes. No second Simli session is needed.

### S6. Polish (half a day)
- **Thinking cue:** while Claude is generating, show the subtle "thinking" ring and a "Examiner is thinking…" caption. The idle Simli face keeps moving because of `handleSilence`.
- **Failure fallback:** if `openFace()` fails (no key, quota used up, network), show a one-line notice and fall back to the static avatar with normal audio. The viva must never block on Simli.
- **Dev usage line:** `console.info` the session's open time on close, so you can track free minutes.

## 5. Protecting the 50 free minutes
The session meter runs from Join to End, including while the student is talking.
- Build and style S4 with `NEXT_PUBLIC_FACE=off` (the static avatar). Only switch to `simli` to test the real face.
- `maxSessionLength: 600` and `maxIdleTime: 120` cap runaway sessions. Closing on `pagehide` covers closed tabs.
- A full viva is about 6–8 minutes, so free covers roughly 6 complete runs plus short tests. Upgrade to Hobby ($10) before demo day if rehearsals need more.
- One concurrent session: two open tabs means the second fails. The fallback in S6 handles that.

## 6. Test checklist
- [ ] Token endpoint returns a token; with no `SIMLI_API_KEY` it returns 503 and the viva falls back cleanly.
- [ ] The face appears within about 5 s of Join; the first question plays with the mouth in sync.
- [ ] After each line, `silent` triggers the mic and the turn passes to the student.
- [ ] Speaking over the examiner (barge-in) cuts the face off immediately (`ClearBuffer`).
- [ ] End viva or closing the tab ends the session (check the dashboard minutes at app.simli.com).
- [ ] With ElevenLabs off, the line uses the browser voice and the static avatar with no errors.
- [ ] Repeat and Plain English replay through the face.
- [ ] The full viva completes; the recap appears; the lecturer report is created.

## 7. Risks
| Risk | Plan |
|---|---|
| Python 3.15 packages fail to install | Use 3.12 alongside (Step 0). |
| Audio stutters when all chunks are sent at once | Pace 6000-byte chunks at real time. |
| `silent` doesn't fire reliably | Safety timer based on the audio duration. |
| Latency: TTS fetch, decode, then Simli start | MP3s are cached, so repeats are instant. If it's slow, add a backend `?format=pcm16` option using ElevenLabs raw PCM output to skip the decode step (check the ElevenLabs `pcm_16000` output format first). |
| Free minutes run out before the demo | §5 habits; $10 Hobby as a backup. |
| Simli down on demo day | The S6 fallback keeps the viva fully working with the static avatar. |

## 8. Order and estimate
Step 0 (backend running) → S1 → S2 → S3 gives a talking examiner face in the existing viva screen (about 1 day). S4 turns it into a proper video call (about 1–1.5 days). S5 and S6 add polish (about half a day). Total: about 3 days.
