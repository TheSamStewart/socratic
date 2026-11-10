// Simli: turns the examiner's ElevenLabs audio into a live, lip-synced face (WebRTC).
// The backend mints a short-lived session token (/api/simli/token), so the API key never
// reaches the browser. Simli plays the voice itself, in sync with the video.
// Audio format Simli wants: raw PCM, signed 16-bit little-endian, 16 kHz, mono.

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const OFFLINE = process.env.NEXT_PUBLIC_DEMO_OFFLINE === "1";
/** NEXT_PUBLIC_FACE=off turns the video examiner off (saves Simli minutes while building). */
export const faceEnabled = () => !OFFLINE && process.env.NEXT_PUBLIC_FACE !== "off";

const SAMPLE_RATE = 16000;
const CHUNK_BYTES = 6000; // Simli docs: "chunks of about 6000 bytes work well"

export type FaceSession = {
  /** Speak an MP3 through the face. Resolves true when it has finished (or was interrupted), false if it could not play. */
  say(mp3: ArrayBuffer): Promise<boolean>;
  /** Barge-in: drop whatever the face is still saying. */
  interrupt(): void;
  close(): Promise<void>;
};

/** MP3 → 16 kHz mono Int16 PCM bytes, using the browser's own decoder. */
async function toPcm16(mp3: ArrayBuffer): Promise<{ bytes: Uint8Array; seconds: number }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decoded = await ctx.decodeAudioData(mp3.slice(0));
    const frames = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const mono = (await offline.startRendering()).getChannelData(0);
    const pcm = new Int16Array(mono.length);
    for (let i = 0; i < mono.length; i++) {
      const s = Math.max(-1, Math.min(1, mono[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return { bytes: new Uint8Array(pcm.buffer), seconds: decoded.duration };
  } finally {
    ctx.close().catch(() => {});
  }
}

/** Connects a Simli face to the given elements. Rejects if Simli is not configured or fails to start. */
export async function openFace(video: HTMLVideoElement, audio: HTMLAudioElement): Promise<FaceSession> {
  const res = await fetch(`${API}/api/simli/token`, { method: "POST" });
  if (!res.ok) throw new Error(`Simli token: HTTP ${res.status}`);
  const { session_token } = (await res.json()) as { session_token?: string };
  if (!session_token) throw new Error("Simli token missing");

  // Loaded only when a call starts, so the SDK never runs on the server or bloats other pages.
  const { SimliClient, LogLevel } = await import("simli-client");
  const client = new SimliClient(session_token, video, audio, null, LogLevel.ERROR);

  let closed = false;
  let pending: ((ok: boolean) => void) | null = null;
  let heardSpeaking = false;
  const settle = (ok: boolean) => { const p = pending; pending = null; p?.(ok); };

  client.on("speaking", () => { heardSpeaking = true; });
  client.on("silent", () => { if (heardSpeaking) settle(true); });
  client.on("stop", () => { closed = true; settle(false); });
  client.on("error", () => settle(false));

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Simli start timed out")), 15000);
    client.on("startup_error", (m) => { clearTimeout(t); reject(new Error(`Simli startup: ${m}`)); });
    client.start().then(() => { clearTimeout(t); resolve(); }, (e) => { clearTimeout(t); reject(e); });
  });

  const close = async () => {
    if (closed) return;
    closed = true;
    settle(true);
    window.removeEventListener("pagehide", onHide);
    try { await client.stop(); } catch { /* ignore */ }
  };
  // Closing the tab must end the session, or it keeps spending free minutes until maxIdleTime.
  const onHide = () => { void close(); };
  window.addEventListener("pagehide", onHide);

  return {
    async say(mp3) {
      if (closed) return false;
      let pcm: { bytes: Uint8Array; seconds: number };
      try { pcm = await toPcm16(mp3); } catch { return false; }
      if (closed) return false;
      settle(true); // a new line replaces any unfinished one
      heardSpeaking = false;
      return new Promise<boolean>((resolve) => {
        // Safety net in case "silent" never arrives: audio length + start-up latency.
        const t = setTimeout(() => settle(true), pcm.seconds * 1000 + 4000);
        pending = (ok) => { clearTimeout(t); resolve(ok); };
        for (let i = 0; i < pcm.bytes.length; i += CHUNK_BYTES) client.sendAudioData(pcm.bytes.subarray(i, i + CHUNK_BYTES));
      });
    },
    interrupt() {
      if (closed) return;
      try { client.ClearBuffer(); } catch { /* ignore */ }
      settle(true);
    },
    close,
  };
}
