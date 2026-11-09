# Talking tutor: a visual, spoken conversation with Max and the Examiner

Status: plan only. Covers just this feature. Owner: Sam (frontend). Backend asks for Ebube and Hamid are marked below.
Research date: 9 Nov 2026. Vendor numbers come mostly from vendor or competitor blogs, so treat them as rough.

## 1. Goal

A student opens Teach Max or a viva and has a real back-and-forth conversation with an animated character. They see Max's face, it moves its mouth in time with the voice, and when Max stops it is visibly the student's turn. It must stay honest (Max is an AI study partner, not a person), cheap enough for a whole cohort, and accessible (captions are always on, it works without the face, and it works with reduced motion).

## 2. What already exists (sams/socratic-redesign)

| Piece | Where | State |
|---|---|---|
| ElevenLabs TTS with a browser-voice fallback | `frontend/lib/speech.ts`, `backend/app/tts.py`, `POST /api/tts` | Works. Falls back to the browser voice when there's no key. |
| Hands-free turn loop: speak, open the mic, auto-send after a pause, barge-in | `components/ChatPanel.tsx`, `components/Composer.tsx` | Works in Chrome/Edge (Web Speech API). |
| Animated avatar with idle / speaking / listening / thinking states | `components/Avatar.tsx` | SVG with a looping mouth. **Not synced to the audio.** |

So the conversation loop is done. What's missing is a face that's actually driven by the speech, plus a stage that makes the face the centre of the screen.

## 3. Options explored

| Option | How it works | Latency | Cost | Fit |
|---|---|---|---|---|
| **A. 2D character, audio-driven lip sync** (Rive or SVG) | WebAudio `AnalyserNode` on the TTS audio sets mouth openness every frame. ElevenLabs `/with-timestamps` gives character timings for exact captions and rough visemes. | None added (runs locally) | Free. Only the ElevenLabs time we already pay for. | **Best fit.** Matches the hex brand, is clearly not a human, needs no new vendor. |
| **B. 3D head in the browser** ([TalkingHead](https://github.com/met4citizen/TalkingHead), Three.js + GLB avatar) | Word timestamps go to TalkingHead's lip-sync module, which drives viseme blend shapes. Idle motion, blinking and gestures are built in. | None added | Free library. Needs a stylised GLB model and new dependencies (`three`, `@met4citizen/talkinghead`), roughly 1 MB or more of JS. | Good stretch goal. More "wow", heavier, and the team has to agree to the new dependencies. |
| **C. Hosted photoreal real-time avatar** (Tavus CVI, HeyGen LiveAvatar, Anam, D-ID, Simli) | The vendor renders video and streams it over WebRTC. We send text or audio. | About 0.6 to 2 s, as reported by vendors | Subscription plus per-minute usage. Costs grow with every student-minute. | **Not for v1.** Student speech goes to another processor (UK GDPR, university procurement). A realistic human face blurs the "AI study partner" honesty. Vendor lock-in. |

## 4. Recommendation

Build **A now** and keep **B as a feature-flagged stretch**. Write down **C** as an option for a paid "premium viva" pilot after a data-protection review, not as the default.

Why A first: it reuses everything in section 2, adds no vendor and no new npm dependencies (SVG first, Rive later if we want richer animation), keeps student audio on our side, and looks like Socratic (Max as a friendly hex character). Lip sync from audio amplitude is good enough for a stylised face. Timestamps make the captions exact.

## 5. Design

### 5.1 Stage layout (voice mode)
- The face is large in the centre (about 240 px). The caption sits under it, with the current word highlighted. The full transcript is a collapsible drawer on the right.
- Turn indicator: a blue ring while the AI speaks, a green ring plus a live mic level while the student speaks, three-dot breathing while it's thinking.
- Controls: Start / Pause, Skip to my turn, Replay, Plain English (viva), Text mode.
- Max and the Examiner look different. Max is a blue hex with a playful face. The Examiner is a calm navy circle, which carries over from `Avatar.tsx`.
- A small "AI study partner" label is always visible. Nothing claims to be human.

### 5.2 Lip-sync engine (`frontend/lib/lipsync.ts`)
```
type Mouth = { open: number /*0..1*/, shape: "rest"|"A"|"E"|"O"|"M"|"F" };
createLipSync(source): { subscribe(cb: (m: Mouth, wordIndex: number) => void), stop() }
```
- **ElevenLabs path:** `speak()` returns its `HTMLAudioElement`. Use `createMediaElementSource`, then an `AnalyserNode`, and turn RMS into `open` with smoothing (attack 40 ms, release 90 ms). If alignment is present, map the character at `audio.currentTime` to a coarse viseme `shape` and a `wordIndex` for the captions.
- **Browser-voice path:** there's no audio stream to analyse. Use `SpeechSynthesisUtterance.onboundary` (word events) to pulse `open`, and use the word text for the shape. This is weaker, but it still moves in time.
- **Reduced motion or the face turned off:** emit `rest` only. The captions still work.

### 5.3 Face (`frontend/components/TutorFace.tsx`)
- SVG first: eyes (blink every 3 to 6 s at random), brows (raised while listening), and a mouth path picked by `shape` and scaled by `open`. One component, two skins (Max, Examiner).
- Swap to a Rive file later if we want richer motion. That needs `@rive-app/react-canvas`, a new dependency, so ask first.

### 5.4 Speech changes (`frontend/lib/speech.ts`)
- `speak()` returns `{ source, audio?: HTMLAudioElement, alignment?, done: Promise }` instead of a bare promise, so the stage can attach the lip sync.
- Try `/api/tts/timed` first. If it returns 404, use `/api/tts` (amplitude only). After that, the browser voice.

### 5.5 Backend (not Sam's files: send these as requests)
- **Ebube, `backend/app/tts.py`:** add `synthesize_timed(text, voice) -> (mp3_bytes, alignment)` using ElevenLabs `POST /v1/text-to-speech/{voice_id}/with-timestamps`. It returns base64 audio plus character start/end times. Cache the JSON next to the mp3, using the same key scheme.
- **Hamid, `backend/app/main.py`:** add `POST /api/tts/timed` returning `{ audio_b64, mime: "audio/mpeg", alignment: { characters: string[], starts: number[], ends: number[] } }`, with 503 on failure like `/api/tts`. This adds to the shared contract, so agree it in Discord first. `/api/tts` stays unchanged.

### 5.6 Listening (later, optional)
- Web Speech recognition works only in Chrome and Edge. For Safari and Firefox, a streaming speech-to-text service (for example ElevenLabs or Deepgram) behind a backend WebSocket would cover the gap. That's a separate decision, because student audio would then leave the browser.
- Use voice-activity detection (WebAudio energy threshold) to show a live mic meter on the stage, and to barge in faster than the recogniser's own events.

## 6. Milestones

| # | Deliverable | Est. | Done when |
|---|---|---|---|
| M1 | `TutorFace` SVG with blink, and states mapped from `Avatar.tsx` | 0.5 day | Max and the Examiner render in all four states, and reduced motion gives a static face. |
| M2 | `lipsync.ts` amplitude path + `speak()` returns a handle | 0.5 day | With ElevenLabs on, the mouth visibly follows the speech. With the browser voice, it pulses per word. |
| M3 | Voice-mode stage layout in ChatPanel (face centre, caption, transcript drawer) | 1 day | It fills the screen at 1440 px and degrades to a stacked layout below 900 px. |
| M4 | `/api/tts/timed` backend (Ebube + Hamid) + word-highlighted captions | 0.5 day + backend | The highlighted word stays within about 100 ms of the audio. Falls back cleanly when the endpoint is missing. |
| M5 | Coarse visemes from the alignment | 0.5 day | A, E, O, M and F shapes are visible on slow speech. |
| M6 (stretch) | TalkingHead 3D behind `NEXT_PUBLIC_FACE=3d` | 2 days | Same `Mouth` stream drives the 3D model. Bundle is lazy-loaded only in voice mode. |

## 7. Test plan
- Manual in Chrome, Edge, Safari and Firefox: ElevenLabs on, ElevenLabs off (browser voice), mic denied, reduced motion, Text mode.
- Latency: from the end of the student's speech to the first audio, aim for under 2.5 s. Log the phase timings to the console in dev.
- Accessibility: captions on at all times, focus order through the controls, `aria-live` on caption changes, no flashing (WCAG 2.3.1), and contrast checked on the stage.
- Regression: the viva still completes end-to-end, recap appears, and the lecturer report is created.

## 8. Risks
| Risk | Mitigation |
|---|---|
| Autoplay blocked | Already handled: Start conversation click plus `unlockAudio()`. |
| Mouth out of sync with the browser voice | It's a stylised face, so word-pulses are acceptable. Prefer ElevenLabs for demos. |
| The face distracts in a viva (assessment stress) | Off by default in viva, on by default in Teach Max. One-click toggle. |
| Cost creep if we move to option C | Keep C behind a per-module flag. Price it per student-minute before any pilot. |
| Contract change friction | `/api/tts/timed` is additive. The frontend detects 404 and falls back. |

## Sources
- [Live avatar landscape: 10 providers compared (Medium)](https://medium.com/@ggarciabernardo/the-live-avatar-landscape-apis-transport-and-subjective-evaluation-of-10-leading-providers-5b5b6e8a54dc)
- [Anam: real-time avatar APIs compared](https://anam.ai/compare) and [D-ID API review](https://anam.ai/blog/d-id-api-review-2025-architecture-capabilities) (competitor-authored)
- [HeyGen: best real-time AI avatar platforms](https://www.heygen.com/blog/best-real-time-ai-avatar-platforms) (vendor-authored)
- [Docket: how they chose between HeyGen, Tavus, Anam and Simli](https://docket.io/blog/heygen-vs-tavus-vs-anam-vs-simli-how-we-chose-dockets-ai-avatar-provider)
- [ElevenLabs streaming TTS with timestamps (SDK example)](https://tryagi.github.io/ElevenLabs/examples/streaming-text-to-speech-with-timestamps)
- [OpenHuman: TTS / lip-sync integration guide](https://humandeveloper.pages.dev/tts-lipsync-integration) (small unverified site)
- [TalkingHead (3D) README](https://unpkg.com/@met4citizen/talkinghead@1.7.0/README.md)
