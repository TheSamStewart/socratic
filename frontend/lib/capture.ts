// Demo capture: record the viva tab and grab stills, saved by the backend into captures/.
// Only used when the viva is opened with ?capture=1. Chrome/Edge (getDisplayMedia + MediaRecorder).
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let frameVideo: HTMLVideoElement | null = null;
let stopping: Promise<Blob | null> | null = null;
let mic: MediaStream | null = null;
let mixer: AudioContext | null = null;

/** True when the student's microphone is mixed into the recording. */
export const micIncluded = () => mic !== null;

/** Mix the tab's audio (examiner) and the student's mic into one track for the recording. */
async function mixedAudio(tab: MediaStream): Promise<MediaStreamTrack[]> {
  try {
    // Echo cancellation keeps the examiner's voice from the speakers out of the mic.
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    mic = null; // no mic or permission refused: record the tab audio only
  }
  const sources = [tab, mic].filter((s): s is MediaStream => !!s && s.getAudioTracks().length > 0);
  if (sources.length === 0) return [];
  if (sources.length === 1) return sources[0].getAudioTracks();
  mixer = new AudioContext();
  void mixer.resume();
  const out = mixer.createMediaStreamDestination();
  for (const s of sources) mixer.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(out);
  return out.stream.getAudioTracks();
}

export const captureRequested = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("capture") === "1";

export const capturing = () => stream !== null;

const pickType = () =>
  ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

/** Ask to share this tab (must run inside a click), then start recording. onEnded fires if sharing stops. */
export async function startCapture(onEnded: () => void): Promise<boolean> {
  if (stream) return true;
  if (!navigator.mediaDevices?.getDisplayMedia) return false;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true, // Chrome offers "Also share tab audio": the examiner's voice
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as DisplayMediaStreamOptions);
  } catch {
    stream = null;
    return false;
  }
  // Hidden player to read still frames from.
  frameVideo = document.createElement("video");
  frameVideo.muted = true;
  frameVideo.playsInline = true;
  frameVideo.srcObject = stream;
  void frameVideo.play().catch(() => {});

  chunks = [];
  const recorded = new MediaStream([...stream.getVideoTracks(), ...(await mixedAudio(stream))]);
  try {
    recorder = new MediaRecorder(recorded, { mimeType: pickType() || undefined, videoBitsPerSecond: 6_000_000 });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.start(1000);
  } catch {
    recorder = null; // stills still work without a recording
  }
  stream.getVideoTracks()[0]?.addEventListener("ended", onEnded, { once: true });
  return true;
}

/** One PNG of the shared tab, as it looks right now. */
export async function grabFrame(): Promise<Blob | null> {
  if (!stream) return null;
  // Chrome/Edge: read a frame straight from the shared tab's track (not throttled like a hidden <video>).
  const track = stream.getVideoTracks()[0];
  const IC = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { grabFrame: () => Promise<ImageBitmap> } }).ImageCapture;
  if (track && IC) {
    try {
      const bmp = await new IC(track).grabFrame();
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d")?.drawImage(bmp, 0, 0);
      bmp.close();
      const png = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
      if (png) return png;
    } catch { /* fall back to the hidden video below */ }
  }
  const v = frameVideo;
  if (!v) return null;
  if (!v.videoWidth) await new Promise((r) => setTimeout(r, 200));
  if (!v.videoWidth) return null;
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d")?.drawImage(v, 0, 0);
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

/** Stop sharing and return the recording (null if nothing was recorded). Safe to call twice. */
export function stopCapture(): Promise<Blob | null> {
  if (stopping) return stopping;
  const s = stream;
  const r = recorder;
  stopping = new Promise<Blob | null>((resolve) => {
    const finish = () => {
      s?.getTracks().forEach((t) => t.stop());
      mic?.getTracks().forEach((t) => t.stop());
      void mixer?.close();
      mic = null; mixer = null;
      const blob = chunks.length ? new Blob(chunks, { type: chunks[0].type || "video/webm" }) : null;
      stream = null; recorder = null; chunks = []; frameVideo = null;
      resolve(blob);
    };
    if (r && r.state !== "inactive") { r.onstop = finish; r.stop(); }
    else finish();
  }).finally(() => { stopping = null; });
  return stopping;
}

/** Send a capture to the backend, which saves it in captures/. Returns the saved file name. */
export async function uploadCapture(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, blob.type.startsWith("image/") ? "frame.png" : "call.webm");
  const res = await fetch(`${API}/api/capture`, { method: "POST", body: form });
  if (!res.ok) throw new Error(res.status === 404 ? "Saving is off: set CAPTURE_DIR on the backend" : `Save failed (HTTP ${res.status})`);
  return ((await res.json()) as { saved: string }).saved;
}
