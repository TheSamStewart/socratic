"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Loader2, Mic, Square } from "lucide-react";

// Web Speech API typings: lib.dom only has them in some browsers.
type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = typeof window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export const dictationSupported = () => {
  if (typeof window === "undefined") return false;
  const w = window as SpeechWindow;
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
};

const MAX_HEIGHT = 200; // px, then the box scrolls
const PAUSE_MS = 3000; // hands-free: this much silence after speech sends the answer (people pause to think)

export default function Composer({
  placeholder,
  onSend,
  onListeningChange,
  disabled = false,
  sending = false,
  listenSignal = 0,
  handsFree = false,
  variant = "box",
  onDraft,
}: {
  placeholder: string;
  onSend: (text: string) => void;
  /** Called with true while dictating, so the caller can pause any speech playing. */
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
  sending?: boolean;
  /** Each time this number goes up, the mic opens (voice mode: "your turn"). */
  listenSignal?: number;
  /** Send automatically after a pause in speech. */
  handsFree?: boolean;
  /** "call": no text box, just a round mic control for the video-call viva. */
  variant?: "box" | "call";
  /** Live text of what the student is saying (for on-video captions). */
  onDraft?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  // null until mounted (no SpeechRecognition on the server), false once missing or broken.
  const [dictationOk, setDictationOk] = useState<boolean | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Call view: the student tapped the mic, so it stays open (no auto-send, restarts if the
  // browser ends it on silence) until they press Done or tap the mic again.
  const holdOpen = useRef(false);
  const cbRef = useRef({ onSend, onListeningChange, handsFree, disabled, sending });
  cbRef.current = { onSend, onListeningChange, handsFree, disabled, sending };

  useEffect(() => {
    setDictationOk(dictationSupported());
    return () => {
      holdOpen.current = false; // so onend doesn't restart the mic after leaving
      const r = recRef.current;
      recRef.current = null;
      r?.abort();
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  // Grow with the text, up to MAX_HEIGHT.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [text, interim]);

  const clearPause = () => { if (pauseTimer.current) { clearTimeout(pauseTimer.current); pauseTimer.current = null; } };

  const stopListening = () => {
    clearPause();
    holdOpen.current = false;
    const r = recRef.current;
    recRef.current = null;
    r?.stop();
    setListening(false);
    setInterim("");
    cbRef.current.onListeningChange?.(false);
  };

  const sendValue = (raw: string) => {
    const value = raw.trim();
    const { disabled: d, sending: s } = cbRef.current;
    if (!value || d || s) return false;
    if (recRef.current) stopListening();
    setText("");
    setInterim("");
    cbRef.current.onSend(value);
    return true;
  };

  const startListening = (hold = false) => {
    const w = window as SpeechWindow;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { setDictationOk(false); return; }
    if (recRef.current) { if (hold) { holdOpen.current = true; clearPause(); } return; }
    holdOpen.current = hold;
    const r = new SR();
    r.lang = "en-GB";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      if (finalText.trim()) {
        const t = textRef.current;
        const next = t.trim() ? `${t.replace(/\s+$/, "")} ${finalText.trim()}` : finalText.trim();
        textRef.current = next;
        setText(next);
      }
      setInterim(interimText.trim());
      // Hands-free: wait for a pause, then send what was said.
      if (cbRef.current.handsFree && !holdOpen.current) {
        clearPause();
        pauseTimer.current = setTimeout(() => { if (recRef.current === r) sendValue(textRef.current); }, PAUSE_MS);
      }
    };
    r.onerror = (e) => {
      // No microphone or no permission: dictation can't work here, so hide it.
      const fatal = e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture";
      if (fatal) setDictationOk(false);
      // Silence while held open is fine: onend restarts the mic.
      if (!fatal && holdOpen.current && (e.error === "no-speech" || e.error === "aborted")) return;
      if (recRef.current === r) stopListening();
    };
    r.onend = () => {
      if (recRef.current !== r) return;
      // Held open: the browser stopped on its own (silence or its time limit), so carry on listening.
      if (holdOpen.current) {
        try { r.start(); return; } catch { /* fall through and stop */ }
      }
      // The browser ended the session (long silence). In hands-free mode, send what we have.
      const pending = textRef.current;
      stopListening();
      if (cbRef.current.handsFree && pending.trim()) sendValue(pending);
    };
    recRef.current = r;
    setListening(true);
    cbRef.current.onListeningChange?.(true);
    try { r.start(); } catch { setDictationOk(false); stopListening(); }
  };

  // Voice mode: the panel tells us when it's the student's turn.
  useEffect(() => {
    if (listenSignal > 0 && dictationSupported() && !cbRef.current.disabled) startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenSignal]);

  // Stop listening if the panel becomes busy or disabled underneath us.
  useEffect(() => { if ((disabled || sending) && recRef.current) stopListening(); }, [disabled, sending]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = text.trim().length > 0 && !disabled && !sending;

  const send = () => {
    if (sendValue(text)) areaRef.current?.focus();
  };

  const draftRef = useRef(onDraft);
  draftRef.current = onDraft;
  useEffect(() => { draftRef.current?.(`${text} ${interim}`.trim()); }, [text, interim]);

  if (variant === "call") {
    return (
      <div className="flex items-center gap-2">
        {dictationOk === false ? (
          <span className="max-w-[220px] text-xs leading-snug text-white/70">Spoken answers need Chrome or Edge. Switch to Text above.</span>
        ) : (
          <button
            type="button"
            // Tap to speak (stays open while you think); tap again to send what you said.
            onClick={listening ? (text.trim() ? send : stopListening) : () => startListening(true)}
            disabled={disabled || sending || dictationOk === null}
            aria-label={listening ? (text.trim() ? "Send answer" : "Stop listening") : "Answer out loud"}
            aria-pressed={listening}
            title={listening ? (text.trim() ? "Send answer" : "Stop listening") : "Answer out loud"}
            className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40 ${listening ? "bg-green" : "bg-white/12 hover:bg-white/20"}`}
          >
            {listening && <span className="voice-ring bg-green" />}
            {sending ? <Loader2 size={18} className="relative animate-spin" /> : <Mic size={20} className="relative" />}
          </button>
        )}
        {listening && text.trim() && (
          <button type="button" onClick={send} className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium text-brand hover:bg-white/90">
            <ArrowUp size={15} /> Done
          </button>
        )}
      </div>
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="border-t border-line bg-subtle p-4">
      <div
        className={`rounded-2xl border bg-white shadow-sm transition-colors ${listening ? "border-accent ring-4 ring-accent/10" : "border-line-strong focus-within:border-accent"}`}
      >
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={interim ? "" : listening ? "Listening… just speak" : placeholder}
          aria-label="Your answer"
          className="block w-full resize-none rounded-none border-0 bg-transparent px-4 pb-1 pt-3 text-[15px] leading-6 shadow-none outline-none ring-0 placeholder:text-ink3 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:text-ink3"
          // globals.css sets an unlayered :focus-visible outline that beats utility classes; inline wins.
          style={{ outline: "none", boxShadow: "none", border: 0 }}
        />
        {interim && (
          <p className="px-4 pb-1 text-[15px] leading-6 text-ink3" aria-live="polite">{interim}</p>
        )}
        <div className="flex items-center justify-end gap-2 px-2 pb-2">
          {listening && (
            <span className="mr-auto flex items-center gap-2 pl-2 text-xs font-medium text-accent" role="status">
              <span className="flex h-3 items-end gap-0.5" aria-hidden>
                {[0, 1, 2, 3].map((i) => <span key={i} className="voice-bar block h-3 w-0.5 rounded bg-accent" style={{ animationDelay: `${i * 0.12}s` }} />)}
              </span>
              {handsFree ? "Listening. Pause when you're done and it sends itself." : "Listening… tap to stop"}
            </span>
          )}
          {!listening && dictationOk === false && (
            <span className="mr-auto pl-2 text-xs text-ink3">Speaking your answer works in Chrome and Edge. You can type here instead.</span>
          )}
          {dictationOk && (
            <button
              type="button"
              onClick={listening ? stopListening : () => startListening()}
              disabled={disabled}
              aria-label={listening ? "Stop listening" : "Speak your answer"}
              aria-pressed={listening}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${listening ? "bg-accent text-white" : "text-ink2 hover:bg-muted"}`}
            >
              {listening ? <Square size={14} /> : <Mic size={18} />}
            </button>
          )}
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-ink disabled:bg-muted disabled:text-ink3"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
