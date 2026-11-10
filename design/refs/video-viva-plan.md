# Video-call viva: a face for the AI examiner

Status: plan only. Owner: Sam (frontend). Backend requests for Ebube and Hamid are marked **[backend ask]**.
Date: 9 Nov 2026. Builds on `talking-tutor-plan.md`, which covers the lip-sync engine and compares avatar vendors. This plan does not repeat that comparison.

## 1. Goal

The viva should feel like a short video call with an examiner, not like a chat window:

- A pre-call check: camera, mic and speakers, then "Join viva".
- A call screen: the examiner's face fills the main tile and moves its mouth in time with the voice, with live captions underneath.
- The student sees an optional small self-view tile, as in Teams or Zoom.
- Call controls along the bottom.

It must stay honest (clearly an AI examiner), fair (nothing is inferred from the student's face), and work without a camera, without sound and in text-only mode.

## 2. What we can reuse

| Piece | Where | Reuse |
|---|---|---|
| Turn loop: speak, open the mic, auto-send after a pause, barge-in | `ChatPanel.tsx`, `Composer.tsx` | As is. The call screen is a new layout over the same state machine (`phase`: idle / thinking / speaking / listening). |
| TTS: ElevenLabs via `/api/tts`, with a browser-voice fallback | `lib/speech.ts`, `backend/app/tts.py` | Change `speak()` to return a handle (audio element + done promise) so the face can listen to the audio. |
| Examiner and Max avatars, idle / speaking / listening / thinking | `components/Avatar.tsx` | Replaced on the call screen by `ExaminerFace`. Kept for small chat bubbles. |
| Lip-sync design (`Mouth` stream, amplitude + visemes) | `talking-tutor-plan.md` §5.2 | Build it as written. This plan uses it as the input to the face. |
| Soft timer, recap, lecturer report | `ChatPanel.tsx`, viva page | Unchanged. The timer moves into the call header. |

## 3. The experience

### 3.1 Pre-call ("green room") at `/submit/viva/[id]`
- **Examiner preview:** the examiner's face, idle and blinking, with the label "AI examiner".
- **Mic check:** a live level meter, via `getUserMedia({ audio })` and a WebAudio analyser.
- **Speaker check:** a "Play test sound" button. This click also unlocks autoplay, replacing today's "Start conversation" step.
- **Camera:** off by default, with a toggle. When it's on, the student sees their own preview and the line "Your camera is only shown to you. It is never recorded, sent or analysed."
- **Choices:** captions (on by default), voice or text mode, and Plain English.
- **Join viva:** the primary button.

### 3.2 In call
```
┌──────────────────────────────────────────────────────────────┐
│ Viva · Research Methods essay      ● Live   4:12 left   [≡]  │
├──────────────────────────────────────────┬───────────────────┤
│                                          │ Transcript        │
│          [ Examiner face, large ]        │ (drawer, closed   │
│            AI examiner · speaking        │  by default)      │
│                                          │                   │
│   "Why did you choose a mixed-methods…"  │ Topics covered    │
│                                ┌──────┐  │ ● Sampling  ✓     │
│                                │ you  │  │ ● Validity  …     │
│                                └──────┘  │                   │
├──────────────────────────────────────────┴───────────────────┤
│  [Mic]  [Camera]  [CC]  [Repeat]  [Plain English]  [Text]  [End viva] │
└──────────────────────────────────────────────────────────────┘
```
- **Main tile:** a dark neutral stage (not black), with the examiner centred at about 320–420 px. A thin blue border shows while the examiner speaks, and a green one while the student speaks (with the mic meter). A soft breathing animation and a small head tilt show "thinking".
- **Captions:** a bottom overlay with the current word highlighted when timestamps are available (`talking-tutor-plan.md` M4).
- **Self-view:** a picture-in-picture tile in the bottom right, mirrored, and hidden when the camera is off. It shows the student's initials when the camera is off, like a real call.
- **Controls:** mute / unmute (pauses listening), camera, captions, Repeat question, Plain English (the existing `rephrase`), switch to text, and End viva with a confirm step. End goes to the existing recap.
- **Side panel:** the transcript and topics covered, collapsible. Below 900 px it becomes a bottom sheet.
- **Connection-style status:** "Examiner is thinking…" or "Your turn, take your time". The timer stays soft and never cuts the student off.

### 3.3 Max in the viva
When the backend switches to `teach_max`, Max "joins the call" as a second tile next to the examiner, and becomes the active speaker. Max leaves when the mode returns to `viva`. This reuses the existing `whoFor()` logic.

## 4. How the face works

### 4.1 One interface, swappable engines
```ts
// frontend/lib/face.ts
type Mouth = { open: number; shape: "rest" | "A" | "E" | "O" | "M" | "F" };   // from lipsync.ts
type FaceState = "idle" | "listening" | "thinking" | "speaking";
interface FaceEngine {
  mount(el: HTMLElement, who: "examiner" | "max"): void;
  setState(s: FaceState): void;
  setMouth(m: Mouth): void;   // called every animation frame while speaking
  unmount(): void;
}
```
`ExaminerFace.tsx` picks an engine from `NEXT_PUBLIC_FACE` (`2d` | `3d` | `stream`). The call screen only knows about this interface, so each tier can be added without touching the call UI.

### 4.2 Tiers

| Tier | Engine | What it looks like | Cost and dependencies | When |
|---|---|---|---|---|
| **1. 2D (default)** | SVG `ExaminerFace`: blink, brows, gaze drift, head bob, mouth shapes driven by `Mouth` | A stylised examiner with clear expressions, on brand | Free, no new dependencies | Build now (hackathon demo) |
| **2. 3D** | TalkingHead (Three.js + a stylised GLB), viseme blend shapes from the same `Mouth` / alignment | A semi-realistic 3D head that looks at the camera and nods | New dependencies `three` and `@met4citizen/talkinghead`, about 1 MB, lazy-loaded on the call page only. **Ask the team first.** | Stretch, behind the flag |
| **3. Streamed video avatar** | A vendor renders a photoreal face and streams it over WebRTC (Tavus, HeyGen LiveAvatar, Anam or Simli); we send it the examiner's text | Looks like a real video call | Per-minute pricing, a new data processor, and the student's audio may leave our servers | **Spike only.** Needs a data-protection review and university procurement before any pilot |

Why tier 1 first: it reuses everything we have, adds nothing to the bundle or vendor list, and an obviously-not-human examiner lowers stress and keeps the "AI examiner" honest. Tier 2 is the "wow" upgrade for the demo if time allows. Tier 3 changes the privacy story, so it stays a documented option.

### 4.3 Making it feel live (latency)
The gap between the student finishing and the examiner starting is what breaks the call illusion. Today's chain is speech-to-text, then `chat()` (Claude), then `/api/tts`, then play.
- **Frontend, now:** start "thinking" body language the moment the student stops talking, such as a nod or an "mm" acknowledgement from a few pre-cached short clips. This covers about 1–2 s.
- **[backend ask] Ebube, `tts.py`:** a sentence-chunked or streaming TTS so the first sentence plays while the rest is generated. Use ElevenLabs streaming with timestamps, which also feeds captions and visemes (`talking-tutor-plan.md` §5.5).
- **[backend ask] Hamid:** optionally stream the examiner's reply (Server-Sent Events) so TTS can start on the first sentence. This is additive and must be agreed as a contract change.
- **Target:** under 2.5 s from end of the student's speech to first examiner audio, with visible "thinking" from 0 s.

## 5. Guardrails (non-negotiable)

- **No analysis of the student's video or face.** The camera is a local self-view only: no recording, no upload, no emotion, attention or "engagement" detection. Emotion recognition in education is banned under the EU AI Act (Art. 5(1)(f)), and in the UK, facial data is special-category data under UK GDPR. It also contradicts "prove it, don't police it".
- **Camera is optional and off by default.** It never affects the outcome. The lecturer report contains the transcript and evidence only.
- **Always labelled "AI examiner"** in the tile name and the pre-call screen, even in tier 3.
- **Accessibility:**
  - captions on by default
  - full keyboard control of every call button
  - `aria-live` captions
  - reduced motion gives a still face (mouth only, no head motion)
  - no flashing (WCAG 2.3.1)
  - text mode gives the same viva without audio or video
- **Stress:** the student can pause, ask for a repeat, or switch to text at any time without penalty. The timer is a guide only.

## 6. Milestones

| # | Deliverable | Files (Sam unless marked) | Est. |
|---|---|---|---|
| V1 | `speak()` returns a handle; `lipsync.ts` amplitude path | `lib/speech.ts`, `lib/lipsync.ts` | 0.5 day |
| V2 | `ExaminerFace` 2D (tier 1): blink, gaze, states, mouth from `Mouth` | `components/ExaminerFace.tsx`, `lib/face.ts` | 1 day |
| V3 | Pre-call screen: device checks, camera preview, audio unlock, Join | `components/call/PreCall.tsx`, viva page | 0.5 day |
| V4 | Call stage: main tile, captions overlay, self-view picture-in-picture, control bar, transcript drawer, End → recap | `components/call/CallStage.tsx`; `ChatPanel` state reused (extract a `useVivaConversation` hook) | 1.5 days |
| V5 | Max joins as a second tile in `teach_max` mode | `CallStage.tsx` | 0.5 day |
| V6 | "Thinking" fillers (nod plus short cached acknowledgements) | `lib/face.ts`, `public/audio/` | 0.5 day |
| V7 | **[backend ask]** timed and streaming TTS, then word-highlighted captions and visemes | Ebube `tts.py`, Hamid `main.py`; Sam captions | 0.5 day + backend |
| V8 (stretch) | Tier 2 TalkingHead behind `NEXT_PUBLIC_FACE=3d` | New dependencies, needs team OK | 2 days |
| V9 (spike) | Tier 3 adapter prototype with one vendor on a test account, plus cost per student-minute and a data-flow write-up | Spike branch only, never main | 1 day |

Order: V1 → V2 → V3 → V4 gives a demo-ready video viva with no backend changes. V5–V7 polish it. V8 and V9 are optional.

## 7. Test plan
- **Browsers:** Chrome, Edge, Safari and Firefox.
  - Camera allowed, denied and absent.
  - Mic denied, which drops to text mode with a clear message.
  - ElevenLabs on and off.
- **Sync:** the mouth visibly follows the audio with ElevenLabs. With the browser voice, it pulses per word.
- **Latency:** log end-of-speech → first audio in dev. Check against the 2.5 s target over 10 turns.
- **Privacy check:** in DevTools, confirm no video track is ever added to a network request or stored. The camera light goes off on End or leave.
- **Accessibility:** keyboard-only run, screen reader announces captions, reduced motion respected.
- **Regression:** the viva still completes, the recap shows, the assessment moves to `awaiting_review`, and the lecturer is notified.

## 8. Risks

| Risk | Mitigation |
|---|---|
| The face feels uncanny or distracting under assessment stress | Stylised tier 1 by default. One-click "Hide examiner" leaves the captions only. |
| Students assume the camera is being judged | Off by default, plus the explicit "never recorded, sent or analysed" line on the pre-call screen and in the call. |
| Latency breaks the illusion | Thinking body language at 0 s, cached fillers, streaming TTS (V7). |
| The new call layout duplicates `ChatPanel` logic | Extract the turn loop into a `useVivaConversation` hook first. `ChatPanel` and `CallStage` both use it. |
| Bundle size (tier 2) | Lazy-load on the viva page only, behind a flag. |
| Vendor cost, lock-in and data protection (tier 3) | Adapter interface, spike only, data-protection review before any pilot. |

## 9. Decisions needed from the team
1. Is tier 1 (stylised 2D examiner) acceptable for the demo, with tier 2 as a stretch?
2. Can we add `three` and `@met4citizen/talkinghead` if we get to V8?
3. Ebube and Hamid: will you take on the timed or streaming TTS endpoint (V7)? It's additive to the contract.
4. Should the examiner keep the navy-circle identity, or get a more human-like (but still clearly illustrated) face?
