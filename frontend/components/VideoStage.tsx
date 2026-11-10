"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Captions, CaptionsOff, Languages, Loader2, PhoneOff, RotateCcw, SkipForward, Video, VideoOff } from "lucide-react";
import Avatar, { type AvatarState } from "./Avatar";
import { PrimaryButton } from "./ui";
import { faceEnabled, openFace, type FaceSession } from "@/lib/simli";
import { setFaceSink, unlockAudio } from "@/lib/speech";
import { captureRequested, grabFrame, micIncluded, startCapture, stopCapture, uploadCapture } from "@/lib/capture";

/** Capture status goes in the tab title: anything drawn on the page would end up in the capture. */
let baseTitle = "";
function titleNote(text: string | null, ms = 0) {
  if (typeof document === "undefined") return;
  if (!baseTitle) baseTitle = document.title.replace(/^[●✓✗][^|]*\| /, "");
  document.title = text ? `${text} | ${baseTitle}` : baseTitle;
  if (ms) setTimeout(() => { if (document.title.startsWith(text ?? "")) document.title = baseTitle; }, ms);
}

type Phase = "idle" | "thinking" | "speaking" | "listening";
type FaceStatus = "off" | "connecting" | "live" | "failed" | "ended";

/** Round dark call-bar button (Teams/Zoom style). */
function CallButton({ label, onClick, active = false, disabled = false, children }: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={active}
      className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors disabled:opacity-35 ${active ? "bg-white/25" : "bg-white/12 hover:bg-white/20"}`}>
      {children}
    </button>
  );
}

/**
 * The viva as a video call, voice first: the examiner's live face (Simli) fills the panel,
 * captions run over the video (examiner's line, then the student's words as they speak),
 * and a dark call bar holds the controls. The student's camera is an optional local
 * self-view only. If the face can't connect, the call carries on with the illustrated
 * examiner and the normal voice.
 */
export default function VideoStage({
  speaker, phase, started, finished, caption, draft, status, detail, canJoin, resumeLabel,
  onStart, onSkip, onPlainEnglish, error, onRetry, mic, leaveHref,
}: {
  speaker: "examiner" | "max";
  phase: Phase;
  started: boolean;
  finished: boolean;
  caption: string | null;
  /** What the student is saying right now (live speech recognition). */
  draft: string;
  status: string;
  detail: string;
  canJoin: boolean;
  resumeLabel: string;
  onStart: () => void;
  onSkip: () => void;
  onPlainEnglish?: () => void;
  error: string | null;
  onRetry?: () => void;
  /** The mic control (Composer, call variant). */
  mic: ReactNode;
  leaveHref: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selfRef = useRef<HTMLVideoElement>(null);
  const faceRef = useRef<FaceSession | null>(null);
  const camRef = useRef<MediaStream | null>(null);
  const [face, setFace] = useState<FaceStatus>("off");
  const [cam, setCam] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [cc, setCc] = useState(true);
  // Demo capture (?capture=1): records this tab and saves stills into captures/ via the backend.
  const [capOn, setCapOn] = useState(false);
  const [rec, setRec] = useState(false);
  const recRef = useRef(false); // live value for timers, key handlers and unmount
  const autoShot = useRef(false);
  useEffect(() => { setCapOn(captureRequested()); }, []);

  const saveFrame = async (why: string) => {
    const png = await grabFrame();
    if (!png) { titleNote("✗ No frame captured", 4000); return; }
    try {
      const name = await uploadCapture(png);
      console.info(`[capture] ${why}: saved captures/${name}`);
      titleNote(`✓ Saved ${name}`, 3000);
      setTimeout(() => { if (recRef.current) titleNote("● REC"); }, 3100);
    } catch (e) {
      titleNote(`✗ ${e instanceof Error ? e.message : "Save failed"}`, 6000);
    }
  };
  const finishCapture = async () => {
    // Leave, the end of the viva, unmount and "Stop sharing" can all land here: save once.
    if (!recRef.current) return;
    recRef.current = false;
    setRec(false);
    titleNote("… saving recording");
    const video = await stopCapture();
    if (!video) { titleNote(null); return; }
    try {
      const name = await uploadCapture(video);
      console.info(`[capture] recording saved: captures/${name}`);
      titleNote(`✓ Saved ${name}`, 5000);
    } catch (e) {
      titleNote(`✗ ${e instanceof Error ? e.message : "Save failed"}`, 8000);
    }
  };

  // Auto screenshot: the first time the student is mid-answer (8+ words of live caption).
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  useEffect(() => {
    if (!rec || autoShot.current || phase !== "listening" || words < 8) return;
    autoShot.current = true;
    const t = setTimeout(() => void saveFrame("student answering"), 300);
    return () => clearTimeout(t);
  }, [rec, phase, words]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shift+S: save a frame at any moment while recording.
  useEffect(() => {
    if (!rec) return;
    const onKey = (e: KeyboardEvent) => { if (e.shiftKey && e.key.toLowerCase() === "s" && !e.repeat) void saveFrame("Shift+S"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rec]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viva over: keep recording a few seconds for the closing line and recap, then save.
  useEffect(() => {
    if (!rec || !finished || phase === "speaking") return;
    const t = setTimeout(() => void finishCapture(), 4000);
    return () => clearTimeout(t);
  }, [rec, finished, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigating away mid-call still saves what was recorded.
  useEffect(() => () => { if (recRef.current) void finishCapture(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeFace = () => {
    setFaceSink(null);
    const f = faceRef.current;
    faceRef.current = null;
    void f?.close();
  };
  const stopCam = () => { camRef.current?.getTracks().forEach((t) => t.stop()); camRef.current = null; };

  // Leaving the page ends the call: face session closed (stops Simli minutes), camera light off.
  useEffect(() => () => { closeFace(); stopCam(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Viva over: hang up once the examiner has finished the last line.
  useEffect(() => {
    if (finished && face === "live" && phase !== "speaking") {
      const t = setTimeout(() => { closeFace(); setFace("ended"); }, 1500);
      return () => clearTimeout(t);
    }
  }, [finished, face, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    unlockAudio(); // must run inside the click
    // Capture mode: ask to share this tab now, while we still have the click.
    if (capOn && !rec) {
      const ok = await startCapture(() => void finishCapture());
      if (ok) { recRef.current = true; setRec(true); autoShot.current = false; titleNote(micIncluded() ? "● REC + mic" : "● REC (no mic)"); }
      else titleNote("✗ Tab sharing was cancelled, not recording", 5000);
    }
    if (faceEnabled() && videoRef.current && audioRef.current) {
      setFace("connecting");
      try {
        const f = await openFace(videoRef.current, audioRef.current);
        faceRef.current = f;
        setFaceSink(f);
        setFace("live");
      } catch (e) {
        console.warn("Video examiner unavailable:", e instanceof Error ? e.message : e);
        setFace("failed");
      }
    }
    onStart();
  };

  const toggleCam = async () => {
    if (cam) { stopCam(); setCam(false); return; }
    setCamErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false });
      camRef.current = s;
      setCam(true);
    } catch {
      setCamErr("Camera not available. The viva works fine without it.");
    }
  };
  useEffect(() => { if (cam && selfRef.current && camRef.current) selfRef.current.srcObject = camRef.current; }, [cam]);

  const live = face === "live";
  const showFace = live && speaker === "examiner";
  const avatarState: AvatarState = phase === "listening" ? "listening" : phase === "speaking" ? "speaking" : phase === "thinking" ? "thinking" : "idle";
  const ring = phase === "speaking" ? "shadow-[inset_0_0_0_3px_var(--color-accent)]" : phase === "listening" ? "shadow-[inset_0_0_0_3px_var(--color-green)]" : "";
  const listening = phase === "listening";
  const note = error ?? (face === "failed" ? "Video examiner unavailable, continuing with voice." : camErr);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-brand-ink text-white">
      {/* Main tile: fills the panel */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Simli renders here; kept mounted so the connection has its elements. */}
        <video ref={videoRef} autoPlay playsInline muted
          className={showFace ? "absolute inset-0 h-full w-full object-cover object-[50%_28%]"
            : live && speaker === "max" ? "absolute right-4 top-4 z-10 h-28 w-40 rounded border border-white/25 bg-black object-cover object-[50%_28%]"
            : "invisible absolute"} />
        <audio ref={audioRef} autoPlay />

        {!showFace && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Avatar who={speaker} size={140} state={started ? avatarState : "idle"} />
            {face === "connecting" && <p className="flex items-center gap-2 text-sm text-white/80"><Loader2 size={14} className="animate-spin" /> Connecting to the examiner…</p>}
            {face === "ended" && <p className="text-sm text-white/80">Call ended</p>}
          </div>
        )}

        {/* Active-speaker ring */}
        <div className={`pointer-events-none absolute inset-0 transition-shadow ${ring}`} aria-hidden />

        {/* Name tag */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded bg-black/50 px-2.5 py-1 text-xs font-medium">
          <span className={`h-2 w-2 rounded-full ${started && !finished ? "bg-red" : "bg-white/40"}`} aria-hidden />
          {speaker === "max" ? "Max · AI study partner" : "AI examiner"}
        </div>
        {speaker === "max" && live && <p className="absolute right-5 top-[124px] z-10 rounded bg-black/55 px-1.5 text-[10px] text-white/85">Examiner</p>}

        {/* Turn indicator */}
        {started && !finished && (listening || phase === "thinking") && (
          <p className={`absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium ${listening ? "bg-green" : "bg-black/50"}`}>
            {listening ? "Your turn" : "Thinking…"}
          </p>
        )}

        {/* Captions: the examiner's line, or the student's own words while answering */}
        {cc && started && (listening ? draft : caption) && (
          <div className="absolute inset-x-4 bottom-5 z-10 flex justify-center" aria-live="polite">
            <p className="max-w-3xl rounded bg-black/70 px-4 py-2.5 text-center text-[16px] leading-snug">
              {listening && <span className="mr-1.5 font-semibold text-[#9be3b8]">You:</span>}
              {listening ? draft : caption}
            </p>
          </div>
        )}
        {cc && started && listening && !draft && (
          <p className="absolute inset-x-0 bottom-5 z-10 mx-auto w-fit rounded bg-black/60 px-3 py-1.5 text-sm text-white/85">Listening… answer out loud</p>
        )}

        {/* Self-view: local preview only, never recorded or sent. */}
        {cam && (
          <video ref={selfRef} autoPlay playsInline muted className="absolute bottom-5 right-5 z-20 h-[110px] w-[148px] -scale-x-100 rounded border border-white/30 bg-black object-cover shadow-lg" aria-label="Your camera (only you can see this)" />
        )}

        {/* Join overlay */}
        {!started && !finished && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-end gap-2 bg-gradient-to-t from-black/75 via-black/15 to-transparent pb-10">
            <PrimaryButton type="button" onClick={join} disabled={!canJoin || face === "connecting"} className="!h-12 !px-7 !text-[15px]">
              {face === "connecting" ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />} {resumeLabel}
            </PrimaryButton>
            <p className="text-xs text-white/75">Voice conversation · your camera stays off unless you turn it on · nothing is recorded</p>
          </div>
        )}

        {/* Problems (network, AI) without leaving the call */}
        {note && (
          <div className="absolute inset-x-4 top-14 z-20 mx-auto flex max-w-xl items-center gap-3 rounded bg-black/75 px-3 py-2 text-sm" role="alert">
            <span className="flex-1">{note}</span>
            {error && onRetry && <button type="button" onClick={onRetry} className="flex items-center gap-1 rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25"><RotateCcw size={12} /> Retry</button>}
          </div>
        )}
      </div>

      {/* Call bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-semibold" role="status" aria-live="polite">{status}</p>
          <p className="truncate text-xs text-white/60">{detail}</p>
        </div>
        <div className="flex items-center gap-2">
          {mic}
          <CallButton label={cam ? "Turn camera off" : "Turn camera on"} onClick={toggleCam} active={cam}>
            {cam ? <Video size={19} /> : <VideoOff size={19} />}
          </CallButton>
          <CallButton label={cc ? "Hide captions" : "Show captions"} onClick={() => setCc((c) => !c)} active={cc}>
            {cc ? <Captions size={19} /> : <CaptionsOff size={19} />}
          </CallButton>
          {onPlainEnglish && (
            <CallButton label="Say that in plain English" onClick={onPlainEnglish} disabled={!started || phase === "thinking" || phase === "speaking"}>
              <Languages size={19} />
            </CallButton>
          )}
          <CallButton label="Skip to my turn" onClick={onSkip} disabled={phase !== "speaking"}>
            <SkipForward size={19} />
          </CallButton>
        </div>
        <div className="flex flex-1 basis-24 justify-end">
          <Link href={leaveHref} onClick={() => { closeFace(); stopCam(); if (rec) void finishCapture(); }}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-red px-4 text-sm font-medium text-white transition-colors hover:bg-[#b93a2f]">
            <PhoneOff size={16} /> Leave
          </Link>
        </div>
      </div>
    </div>
  );
}
