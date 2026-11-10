/**
 * Socratic mark: a classical column inside a speech bubble. Socratic dialogue =
 * learning through conversation. Keep in sync with app/icon.svg.
 * `inverse` draws it white for dark backgrounds.
 */
export function LogoMark({ size = 28, className = "", inverse = false }: { size?: number; className?: string; inverse?: boolean }) {
  const fill = inverse ? "#fff" : "var(--color-accent)";
  const glyph = inverse ? "var(--color-brand)" : "#fff";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M8 2.5h16A5.5 5.5 0 0 1 29.5 8v11a5.5 5.5 0 0 1-5.5 5.5h-7.5L10 29.5v-5H8A5.5 5.5 0 0 1 2.5 19V8A5.5 5.5 0 0 1 8 2.5Z" fill={fill} />
      <rect x="9.5" y="7" width="13" height="2.2" rx=".6" fill={glyph} />
      <rect x="11" y="10.4" width="2.1" height="8" fill={glyph} />
      <rect x="14.95" y="10.4" width="2.1" height="8" fill={glyph} />
      <rect x="18.9" y="10.4" width="2.1" height="8" fill={glyph} />
      <rect x="9.5" y="19.4" width="13" height="2" rx=".6" fill={glyph} />
    </svg>
  );
}

export default function Logo({ sub, inverse = false }: { sub?: string; inverse?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <LogoMark size={30} inverse={inverse} />
      <span className="min-w-0 leading-tight">
        <span className={`block font-serif text-[18px] font-bold tracking-tight ${inverse ? "text-white" : "text-brand"}`}>Socratic</span>
        {sub && <span className={`block truncate text-[11px] ${inverse ? "text-white/65" : "text-ink3"}`}>{sub}</span>}
      </span>
    </span>
  );
}
