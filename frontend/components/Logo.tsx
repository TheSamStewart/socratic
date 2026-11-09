/**
 * Socratic mark: the hex from the mastery map holding a question mark.
 * Socratic method = learning by being asked. Keep in sync with app/icon.svg.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 1.8 28.3 8.9v14.2L16 30.2 3.7 23.1V8.9Z" fill="var(--color-accent)" stroke="var(--color-accent)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M12.3 12.4a3.8 3.8 0 1 1 5.5 3.4c-1.1.6-1.8 1.4-1.8 2.6v.7" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="22.7" r="1.55" fill="#fff" />
    </svg>
  );
}

export default function Logo({ sub }: { sub?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <LogoMark size={30} />
      <span className="min-w-0 leading-tight">
        <span className="block font-serif text-[19px] font-semibold tracking-tight text-ink">Socratic</span>
        {sub && <span className="block truncate text-[11px] text-ink3">{sub}</span>}
      </span>
    </span>
  );
}
