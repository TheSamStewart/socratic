"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw, Upload } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import ChatPanel from "@/components/ChatPanel";
import { Empty, GhostButton, PageTitle, PrimaryButton, Skeleton } from "@/components/ui";
import { sessionExists } from "@/lib/viva";
import type { Session } from "@/lib/types";

export default function VivaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { assessments, patchAssessment, notify, markRead, ready, student } = useApp();
  const a = assessments.find((x) => x.id === id);

  // The backend keeps sessions in memory, so a restart forgets them. Check before opening the call.
  const sessionId = a?.session?.id;
  const [alive, setAlive] = useState<boolean | null | undefined>(undefined);
  useEffect(() => {
    if (!sessionId) return;
    let off = false;
    setAlive(undefined);
    sessionExists(sessionId).then((ok) => { if (!off) setAlive(ok); });
    return () => { off = true; };
  }, [sessionId]);

  /** Fresh start: forget this submission and its viva, then upload again. */
  const startOver = () => {
    if (!a) return;
    patchAssessment(a.id, { status: "not_started", session: undefined, workName: undefined, decision: undefined });
    router.push("/submit");
  };

  const onSession = (s: Session) => {
    if (!a) return;
    if ((s.mode === "recap" || s.mode === "done") && a.status === "viva_due") {
      patchAssessment(a.id, { session: s, status: "awaiting_review" });
    } else {
      patchAssessment(a.id, { session: s });
    }
  };

  // When the viva finishes: clear the student's nudge and tell the module leader.
  useEffect(() => {
    if (a?.status === "awaiting_review") {
      markRead("/submit");
      notify("lecturer", `${student} completed the viva for "${a.title}". Evidence is ready for your decision.`, "/lecturer/reports");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.status === "awaiting_review"]);

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!a || !a.session)
    return (
      <Empty
        icon={<Upload size={18} />}
        title="Submit your work first"
        body="Your viva is about your own submission, so we need it first."
        action={<Link href="/submit"><PrimaryButton>Go to Submit work</PrimaryButton></Link>}
      />
    );

  if (alive === undefined) return <Skeleton className="h-64 w-full" />;
  if (alive === false)
    return (
      <Empty
        icon={<RotateCcw size={18} />}
        title="This viva has expired"
        body="The Socratic server was restarted, so it no longer has this viva. Upload your work again to start a fresh one."
        action={<PrimaryButton onClick={startOver}><Upload size={14} /> Start a fresh viva</PrimaryButton>}
      />
    );

  return (
    <>
      <Link href="/submit" className="mb-3 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ArrowLeft size={14} /> Submit work</Link>
      <PageTitle eyebrow="Viva" title={a.title} sub="A short spoken conversation about your own work. Press start, listen, then answer out loud. The timer is a guide and never cuts you off."
        actions={<GhostButton type="button" onClick={() => { if (window.confirm("Start over? This viva will be discarded and you'll upload your work again.")) startOver(); }}><RotateCcw size={14} /> Start over</GhostButton>} />
      <ChatPanel kind="viva" session={a.session} onSession={onSession} railTitle="Topics covered" />
    </>
  );
}
