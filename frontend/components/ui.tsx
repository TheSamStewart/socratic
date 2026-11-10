import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Status } from "@/lib/types";

export const STATUS_COLOR: Record<Status, string> = {
  green: "#2E9D5B", amber: "#E8A33D", red: "#D9483B", untested: "#C9C9C6",
};
const STATUS_INK: Record<Status, string> = { green: "#247443", amber: "#8f5d0a", red: "#b42318", untested: "#6b6b6b" };
export const STATUS_LABEL: Record<Status, string> = {
  green: "Met", amber: "Partly", red: "Missing", untested: "Not tested",
};

export function Dot({ status, size = 8 }: { status: Status; size?: number }) {
  return (
    <span
      aria-label={status}
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: STATUS_COLOR[status] }}
    />
  );
}

export function Pill({ status, children }: { status: Status; children?: ReactNode }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium"
      style={{ background: `${c}1f`, color: STATUS_INK[status] }}
    >
      <Dot status={status} size={6} />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}

export function Confidence({ value }: { value: number }) {
  return (
    <span className="tnum rounded-md border border-line px-1.5 py-0.5 text-xs text-ink2" title="How sure the AI is. Low confidence goes to a human.">
      {Math.round(value * 100)}% sure
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-line bg-white ${className}`}>{children}</div>;
}

export function PrimaryButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-btn px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-line-strong ${className}`}
    />
  );
}

export function GhostButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-2 p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-ink2">{icon}</div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-ink2">{body}</p>
      {action}
    </Card>
  );
}

export function PageTitle({ title, sub, eyebrow, actions }: { title: string; sub?: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
        <h1 className="text-[24px] leading-tight">{title}</h1>
        {sub && <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A soft blue note: tips, "how this works", next steps. */
export function Note({ icon, title, children, className = "" }: { icon?: ReactNode; title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 rounded-md border border-accent-line border-l-[3px] border-l-accent bg-accent-soft p-4 text-sm text-ink ${className}`}>
      {icon && <span className="mt-0.5 shrink-0 text-accent">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="leading-relaxed text-ink2">{children}</div>
      </div>
    </div>
  );
}

/** Numbered steps, used for "how it works" side panels. */
export function Steps({ items, current = -1 }: { items: { title: string; body: string }[]; current?: number }) {
  return (
    <ol className="space-y-4">
      {items.map((s, i) => (
        <li key={s.title} className="flex gap-3">
          <span className={`tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i < current ? "bg-green text-white" : i === current ? "bg-accent text-white" : "border border-line-strong bg-white text-ink2"}`}>{i + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-6">{s.title}</p>
            <p className="text-[13px] leading-relaxed text-ink2">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Thin labelled progress line (green share of a whole). */
export function ProgressLine({ value, total, label }: { value: number; total: number; label?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      {label && <div className="mb-1.5 flex justify-between text-xs text-ink2"><span>{label}</span><span className="tnum">{value} of {total}</span></div>}
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full bg-green transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Small red notification bubble (iOS-style count badge). */
export function NotifBadge({ count, label = "notifications" }: { count: number; label?: string }) {
  if (!count) return null;
  return (
    <span
      className="tnum inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5372a] px-1 text-[11px] font-medium leading-none text-white"
      aria-label={`${count} ${label}`}
    >
      {count}
    </span>
  );
}
