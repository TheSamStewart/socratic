// Text to speech for the Examiner and Max.
// 1. ElevenLabs through the backend (/api/tts, key stays server side).
// 2. If that is unavailable (no key, 503, timeout, offline), the browser's own voice.
// 3. If neither works, text only. Captions are always on screen anyway.

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const OFFLINE = process.env.NEXT_PUBLIC_DEMO_OFFLINE === "1";

export type Speaker = "examiner" | "max";
export type VoiceSource = "elevenlabs" | "browser" | "none";

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let finishCurrent: (() => void) | null = null;
let generation = 0;
// After ElevenLabs fails, skip it for a while so every turn isn't delayed by a failing request.
let elevenDownUntil = 0;
let lastSource: VoiceSource = "none";

export const lastVoiceSource = () => lastSource;

/**
 * Video examiner: when a face is connected (Simli), the examiner's ElevenLabs audio is spoken
 * through it instead of a plain <audio>, so lips and voice stay in sync. Max keeps the normal path.
 */
export type FaceSink = { say(mp3: ArrayBuffer): Promise<boolean>; interrupt(): void };
let faceSink: FaceSink | null = null;
export function setFaceSink(sink: FaceSink | null) { faceSink = sink; }

const synth = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

/** Stops whatever is playing and resolves the pending speak() call. */
export function stopSpeaking() {
  generation++;
  try { faceSink?.interrupt(); } catch { /* ignore */ }
  try { currentAudio?.pause(); } catch { /* ignore */ }
  currentAudio = null;
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  try { synth()?.cancel(); } catch { /* ignore */ }
  const f = finishCurrent;
  finishCurrent = null;
  f?.();
}

/**
 * Browsers block audio until the user interacts with the page. Call this from a click handler
 * (e.g. "Start conversation") so later speak() calls are allowed to play.
 */
export function unlockAudio() {
  try {
    const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
    a.volume = 0;
    a.play().catch(() => {});
  } catch { /* ignore */ }
  try {
    const s = synth();
    if (s) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; s.speak(u); }
  } catch { /* ignore */ }
}

export const canSpeakInBrowser = () => !!synth();

/* ---------- ElevenLabs ---------- */
async function speakEleven(text: string, voice: Speaker, gen: number): Promise<boolean> {
  if (OFFLINE || Date.now() < elevenDownUntil) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  let blob: Blob;
  try {
    const res = await fetch(`${API}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: ctrl.signal,
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("audio")) {
      elevenDownUntil = Date.now() + 60_000;
      return false;
    }
    blob = await res.blob();
  } catch {
    elevenDownUntil = Date.now() + 30_000;
    return false;
  } finally {
    clearTimeout(t);
  }
  if (gen !== generation) return true; // stopped while loading: count as handled, say nothing

  // Through the video examiner's face when one is connected; if it can't play, fall through to plain audio.
  const sink = faceSink;
  if (sink && voice === "examiner") {
    const buf = await blob.arrayBuffer();
    if (gen !== generation) return true;
    const ok = await new Promise<boolean>((resolve) => {
      const settle = () => { if (finishCurrent === settle) finishCurrent = null; resolve(true); };
      finishCurrent = settle;
      sink.say(buf).then((r) => { if (finishCurrent === settle) finishCurrent = null; resolve(r); });
    });
    if (ok || gen !== generation) return true;
  }

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentUrl = url;
  return new Promise<boolean>((resolve) => {
    const done = (ok: boolean) => {
      if (finishCurrent === settle) finishCurrent = null;
      if (currentUrl === url) { URL.revokeObjectURL(url); currentUrl = null; }
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };
    const settle = () => done(true);
    finishCurrent = settle;
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    // NotAllowedError = autoplay blocked: report failure so the browser voice can try (it may be blocked too).
    audio.play().catch(() => done(false));
  });
}

/* ---------- Browser voice ---------- */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const now = s.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(s.getVoices()), 1200);
    s.addEventListener("voiceschanged", () => { clearTimeout(t); resolve(s.getVoices()); }, { once: true });
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], who: Speaker) {
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang));
  const gb = en.filter((v) => /GB/i.test(v.lang));
  const pool = gb.length ? gb : en.length ? en : voices;
  // Prefer the higher-quality network voices where the browser has them.
  const rank = (v: SpeechSynthesisVoice) => (/(natural|neural|online|google)/i.test(v.name) ? 0 : 1);
  const sorted = [...pool].sort((a, b) => rank(a) - rank(b));
  const male = sorted.filter((v) => /(male|daniel|george|ryan|guy|thomas|arthur|oliver)/i.test(v.name) && !/female/i.test(v.name));
  const female = sorted.filter((v) => /(female|libby|sonia|hazel|susan|serena|martha|kate|emma)/i.test(v.name));
  // Max sounds different from the examiner even when only one voice exists (pitch/rate below).
  if (who === "max") return male[0] ?? sorted[1] ?? sorted[0] ?? null;
  return female[0] ?? sorted[0] ?? null;
}

/** Chrome cuts long utterances off after ~15 s, so speak sentence by sentence. */
const chunks = (text: string) =>
  (text.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) ?? [text]).map((c) => c.trim()).filter(Boolean);

async function speakBrowser(text: string, who: Speaker, gen: number): Promise<boolean> {
  const s = synth();
  if (!s) return false;
  const voice = pickVoice(await loadVoices(), who);
  if (gen !== generation) return true;
  s.cancel();
  return new Promise<boolean>((resolve) => {
    const parts = chunks(text);
    let i = 0;
    let started = false;
    const finish = (ok: boolean) => {
      if (finishCurrent === stop) finishCurrent = null;
      resolve(ok);
    };
    const stop = () => finish(true);
    finishCurrent = stop;
    const next = () => {
      if (gen !== generation) return finish(true);
      if (i >= parts.length) return finish(true);
      const u = new SpeechSynthesisUtterance(parts[i++]);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
      u.rate = who === "max" ? 1.06 : 0.98;
      u.pitch = who === "max" ? 1.15 : 1.0;
      u.onstart = () => { started = true; };
      u.onend = () => next();
      u.onerror = (e) => {
        // "interrupted"/"canceled" come from stopSpeaking(): not a failure.
        if (e.error === "interrupted" || e.error === "canceled") return finish(true);
        finish(started);
      };
      s.speak(u);
    };
    next();
  });
}

/**
 * Speak a line. Resolves when it has finished (or was stopped). Never throws.
 * Returns which voice was used, so the UI can say so.
 */
export async function speak(text: string, who: Speaker): Promise<VoiceSource> {
  stopSpeaking();
  const gen = generation;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "none";
  if (await speakEleven(clean, who, gen)) return (lastSource = "elevenlabs");
  if (gen !== generation) return lastSource;
  if (await speakBrowser(clean, who, gen)) return (lastSource = "browser");
  return (lastSource = "none");
}
