"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Lock } from "lucide-react";

/** Same look as the inputs on the lecturer pages. */
export const INPUT = "mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink3 disabled:bg-subtle disabled:text-ink3";

/** Label + control + optional hint/error. The control is passed as children. */
export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 text-xs font-medium text-ink2 ${className}`}>
      {label}
      {children}
      {error ? <span className="mt-1 block font-normal text-red">{error}</span> : hint ? <span className="mt-1 block font-normal text-ink3">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${INPUT} ${className}`} />;
}

export function NumberInput({ value, onValue, className = "", ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & { value: number; onValue: (n: number) => void }) {
  return <input {...p} type="number" value={Number.isFinite(value) ? value : ""} onChange={(e) => onValue(e.target.value === "" ? 0 : Number(e.target.value))} className={`${INPUT} tnum ${className}`} />;
}

export function Select<T extends string | number>({ value, onValue, options, className = "", ...p }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & { value: T; onValue: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select {...p} value={String(value)} className={`${INPUT} ${className}`}
      onChange={(e) => { const o = options.find((x) => String(x.value) === e.target.value); if (o) onValue(o.value); }}>
      {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
    </select>
  );
}

export function TextArea({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...p} className={`${INPUT} resize-y leading-relaxed ${className}`} />;
}

/** A switch. `locked` shows a safeguard that is always on and can't be changed. */
export function Toggle({ label, hint, checked, onChange, locked = false }: { label: string; hint?: ReactNode; checked: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  const hid = useId();
  const on = locked || checked;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {label}
          {locked && <span className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink2"><Lock size={10} /> Always on</span>}
        </p>
        {hint && <p id={hid} className="mt-0.5 text-xs leading-relaxed text-ink2">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} aria-describedby={hint ? hid : undefined}
        disabled={locked} onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${on ? "bg-accent" : "bg-line-strong"} ${locked ? "opacity-60" : ""}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/** Segmented tabs (same look as the Student/Lecturer switch), scrolls sideways on narrow screens. */
export function Segmented<T extends string>({ value, onValue, options, label }: { value: T; onValue: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="inline-flex rounded border border-line bg-subtle p-0.5 text-sm" role="tablist" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onValue(o.value)}
            className={`whitespace-nowrap rounded-sm px-3 py-1.5 transition-colors ${value === o.value ? "bg-brand font-medium text-white" : "text-ink2 hover:text-ink"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Section heading inside a card. */
export function Section({ title, sub, children, actions }: { title: string; sub?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {sub && <p className="mt-0.5 text-xs leading-relaxed text-ink2">{sub}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
