/**
 * Who is talking. Max = a hex (same shape as the mastery map) in the accent colour;
 * the Examiner = a calm navy circle. States drive the rings/bars so students can
 * see whose turn it is without reading.
 */
export type AvatarState = "idle" | "speaking" | "listening" | "thinking";

export default function Avatar({ who, size = 32, state = "idle" }: { who: "max" | "examiner"; size?: number; state?: AvatarState }) {
  const max = who === "max";
  const ring = state === "speaking" ? "bg-accent" : state === "listening" ? "bg-green" : "";
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {ring && <><span className={`voice-ring ${ring}`} /><span className={`voice-ring delay ${ring}`} /></>}
      <svg viewBox="0 0 40 40" width={size} height={size} className="relative" aria-hidden>
        {max ? (
          <path d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z" fill="var(--color-accent)" stroke="var(--color-accent)" strokeWidth="3" strokeLinejoin="round" />
        ) : (
          <circle cx="20" cy="20" r="18" fill="#1b2a4a" />
        )}
        {/* Simple friendly face: two eyes and a mouth that opens while speaking. */}
        <circle cx="14.5" cy="17.5" r="2" fill="#fff" />
        <circle cx="25.5" cy="17.5" r="2" fill="#fff" />
        {state === "speaking" ? (
          <ellipse cx="20" cy="26" rx="4" ry="2.6" fill="#fff">
            <animate attributeName="ry" values="1;3;1.6;2.8;1" dur="0.7s" repeatCount="indefinite" />
          </ellipse>
        ) : state === "thinking" ? (
          <path d="M16 26.5h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        ) : (
          <path d="M15.5 24.5q4.5 4 9 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}
