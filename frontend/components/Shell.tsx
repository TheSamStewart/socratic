"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, Bell, BookOpen, ClipboardCheck, FlaskConical, Grid3x3, Inbox, LayoutDashboard,
  MessageCircle, ShieldCheck, Upload, Users, type LucideIcon,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { NotifBadge } from "./ui";
import Logo from "./Logo";

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };

const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const { role, setRole, openEscalations, unreadFor, notifs, markRead, assessments } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [bell, setBell] = useState(false);

  // Visiting a page clears its (non-sticky) notifications.
  useEffect(() => { markRead(path, true); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const vivaDue = assessments.filter((a) => a.status === "viva_due").length;
  const groups: { label: string; items: Item[] }[] =
    role === "student"
      ? [
          { label: "Assessment", items: [
            { href: "/brief", label: "Assignment brief", icon: BookOpen, badge: unreadFor("student", "/brief") },
            { href: "/submit", label: "Submit work", icon: Upload, badge: vivaDue },
            { href: "/rubric", label: "Feedback", icon: ClipboardCheck, badge: unreadFor("student", "/rubric") },
          ] },
          { label: "Weekly labs", items: [
            { href: "/teach", label: "Teach Max", icon: MessageCircle, badge: unreadFor("student", "/teach") },
            { href: "/overview", label: "My progress", icon: LayoutDashboard },
          ] },
        ]
      : [
          { label: "Module leader", items: [
            { href: "/lecturer/escalations", label: "Student questions", icon: Inbox, badge: openEscalations },
            { href: "/lecturer/labs", label: "Weekly labs", icon: FlaskConical },
            { href: "/lecturer/reports", label: "Viva reports", icon: Users, badge: unreadFor("lecturer", "/lecturer/reports") },
            { href: "/lecturer/heatmap", label: "Class insights", icon: Grid3x3 },
            { href: "/lecturer/agents", label: "AI agents & audit log", icon: Activity },
          ] },
        ];

  const current = groups.flatMap((g) => g.items).find((i) => path === i.href || path.startsWith(i.href + "/"))?.label ?? "Socratic";
  const mine = notifs.filter((n) => n.to === role);
  const unread = mine.filter((n) => !n.read).length;
  const switchRole = (r: typeof role) => {
    setRole(r);
    router.push(r === "student" ? "/brief" : "/lecturer/escalations");
  };

  return (
    <div className="viva-frame flex">
      <aside className="viva-sidebar no-print flex min-h-0 shrink-0 flex-col border-r border-line bg-subtle" aria-label="Module menu">
        <div className="flex h-[68px] shrink-0 items-center gap-2 px-4">
          <Logo sub="Learn by questioning" />
        </div>
        <div className="mx-3 mb-5 flex rounded-lg border border-line bg-muted p-0.5 text-xs" role="tablist" aria-label="View as">
          {(["student", "lecturer"] as const).map((r) => (
            <button key={r} role="tab" aria-selected={role === r} onClick={() => switchRole(r)}
              className={`flex-1 rounded-md px-2 py-1.5 capitalize transition-colors ${role === r ? "bg-white font-medium text-ink shadow-sm" : "text-ink2 hover:text-ink"}`}>
              {r}
            </button>
          ))}
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2">
          {groups.map((g) => (
            <div key={g.label} className="mb-6">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink3">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = path === it.href || path.startsWith(it.href + "/");
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link href={it.href} aria-current={active ? "page" : undefined}
                        className={`flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors ${active ? "bg-accent-soft font-medium text-accent-ink shadow-[inset_3px_0_0_var(--color-accent)]" : "text-ink2 hover:bg-muted hover:text-ink"}`}>
                        <Icon size={17} strokeWidth={active ? 1.9 : 1.6} />
                        <span className="viva-nav-label min-w-0 flex-1">{it.label}</span>
                        {it.href === "/lecturer/escalations" ? <NotifBadge count={it.badge ?? 0} /> : !!it.badge && <span className="tnum text-xs text-ink2">{it.badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-accent-line bg-accent-soft p-3 text-xs text-ink2">
          <ShieldCheck size={14} className="mt-0.5 text-accent" />
          <span>Evidence, not verdicts.<br />A person makes the final call.</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 border-t border-line px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">{role === "student" ? "AK" : "ML"}</span>
          <div className="min-w-0"><p className="truncate text-[13px] font-medium">{role === "student" ? "Aisha Khan" : "Module leader"}</p><p className="text-xs text-ink2">CMP2045 · Manchester</p></div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print relative z-30 flex h-[56px] shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-8">
          <p className="truncate text-[13px] text-ink2">My modules <span className="mx-2 text-line-strong">/</span> CMP2045 Research Methods <span className="mx-2 text-line-strong">/</span><span className="font-medium text-ink">{current}</span></p>
          <div className="flex items-center gap-2">
            {role === "student" && !path.startsWith("/teach") && !path.startsWith("/submit/viva") && (
              <Link href="/teach" className="hidden h-8 items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-[#e2eaff] sm:inline-flex">
                <MessageCircle size={14} /> Talk to Max
              </Link>
            )}
            <div className="relative">
              <button onClick={() => setBell((b) => !b)} aria-label={`Notifications, ${unread} unread`} aria-expanded={bell} className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink2 hover:bg-muted">
                <Bell size={16} />
                {unread > 0 && <span className="absolute -right-1 -top-1"><NotifBadge count={unread} /></span>}
              </button>
              {bell && (
                <div className="absolute right-0 top-10 w-80 max-w-[calc(100vw-48px)] rounded-xl border border-line bg-white text-ink shadow-lg">
                  <p className="border-b border-line px-4 py-3 text-sm font-medium">Notifications</p>
                  {mine.length === 0 && <p className="px-4 py-6 text-center text-ink2">You&apos;re all caught up.</p>}
                  <ul className="max-h-80 overflow-y-auto">
                    {mine.slice(0, 8).map((n) => (
                      <li key={n.id}><button onClick={() => { setBell(false); router.push(n.href); }} className="flex w-full items-start gap-2.5 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-subtle">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-red"}`} />
                        <span className="min-w-0 flex-1"><span className="block text-[13px]">{n.text}</span><span className="text-xs text-ink2">{ago(n.at)}</span></span>
                      </button></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="viva-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-white px-8 py-7">
          <div className="mx-auto w-full max-w-[1680px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
