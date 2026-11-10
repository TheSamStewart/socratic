"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, CheckCircle2, Clock, FileText, Info, Loader2, Mic, RotateCcw, ShieldAlert, Upload } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import FileDrop from "@/components/FileDrop";
import { Card, GhostButton, Note, NotifBadge, PageTitle, PrimaryButton, Steps } from "@/components/ui";
import { ESSAY_TEXT } from "@/lib/fixtures";
import type { Assessment, AssessStatus } from "@/lib/course";
import { errorText, submitWork } from "@/lib/viva";
import type { Session } from "@/lib/types";

const STATUS: Record<AssessStatus, { label: string; cls: string }> = {
  not_started: { label: "Not submitted", cls: "bg-muted text-ink2" },
  viva_due: { label: "Viva to do", cls: "bg-[#fde8e6] text-[#b42318]" },
  awaiting_review: { label: "With your module leader", cls: "bg-[#fff6e0] text-[#8f5d0a]" },
  reviewed: { label: "Reviewed", cls: "bg-[#e6f4ec] text-[#1e7a43]" },
};


function Uploader({ a, onDone }: { a: Assessment; onDone: () => void }) {
  const { student, patchAssessment, notify } = useApp();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [caught, setCaught] = useState(false);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const steps = [
    "Scanning for hidden instructions…",
    a.kind === "final" ? "Reading your essay…" : "Reading your work…",
    "Checking against the rubric…",
  ];
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const setStepBoth = (n: number) => { stepRef.current = n; setStep(n); };

  const go = async () => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setCaught(false);
    setStepBoth(0);
    // Step through the agents every ~2s while the real call runs.
    const tick = setInterval(() => { if (stepRef.current < steps.length - 1) setStepBoth(stepRef.current + 1); }, 2000);
    try {
      const session: Session = (await submitWork(student, file)).data;
      clearInterval(tick);
      const injected = session.flags.some((f) => f.type === "injection");
      if (injected) setCaught(true);
      while (stepRef.current < steps.length - 1) { await wait(350); setStepBoth(stepRef.current + 1); }
      await wait(450);
      setStepBoth(steps.length);
      await wait(injected ? 1400 : 600);
      patchAssessment(a.id, { status: "viva_due", session, workName: file.name });
      notify("student", `Your work for "${a.title}" is in. Next step: a short spoken viva about it.`, "/submit", true);
      setBusy(false);
      onDone();
      router.push("/rubric?tab=assess");
    } catch (e) {
      clearInterval(tick);
      setBusy(false);
      setErr(errorText(e));
    }
  };

  if (busy)
    return (
      <div className="border-t border-line bg-subtle p-5" role="status" aria-live="polite">
        <p className="mb-3 text-sm font-semibold">Your work is being checked</p>
        <ol className="space-y-2.5">
          {steps.map((label, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <li key={label} className={`flex items-center gap-3 text-sm ${done || active ? "text-ink" : "text-ink3"}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-green text-white" : active ? "border border-accent" : "border border-line"}`}>
                  {done ? <Check size={12} /> : active ? <Loader2 size={12} className="animate-spin text-accent" /> : null}
                </span>
                <span>{label.replace("…", done ? "" : "…")}</span>
              </li>
            );
          })}
        </ol>
        {caught && (
          <div className="fadein mt-4 flex items-start gap-2 rounded border border-line bg-[#fff5f4] px-3 py-2.5 text-sm text-[#b42318]">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red" />
            Guardian found a hidden instruction in the document, removed it and logged it. Everything else carries on as normal.
          </div>
        )}
      </div>
    );

  return (
    <div className="border-t border-line bg-subtle p-5">
      <FileDrop
        id={`w-${a.id}`}
        label={a.kind === "final" ? "Upload your essay" : "Upload your work"}
        file={file}
        onFile={(f) => { setFile(f); setErr(null); }}
      />
      <p className="mt-2 text-xs text-ink2">By submitting you confirm this is your own work, in line with the University&apos;s academic integrity policy.</p>

      {err && (
        <div className="mt-3 flex items-center gap-3 rounded border border-[#f5c2bd] bg-[#fff5f4] px-3 py-2 text-sm" role="alert">
          <span className="flex-1 text-[#b42318]">{err}</span>
          {file && <GhostButton type="button" onClick={go}><RotateCcw size={14} /> Retry</GhostButton>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <GhostButton type="button" onClick={() => { setFile(new File([ESSAY_TEXT], a.kind === "final" ? "demo-essay.txt" : "demo-answers.txt", { type: "text/plain" })); setErr(null); }}><FileText size={14} /> Attach demo {a.kind === "final" ? "essay" : "answers"}</GhostButton>
        <PrimaryButton onClick={go} disabled={!file}>Submit work</PrimaryButton>
      </div>
    </div>
  );
}

export default function Submit() {
  const { assessments, ready } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const due = assessments.filter((a) => a.status === "viva_due");

  const done = assessments.filter((a) => a.status === "awaiting_review" || a.status === "reviewed").length;
  const weightDone = assessments.filter((a) => a.status !== "not_started").reduce((n, a) => n + a.weight, 0);
  const stage = assessments.some((a) => a.status === "viva_due") ? 2 : assessments.some((a) => a.status === "awaiting_review") ? 3 : assessments.some((a) => a.status === "reviewed") ? 4 : 0;

  return (
    <>
      <PageTitle eyebrow="Assessment" title="Submit work" sub="Upload each piece of work for this module. After every submission you'll have a short spoken viva about it, so you can show you understand what you wrote." />

      {due.length > 0 && (
        <div className="fadein mb-6 flex items-center gap-3 rounded-xl border border-[#f5c2bd] bg-[#fff5f4] px-5 py-4" role="status">
          <NotifBadge count={due.length} label="vivas to do" />
          <p className="flex-1 text-[15px]"><span className="font-semibold">Next step:</span> talk through your work with the viva examiner. It takes about 5 minutes.</p>
          <Link href={`/submit/viva/${due[0].id}`}><PrimaryButton><Mic size={14} /> Start viva</PrimaryButton></Link>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5"><p className="text-xs text-ink2">Pieces of work</p><p className="tnum mt-1 text-3xl font-semibold">{assessments.length}</p></Card>
            <Card className="p-5"><p className="text-xs text-ink2">Vivas completed</p><p className="tnum mt-1 text-3xl font-semibold">{done}<span className="text-lg text-ink3"> / {assessments.length}</span></p></Card>
            <Card className="p-5"><p className="text-xs text-ink2">Module weight submitted</p><p className="tnum mt-1 text-3xl font-semibold">{weightDone}%</p></Card>
          </div>

          {!ready && <div className="skeleton h-24 w-full" />}
          {assessments.map((a) => {
            const st = STATUS[a.status];
            return (
              <Card key={a.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileText size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold">{a.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink2">
                      <span className="tnum">{a.weight}% of module</span>
                      <span className="flex items-center gap-1"><Clock size={13} /> Due {a.due}</span>
                      {a.workName && <span className="flex items-center gap-1"><FileText size={13} /> {a.workName}</span>}
                    </p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  {a.status === "not_started" && (
                    <PrimaryButton onClick={() => setOpen(open === a.id ? null : a.id)}><Upload size={14} /> Upload work</PrimaryButton>
                  )}
                  {a.status === "viva_due" && (
                    <Link href={`/submit/viva/${a.id}`} className="relative">
                      <PrimaryButton><Mic size={14} /> Do your viva</PrimaryButton>
                      <span className="absolute -right-1.5 -top-1.5"><NotifBadge count={1} /></span>
                    </Link>
                  )}
                  {a.status === "awaiting_review" && <span className="flex items-center gap-1.5 text-sm text-ink2"><CheckCircle2 size={14} className="text-green" /> Viva done, waiting for a person to review</span>}
                  {a.status === "reviewed" && <Link href="/rubric?tab=assess" className="text-sm font-medium text-accent underline-offset-2 hover:underline">See feedback</Link>}
                </div>
                {open === a.id && a.status === "not_started" && <Uploader a={a} onDone={() => setOpen(null)} />}
              </Card>
            );
          })}
        </div>

        <aside className="min-w-0 space-y-4">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">How it works</h2>
            <Steps
              current={stage}
              items={[
                { title: "Upload your work", body: "Upload your file (PDF, Word or text). Guardian removes any hidden instructions first." },
                { title: "Get rubric feedback", body: "Each criterion gets a colour and a note quoting your own sentences. No mark." },
                { title: "Talk it through", body: "A 5 minute spoken viva about what you wrote. Type if you prefer." },
                { title: "A person decides", body: "Your module leader reads the evidence and makes the call." },
              ]}
            />
          </Card>
          <Note icon={<Info size={16} />} title="Not a detector">
            The rubric is set by your module leader. The viva checks you understand your own work. It isn&apos;t a grade, and it never decides on its own.
          </Note>
          <Note icon={<Mic size={16} />} title="Prefer to type?">
            Every viva has a Voice and Text switch. Captions are always on, and you can ask for any question in plain English.
          </Note>
        </aside>
      </div>
    </>
  );
}
