"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, Lightbulb, Mic, Play, Quote, RefreshCw, RotateCcw, Square, Volume2, Wand2 } from "lucide-react";
import Avatar, { type AvatarState } from "./Avatar";
import Composer, { dictationSupported } from "./Composer";
import MasteryRail from "./MasteryRail";
import { Card, GhostButton, Pill, PrimaryButton, Skeleton } from "./ui";
import { chat, errorText, rephrase } from "@/lib/viva";
import { speak, stopSpeaking, unlockAudio, type Speaker, type VoiceSource } from "@/lib/speech";
import type { Session, Turn } from "@/lib/types";

type Kind = "viva" | "max";
type Phase = "idle" | "thinking" | "speaking" | "listening";
type Mode = "voice" | "text";

const MODE_KEY = "socratic-voice-mode";

function useTimer(startedAt: string | null) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt || !now) return "5:00";
  const left = 300 - Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const abs = Math.abs(left);
  // Soft timer: shows time, never cuts the student off.
  return `${left < 0 ? "+" : ""}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

const SOURCE_LABEL: Record<VoiceSource, string> = {
  elevenlabs: "ElevenLabs voice",
  browser: "Browser voice (ElevenLabs unavailable)",
  none: "Voice unavailable, captions only",
};

export default function ChatPanel({
  kind, session, onSession, railTitle, subtitle, focusConceptId,
}: {
  kind: Kind;
  session: Session;
  onSession: (s: Session) => void;
  railTitle?: string;
  subtitle?: string;
  focusConceptId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("voice");
  // Audio can only play after a click on the page, so voice mode waits for "Start conversation".
  const [started, setStarted] = useState(false);
  const [listenSignal, setListenSignal] = useState(0);
  const [source, setSource] = useState<VoiceSource | null>(null);
  const [canListen, setCanListen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef<(() => void) | null>(null);
  const begun = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const live = useRef({ mode, started });
  live.current = { mode, started };

  // The backend decides who is talking. In a viva, mode "teach_max" means Max takes over until it returns to "viva".
  const whoFor = (s: Session): Kind => (kind === "viva" && s.mode === "teach_max" && s.viva_transcript.length > 0 ? "max" : kind);
  const eff = whoFor(session);
  const effRef = useRef(eff);
  effRef.current = eff;
  const isMax = eff === "max";
  const speaker: Speaker = isMax ? "max" : "examiner";
  const label = isMax ? "Max" : "Examiner";
  const transcript: Turn[] = isMax ? session.max_transcript : session.viva_transcript;
  const timer = useTimer(kind === "viva" ? session.viva_started_at : null);
  const finished = kind === "viva" && (session.mode === "recap" || session.mode === "done");
  const busy = phase === "thinking" || phase === "speaking";
  const voice = mode === "voice";
  const current = session.concepts.find((c) => c.id === (focusConceptId ?? session.current_concept_id));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "text" || (!saved && localStorage.getItem("viva-muted") === "1")) setMode("text");
    } catch { /* ignore */ }
    setCanListen(dictationSupported());
    return () => stopSpeaking();
  }, []);

  const chooseMode = (m: Mode) => {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
    if (m === "text") { stopSpeaking(); setPhase((p) => (p === "speaking" ? "idle" : p)); }
  };

  /** Speak a line, then (voice mode) hand the turn to the student by opening the mic. */
  const sayThenListen = async (text: string, who: Speaker, listenAfter: boolean) => {
    setPhase("speaking");
    const src = await speak(text, who);
    setSource(src);
    setPhase((p) => (p === "speaking" ? "idle" : p));
    if (listenAfter && live.current.mode === "voice") setListenSignal((n) => n + 1);
  };

  const send = async (value: string | null) => {
    stopSpeaking();
    setPhase("thinking");
    setError(null);
    const cur = sessionRef.current;
    const curKind = effRef.current;
    if (value) {
      const key = curKind === "max" ? "max_transcript" : "viva_transcript";
      const t = curKind === "max" ? cur.max_transcript : cur.viva_transcript;
      onSession({ ...cur, [key]: [...t, { role: "student", text: value, concept_id: cur.current_concept_id }] });
    }
    try {
      const next = (await chat(curKind, cur, value)).data;
      onSession(next);
      retryRef.current = null;
      // Whoever the backend says is speaking now (it may have switched mode).
      const nextKind = whoFor(next);
      const last = (nextKind === "max" ? next.max_transcript : next.viva_transcript).at(-1);
      const done = kind === "viva" && (next.mode === "recap" || next.mode === "done");
      const { mode: m, started: s } = live.current;
      if (m === "voice" && s && last && last.role !== "student") {
        await sayThenListen(last.text, nextKind === "max" ? "max" : "examiner", !done);
      } else {
        setPhase("idle");
      }
    } catch (e) {
      setError(errorText(e));
      retryRef.current = () => send(value);
      setPhase("idle");
    }
  };

  // The first line is asked for as soon as the panel opens (shown as text until voice is started).
  useEffect(() => {
    if (transcript.length === 0 && !begun.current) { begun.current = true; send(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // When the backend hands over to Max mid-viva and Max has not spoken yet, let him open.
  const kicked = useRef<string | null>(null);
  useEffect(() => {
    if (kind === "viva" && eff === "max" && session.max_transcript.length === 0 && phase === "idle" && kicked.current !== session.id) {
      kicked.current = session.id;
      send(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eff, phase]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [transcript.length, phase]);

  /** "Start conversation": unlocks audio (needs this click), speaks the latest line, then listens. */
  const startVoice = () => {
    unlockAudio();
    setStarted(true);
    live.current = { mode: "voice", started: true };
    const last = transcript.at(-1);
    if (last && last.role !== "student") sayThenListen(last.text, speaker, !finished);
    else if (!busy) setListenSignal((n) => n + 1);
  };

  const replay = (t: Turn) => {
    unlockAudio();
    setStarted(true);
    sayThenListen(t.text, t.role === "max" ? "max" : "examiner", false);
  };

  const avatarState: AvatarState = phase === "speaking" ? "speaking" : phase === "thinking" ? "thinking" : "idle";
  const stageText =
    finished ? "Viva complete."
    : phase === "speaking" ? `${label} is talking…`
    : phase === "thinking" ? `${label} is thinking…`
    : phase === "listening" ? "Your turn. Speak your answer."
    : !started ? (transcript.length ? "Press start and the conversation is spoken aloud." : "Getting ready…")
    : canListen ? "Your turn. Tap the mic or type."
    : "Your turn. Type your answer below.";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="flex h-[calc(100dvh-236px)] min-h-[560px] min-w-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <Avatar who={speaker} size={36} state={voice ? avatarState : "idle"} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{isMax ? "Max, a fellow student" : "Viva examiner"}</p>
            <p className="truncate text-xs text-ink2">{subtitle ?? (isMax ? "Max thinks he understands this. Correct him." : "A short conversation about your own work")}</p>
          </div>
          {kind === "viva" && <span className="tnum rounded-lg border border-line px-2 py-1 text-sm" aria-label="Viva timer">{timer}</span>}
          <div className="flex rounded-lg border border-line bg-muted p-0.5 text-xs" role="radiogroup" aria-label="Conversation mode">
            {([["voice", "Voice", Mic], ["text", "Text", Keyboard]] as const).map(([m, l, Icon]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => chooseMode(m)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors ${mode === m ? "bg-white font-medium text-ink shadow-sm" : "text-ink2 hover:text-ink"}`}>
                <Icon size={13} /> {l}
              </button>
            ))}
          </div>
        </div>

        {kind === "viva" && isMax && (
          <div className="fadein flex items-center gap-2 border-b border-accent-line bg-accent-soft px-5 py-2 text-sm text-accent-ink" role="status">
            <Wand2 size={14} /> Switching to Teach Max: let&apos;s fix this one first
          </div>
        )}
        {finished && (
          <div className="border-b border-line bg-[#f6fbf8] px-5 py-3 text-sm">
            <p className="mb-1 font-medium">Viva complete. Your module leader will review it.</p>
            {session.revise.length > 0 && <><p className="text-ink2">Worth revising:</p>
            <ol className="list-decimal pl-5 text-ink2">{session.revise.map((r) => <li key={r}>{r}</li>)}</ol></>}
          </div>
        )}

        {/* Voice stage: who's talking, whose turn it is, and the controls. */}
        {voice && (
          <div className="flex flex-wrap items-center gap-4 border-b border-line bg-accent-soft/60 px-5 py-4">
            <Avatar who={speaker} size={56} state={phase === "listening" ? "listening" : avatarState} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" role="status" aria-live="polite">{stageText}</p>
              <p className="text-xs text-ink2">
                {started && source ? SOURCE_LABEL[source] : canListen ? "Speak your answers out loud. When you pause, your answer sends itself." : "Voice replies work everywhere. Speaking answers works in Chrome and Edge."}
              </p>
            </div>
            {!started && !finished && (
              <PrimaryButton type="button" onClick={startVoice} disabled={phase === "thinking" && transcript.length === 0}>
                <Play size={14} /> {transcript.some((t) => t.role === "student") ? "Resume talking" : "Start conversation"}
              </PrimaryButton>
            )}
            {phase === "speaking" && (
              <GhostButton type="button" onClick={() => { stopSpeaking(); setPhase("idle"); if (!finished) setListenSignal((n) => n + 1); }}>
                <Square size={12} /> Skip to my turn
              </GhostButton>
            )}
          </div>
        )}

        {/* Transcript (always shown: captions for voice mode) */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-reading px-6 py-6" aria-live="polite">
          {transcript.length === 0 && phase === "thinking" && <div className="space-y-2"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-12 w-1/2" /></div>}
          {transcript.map((t, i) => {
            const mine = t.role === "student";
            const who: Speaker = t.role === "max" ? "max" : "examiner";
            return (
              <div key={i} className={`fadein flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <Avatar who={who} size={30} />}
                <div className={`group min-w-0 max-w-[80%] ${mine ? "text-right" : ""}`}>
                  <p className="mb-1 text-xs font-medium text-ink2">{mine ? "You" : who === "max" ? "Max" : "Examiner"}</p>
                  <div className={`inline-block rounded-2xl px-4 py-3 text-left ${mine ? "rounded-tr-md bg-accent text-white" : who === "max" ? "rounded-tl-md border border-accent-line bg-white" : "rounded-tl-md border border-line bg-white"}`}>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{t.text}</p>
                  </div>
                  {!mine && (
                    <button type="button" onClick={() => replay(t)} disabled={busy} className="ml-1 mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-ink3 opacity-70 transition hover:bg-muted hover:text-ink group-hover:opacity-100 disabled:opacity-30" aria-label="Play this line aloud">
                      <Volume2 size={12} /> Play
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {transcript.length > 0 && phase === "thinking" && (
            <div className="flex items-center gap-3 text-sm text-ink2"><Avatar who={speaker} size={30} state="thinking" /><span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="voice-bar block h-2 w-2 rounded-full bg-ink3" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="mx-5 my-2 flex items-center gap-3 rounded-lg border border-[#f5c2bd] bg-[#fff5f4] px-3 py-2 text-sm" role="alert">
            <span className="flex-1 text-[#b42318]">{error}</span>
            {retryRef.current && <GhostButton type="button" onClick={() => retryRef.current?.()}><RotateCcw size={14} /> Retry</GhostButton>}
          </div>
        )}

        {!isMax && !finished && (
          <div className="flex items-center justify-end border-t border-line bg-subtle px-5 pt-2">
            <GhostButton type="button" className="!h-7 text-xs" disabled={busy} onClick={async () => {
              try {
                const next = (await rephrase(session)).data;
                onSession(next);
                const last = next.viva_transcript.at(-1);
                if (voice && started && last) sayThenListen(last.text, "examiner", true);
              } catch (e) { setError(errorText(e)); }
            }}>
              <RefreshCw size={12} /> Say that in plain English
            </GhostButton>
          </div>
        )}

        <Composer
          placeholder={isMax ? "Explain it in your own words…" : "Type or speak your answer…"}
          disabled={finished}
          sending={phase === "thinking"}
          listenSignal={voice && started ? listenSignal : 0}
          handsFree={voice && started}
          onSend={(v) => send(v)}
          onListeningChange={(l) => {
            if (l) { stopSpeaking(); setPhase("listening"); }
            else setPhase((p) => (p === "listening" ? "idle" : p));
          }}
        />
      </Card>

      {/* Side rail: what's being discussed, progress, and how to get the most out of it. */}
      <div className="min-w-0 space-y-4">
        {current && (
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Now discussing</p>
              <Pill status={current.status} />
            </div>
            <p className="font-serif text-lg font-semibold leading-snug">{current.name}</p>
            {current.quote && (
              <p className="mt-3 flex gap-2 rounded-lg bg-subtle p-3 text-[13px] italic leading-relaxed text-ink2">
                <Quote size={14} className="mt-0.5 shrink-0 text-ink3" />
                <span>{isMax ? `Max believes: “${current.quote}”` : `You wrote: “${current.quote}”`}</span>
              </p>
            )}
          </Card>
        )}
        <MasteryRail concepts={session.concepts} activeId={focusConceptId ?? session.current_concept_id} title={railTitle} />
        <Card className="p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Lightbulb size={15} className="text-accent" /> {isMax ? "How to teach Max" : "How the viva works"}</p>
          <ul className="space-y-2 text-[13px] leading-relaxed text-ink2">
            {(isMax
              ? ["Say what's wrong with Max's idea, then why.", "Use an example from the lab or your own work.", "If he's still confused, try a different angle. Explaining is how you learn."]
              : ["Questions are about sentences you wrote. There are no trick questions.", "It's fine to think out loud or say you're unsure.", "Ask for plain English any time. The timer is a guide only."]
            ).map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />{t}</li>)}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink3">
            {isMax ? "Practice only, never marked. " : "Your answers are checked against your own submission. "}A person always makes the final call.
          </p>
        </Card>
      </div>
    </div>
  );
}
