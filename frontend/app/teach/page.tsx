"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileText, FlaskConical, Loader2, RotateCcw, Upload } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import ChatPanel from "@/components/ChatPanel";
import { Dot, Empty, GhostButton, PageTitle, PrimaryButton, Skeleton } from "@/components/ui";
import { labRubricText, labWorkText } from "@/lib/course";
import { errorText, sessionExists, submitWork } from "@/lib/viva";
import type { Session } from "@/lib/types";

export default function Teach() {
  const { labs, mastery, labSessions, saveLabSession, assessments, patchAssessment, student, ready } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const finalA = assessments.find((a) => a.kind === "final" && a.session);
  const wantFinal = params.get("a") === "final" && !!finalA;
  const [labId, setLabId] = useState<string | null>(params.get("lab"));
  const [useFinal, setUseFinal] = useState(wantFinal);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<string | null>(null);
  const defaulted = useRef(false);
  const concept = params.get("concept");

  // Open on the submitted essay by default: it is the session the backend already holds.
  useEffect(() => {
    if (ready && !defaulted.current) {
      defaulted.current = true;
      if (finalA && !params.get("lab")) setUseFinal(true);
    }
  }, [ready, finalA, params]);

  const lab = labs.find((l) => l.id === labId) ?? [...labs].sort((a, b) => b.week - a.week)[0];
  const labSession = lab ? labSessions[lab.id] : undefined;

  // Labs get a real backend session (POST /api/submit) the first time they are opened.
  const create = async (l: NonNullable<typeof lab>) => {
    if (inflight.current === l.id) return;
    inflight.current = l.id;
    setCreating(l.id);
    setError(null);
    try {
      const { data } = await submitWork(student, labWorkText(l), labRubricText(l));
      saveLabSession(l.id, { ...data, mode: "teach_max" });
    } catch (e) {
      setError(errorText(e));
    }
    inflight.current = null;
    setCreating(null);
  };
  useEffect(() => {
    // No lab picked yet and an essay exists: the essay is the default, so do not create a lab session.
    if (ready && !useFinal && lab && !labSession && !error && !(finalA && !labId)) create(lab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, useFinal, lab?.id, !!labSession, labId, !!finalA]);

  // Sessions live in backend memory, so a restart forgets them while the browser keeps its copy.
  // Check each one before chatting: a lab is simply rebuilt; the essay needs uploading again.
  const session: Session | undefined = useFinal && finalA ? finalA.session : labSession;
  const [alive, setAlive] = useState<Record<string, boolean | null>>({});
  const sid = session?.id;
  useEffect(() => {
    if (!sid || sid in alive) return;
    let off = false;
    sessionExists(sid).then((ok) => {
      if (off) return;
      setAlive((m) => ({ ...m, [sid]: ok }));
      if (ok === false && !useFinal && lab) create(lab); // rebuild the lab session
    });
    return () => { off = true; };
  }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps
  const status = sid ? alive[sid] : undefined;

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (labs.length === 0 && !finalA)
    return <Empty icon={<FlaskConical size={18} />} title="No labs yet" body="Your module leader uploads each week's lab here. Max will be ready when they do." />;

  const essayExpired = useFinal && !!finalA && status === false;
  const reupload = () => {
    if (!finalA) return;
    patchAssessment(finalA.id, { status: "not_started", session: undefined, workName: undefined, decision: undefined });
    router.push("/submit");
  };
  const onSession = (s: Session) => {
    if (useFinal && finalA) patchAssessment(finalA.id, { session: s });
    else if (lab) saveLabSession(lab.id, s);
  };

  return (
    <>
      <PageTitle eyebrow="Weekly labs" title="Teach Max" sub="Pick a weekly lab or your own submission. Max has some of it wrong, and teaching him is the best way to check you understand it." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5" role="tablist" aria-label="What to practise">
        {finalA && (
          <button role="tab" aria-selected={useFinal} onClick={() => setUseFinal(true)}
            className={`rounded-xl border p-4 text-left transition-colors ${useFinal ? "border-accent bg-white ring-1 ring-accent" : "border-line bg-white hover:bg-subtle"}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink2"><FileText size={12} /> Your final piece</div>
            <p className="mt-0.5 font-medium">Concepts from your essay</p>
            <div className="mt-2 flex gap-1.5">{finalA.session!.concepts.map((c) => <Dot key={c.id} status={c.status} size={10} />)}</div>
          </button>
        )}
        {labs.map((l) => {
          const active = !useFinal && l.id === lab?.id;
          const cs = labSessions[l.id]?.concepts;
          return (
            <button key={l.id} role="tab" aria-selected={active} onClick={() => { setUseFinal(false); setLabId(l.id); setError(null); }}
              className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-accent bg-white ring-1 ring-accent" : "border-line bg-white hover:bg-subtle"}`}>
              <div className="flex items-center justify-between text-xs text-ink2">
                <span className="font-semibold uppercase tracking-wide">Week {l.week}</span>
                {l.isNew && <span className="rounded bg-[#e5372a] px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
              </div>
              <p className="mt-0.5 font-medium">{l.title}</p>
              <div className="mt-2 flex gap-1.5">
                {(cs ? cs.map((c) => ({ id: c.id, status: c.status })) : l.concepts.map((c) => ({ id: c.id, status: mastery[c.id] ?? ("untested" as const) }))).map((c) => <Dot key={c.id} status={c.status} size={10} />)}
              </div>
            </button>
          );
        })}
      </div>

      {error && (!session || status === false) && (
        <div className="flex items-center gap-3 rounded border border-[#f5c2bd] bg-[#fff5f4] px-4 py-3 text-sm" role="alert">
          <span className="flex-1 text-[#b42318]">{error}</span>
          {lab && <GhostButton onClick={() => create(lab)}><RotateCcw size={14} /> Retry</GhostButton>}
        </div>
      )}
      {essayExpired && (
        <Empty
          icon={<RotateCcw size={18} />}
          title="Max lost track of your essay"
          body="The Socratic server was restarted, so it no longer has your submission. Upload it again to practise with Max (weekly labs still work)."
          action={<PrimaryButton onClick={reupload}><Upload size={14} /> Upload my essay again</PrimaryButton>}
        />
      )}
      {!essayExpired && (!session || status === undefined || status === false) && !error && (
        <div className="flex items-center gap-3 rounded border border-line bg-white px-4 py-6 text-ink2" role="status">
          <Loader2 size={16} className="animate-spin" /> {creating ? `Getting Max ready for Week ${lab?.week}…` : "Loading…"}
        </div>
      )}
      {session && (status === true || status === null) && (
        <ChatPanel
          key={session.id}
          kind="max"
          session={session}
          onSession={onSession}
          focusConceptId={concept}
          railTitle={useFinal ? "Your final piece" : `Week ${lab?.week}: ${lab?.title}`}
          subtitle={useFinal ? "Practising the concepts from your own submission" : lab?.summary}
        />
      )}
    </>
  );
}
