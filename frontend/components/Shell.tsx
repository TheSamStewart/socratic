"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, Bell, BookOpen, ChevronRight, ClipboardCheck, FlaskConical, Grid3x3, Inbox, LayoutDashboard,
  MessageCircle, Settings2, ShieldCheck, Upload, Users, type LucideIcon,
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
            { href: "/lecturer/settings", label: "Module settings", icon: Settings2 },
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
    <div className="viva-frame">
      {/* Masthead: white, product wordmark + institution, like a university site header */}
      <header className="no-print relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Logo />
          <span className="viva-hide-sm h-9 w-px bg-line-strong" aria-hidden />
          <p className="viva-hide-sm truncate font-serif text-[15px] font-bold text-ink">The University of Manchester</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-line bg-subtle p-0.5 text-xs" role="tablist" aria-label="View as">
            {(["student", "lecturer"] as const).map((r) => (
              <button key={r} role="tab" aria-selected={role === r} onClick={() => switchRole(r)}
                className={`rounded-sm px-2.5 py-1 capitalize transition-colors ${role === r ? "bg-brand font-medium text-white" : "text-ink2 hover:text-ink"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setBell((b) => !b)} aria-label={`Notifications, ${unread} unread`} aria-expanded={bell} className="relative flex h-9 w-9 items-center justify-center rounded text-ink2 hover:bg-muted hover:text-ink">
              <Bell size={18} />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5"><NotifBadge count={unread} /></span>}
            </button>
            {bell && (
              <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-48px)] rounded-md border border-line bg-white text-ink shadow-lg">
                <p className="border-b border-line bg-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink2">Notifications</p>
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
          <div className="viva-hide-sm flex items-center gap-2.5 border-l border-line pl-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{role === "student" ? "AK" : "ML"}</span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-medium text-ink">{role === "student" ? "Aisha Khan" : "Module leader"}</p>
              <p className="text-[11px] text-ink3">{role === "student" ? "Student · ID 10483921" : "Staff · School of Computer Science"}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Heritage-blue band with a gold rule: where you are */}
      <div className="no-print flex h-11 shrink-0 items-center justify-between gap-4 border-t-[3px] border-gold bg-brand px-6 text-white">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-white/75">
          <span>My modules</span>
          <ChevronRight size={13} className="text-white/45" />
          <span>CMP2045 Research Methods</span>
          <ChevronRight size={13} className="text-white/45" />
          <span className="font-semibold text-white" aria-current="page">{current}</span>
        </nav>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="viva-sidebar no-print flex min-h-0 shrink-0 flex-col border-r border-line bg-subtle" aria-label="Module menu">
          <div className="shrink-0 border-b border-line px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3">CMP2045</p>
            <p className="font-serif text-[16px] font-bold leading-snug text-brand">Research Methods</p>
            <p className="mt-0.5 text-xs text-ink3">2026/27 · Semester 1</p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto py-4">
            {groups.map((g) => (
              <div key={g.label} className="mb-5">
                <p className="px-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink3">{g.label}</p>
                <ul>
                  {g.items.map((it) => {
                    const active = path === it.href || path.startsWith(it.href + "/");
                    const Icon = it.icon;
                    return (
                      <li key={it.href}>
                        <Link href={it.href} aria-current={active ? "page" : undefined}
                          className={`flex min-h-9 items-center gap-2.5 border-l-[3px] px-[17px] py-2 text-[14px] transition-colors ${active ? "border-accent bg-white font-semibold text-accent-ink" : "border-transparent text-ink2 hover:bg-muted hover:text-ink"}`}>
                          <Icon size={16} strokeWidth={active ? 1.9 : 1.6} />
                          <span className="viva-nav-label min-w-0 flex-1">{it.label}</span>
                          {it.href === "/lecturer/escalations" ? <NotifBadge count={it.badge ?? 0} /> : !!it.badge && <span className="tnum rounded-sm bg-muted px-1.5 text-xs text-ink2">{it.badge}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="shrink-0 space-y-2 border-t border-line px-5 py-3 text-xs text-ink2">
            <p className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 text-accent" /><span>Evidence, not verdicts. A member of staff makes the final decision.</span></p>
            <p className="text-[11px] leading-snug text-ink3">Socratic · The University of Manchester</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="viva-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-reading px-8 py-7">
            <div className="mx-auto w-full max-w-[1680px]">{children}</div>
            <footer className="no-print mx-auto mt-12 flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line pt-4 text-xs text-ink3">
              <span>© 2026 Socratic · The University of Manchester</span>
              <span className="flex gap-4"><span>Accessibility</span><span>Privacy notice</span><span>IT Services help</span></span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
