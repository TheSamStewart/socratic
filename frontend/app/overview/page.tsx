"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, MessageCircle, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import MasteryMap, { type MapRow } from "@/components/MasteryMap";
import { Card, Dot, Note, PageTitle, ProgressLine, Skeleton } from "@/components/ui";

export default function Overview() {
  const { labs, mastery, labSessions, assessments, student, ready } = useApp();
  if (!ready) return <Skeleton className="h-64 w-full" />;

  // Weekly labs: real session concepts once Max has a session for that lab, labelled seed data until then.
  const rows: MapRow[] = [...labs].sort((a, b) => a.week - b.week).map((l) => {
    const live = labSessions[l.id];
    return {
      key: l.id, label: `Week ${l.week}`, sub: l.title, source: live ? "live" : "seed",
      concepts: live
        ? live.concepts.map((c) => ({ id: c.id, name: c.name, status: c.status, href: `/teach?lab=${l.id}&concept=${c.id}` }))
        : l.concepts.map((c) => ({ id: c.id, name: c.name, status: mastery[c.id] ?? ("untested" as const), href: `/teach?lab=${l.id}&concept=${c.id}` })),
    };
  });
  const final = assessments.find((a) => a.kind === "final" && a.session);
  if (final?.session)
    rows.push({
      key: "final", label: "Final piece", sub: "From your submission", source: "live",
      concepts: final.session.concepts.map((c) => ({ id: c.id, name: c.name, status: c.status, href: `/teach?a=final&concept=${c.id}` })),
    });

  const all = rows.flatMap((r) => r.concepts);
  const count = (s: string) => all.filter((c) => c.status === s).length;
  const stats = [
    { label: "Secure", value: count("green"), s: "green" as const },
    { label: "Getting there", value: count("amber"), s: "amber" as const },
    { label: "To work on", value: count("red"), s: "red" as const },
    { label: "Not tried yet", value: count("untested"), s: "untested" as const },
  ];
  const focus = all.filter((c) => c.status === "red" || c.status === "amber").slice(0, 4);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const upcoming = assessments.filter((a) => a.status === "not_started" || a.status === "viva_due");

  return (
    <>
      <PageTitle eyebrow="Weekly labs" title={`${greet}, ${student.split(" ")[0]}`} sub="Your map is built from your weekly labs, your submission and your chats with Max. Every hexagon you turn green is an idea you can explain in your own words." />

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Overall</p>
          <p className="mt-1 text-4xl font-semibold"><span className="tnum">{count("green")}</span><span className="text-xl text-ink3"> / {all.length}</span></p>
          <p className="mb-4 text-sm text-ink2">concepts secure</p>
          <ProgressLine value={count("green")} total={all.length} />
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center gap-2 text-xs text-ink2"><Dot status={s.s} /> {s.label}</div>
              <p className="tnum mt-3 text-3xl font-semibold">{s.value}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 p-6">
          <h2 className="mb-4 text-lg font-semibold">Mastery map by week</h2>
          <MasteryMap rows={rows} />
        </Card>
        <div className="min-w-0 space-y-4">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Worth practising next</h2>
            {focus.length === 0 ? <p className="text-ink2">Nothing to fix right now. Nice work.</p> : (
              <ul className="space-y-1">
                {focus.map((c) => <li key={c.id}><Link href={c.href ?? "/teach"} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-subtle"><Dot status={c.status} /><span className="flex-1 text-sm">{c.name}</span><ArrowRight size={14} className="text-accent" /></Link></li>)}
              </ul>
            )}
            <Link href="/teach" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-ink"><MessageCircle size={15} /> Talk to Max</Link>
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Coming up</h2>
            {upcoming.length === 0 ? <p className="text-sm text-ink2">All work submitted. Well done.</p> : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <CalendarDays size={16} className="shrink-0 text-ink3" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.title}</span><span className="text-xs text-ink2">Due {a.due} · {a.weight}%</span></span>
                    <Link href={a.status === "viva_due" ? `/submit/viva/${a.id}` : "/submit"} className="text-xs font-medium text-accent hover:underline">{a.status === "viva_due" ? "Do viva" : "Submit"}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Note icon={<Sparkles size={16} />} title="Why teach Max?">
            Explaining an idea to someone who has it wrong is one of the strongest ways to learn it. That&apos;s the Socratic method.
          </Note>
        </div>
      </div>
    </>
  );
}
