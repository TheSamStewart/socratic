"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, CheckCircle2, FlaskConical, Info, Link2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Card, Dot, GhostButton, Note, PageTitle, PrimaryButton, Skeleton } from "@/components/ui";
import { Field, NumberInput, Section, Segmented, Select, TextArea, TextInput, Toggle } from "@/components/form";
import {
  AI_LEVELS, COMPONENT_TYPES, CREDITS, FORMATS, GRADE_BANDS, LEVELS, PERIODS, PROCESSORS, SEED_MODULES,
  blankModule, clearModules, formatInfo, loadModules, newComponent, newCriterion, newOutcome, newWeek,
  passMarkFor, readiness, saveModules, type ModuleConfig, type SessionType,
} from "@/lib/moduleConfig";

type Tab = "module" | "teaching" | "assessment" | "viva" | "access" | "data";
type Patch = (p: Partial<ModuleConfig>) => void;

const TABS: { value: Tab; label: string }[] = [
  { value: "module", label: "Module" },
  { value: "teaching", label: "Weekly teaching" },
  { value: "assessment", label: "Assessment" },
  { value: "viva", label: "Viva & Max" },
  { value: "access", label: "Accessibility" },
  { value: "data", label: "Data & integrations" },
];
const NEW = "__new";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => ({ value: d, label: d }));

export default function ModuleSettings() {
  const { ready } = useApp();
  const [mods, setMods] = useState<ModuleConfig[] | null>(null);
  const [saved, setSaved] = useState("");
  const [activeId, setActiveId] = useState(SEED_MODULES[0].id);
  const [tab, setTab] = useState<Tab>("module");
  const [flash, setFlash] = useState<string | null>(null);

  // Load after mount (browser storage), so server and client render the same first.
  useEffect(() => {
    const loaded = loadModules() ?? SEED_MODULES;
    setMods(loaded);
    setSaved(JSON.stringify(loaded));
    setActiveId(loaded[0].id);
    // Deep link to a section, e.g. /lecturer/settings?tab=teaching&module=psy2010
    const q = new URLSearchParams(window.location.search);
    const t = q.get("tab");
    if (TABS.some((x) => x.value === t)) setTab(t as Tab);
    const mod = q.get("module");
    if (mod && loaded.some((x) => x.id === mod)) setActiveId(mod);
  }, []);

  const dirty = mods !== null && JSON.stringify(mods) !== saved;
  const m = mods?.find((x) => x.id === activeId) ?? mods?.[0];

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!ready || !mods || !m) return <Skeleton className="h-64 w-full" />;

  const patch: Patch = (p) => setMods((ms) => ms!.map((x) => (x.id === m.id ? { ...x, ...p } : x)));
  const say = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 3500); };

  const pickModule = (v: string) => {
    if (v === NEW) {
      const b = blankModule();
      setMods([...mods, b]);
      setActiveId(b.id);
      setTab("module");
    } else setActiveId(v);
  };
  const save = () => {
    if (saveModules(mods)) { setSaved(JSON.stringify(mods)); say("Settings saved in this browser."); }
    else say("Couldn't save: browser storage is unavailable.");
  };
  const reset = () => {
    if (!window.confirm("Reset every module to the demo defaults? Your saved changes will be lost.")) return;
    clearModules();
    setMods(SEED_MODULES);
    setSaved(JSON.stringify(SEED_MODULES));
    setActiveId(SEED_MODULES[0].id);
    say("Reset to the demo defaults.");
  };

  return (
    <>
      <PageTitle
        eyebrow="Module leader"
        title="Module settings"
        sub="How Socratic runs on each module: weekly teaching format, assessment rules, the viva, accessibility and data. Set up once per module, per academic year."
        actions={<>
          <label className="sr-only" htmlFor="module-pick">Module</label>
          <Select id="module-pick" className="!mt-0 min-w-0 sm:!w-auto sm:min-w-[220px]" value={m.id} onValue={pickModule}
            options={[...mods.map((x) => ({ value: x.id, label: `${x.code} · ${x.title}` })), { value: NEW, label: "+ New module" }]} />
          {dirty && <span className="rounded bg-[#fdf3e3] px-2 py-1 text-xs font-medium text-amber-ink" role="status">Unsaved changes</span>}
          <GhostButton type="button" onClick={reset}><RotateCcw size={14} /> Reset</GhostButton>
          <PrimaryButton type="button" onClick={save} disabled={!dirty}><Save size={14} /> Save</PrimaryButton>
        </>}
      />

      {flash && (
        <p className="fadein mb-4 flex items-center gap-2 rounded bg-[#e6f4ec] px-3 py-2 text-sm" role="status">
          <CheckCircle2 size={14} className="text-green" /> {flash}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Segmented label="Settings sections" value={tab} onValue={setTab} options={TABS} />
          <Card className="space-y-6 p-5 sm:p-6">
            {tab === "module" && <ModuleTab m={m} patch={patch} />}
            {tab === "teaching" && <TeachingTab m={m} patch={patch} />}
            {tab === "assessment" && <AssessmentTab m={m} patch={patch} />}
            {tab === "viva" && <VivaTab m={m} patch={patch} />}
            {tab === "access" && <AccessTab m={m} patch={patch} />}
            {tab === "data" && <DataTab m={m} patch={patch} />}
          </Card>
        </div>
        <Summary m={m} />
      </div>
    </>
  );
}

/* ---------------- Module ---------------- */

function ModuleTab({ m, patch }: { m: ModuleConfig; patch: Patch }) {
  return (
    <>
      <Section title="Module details" sub="As in the approved module specification.">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field label="Module code"><TextInput value={m.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Module title"><TextInput value={m.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="School / department"><TextInput value={m.school} onChange={(e) => patch({ school: e.target.value })} /></Field>
          <Field label="Programmes" hint="Separate with semicolons"><TextInput value={m.programmes} onChange={(e) => patch({ programmes: e.target.value })} /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="FHEQ level" hint={`Pass mark ${passMarkFor(m.level)}% at this level`}>
            <Select value={m.level} options={LEVELS} onValue={(level) => patch({ level, passMark: passMarkFor(level) })} />
          </Field>
          <Field label="Credits" hint={`≈ ${m.credits * 10} hours of study (10 per credit)`}>
            <Select value={m.credits} options={CREDITS.map((c) => ({ value: c, label: `${c} credits (${c / 2} ECTS)` }))} onValue={(credits) => patch({ credits })} />
          </Field>
          <Field label="Academic year"><TextInput value={m.year} onChange={(e) => patch({ year: e.target.value })} placeholder="2026/27" /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Teaching period"><Select value={m.period} options={PERIODS} onValue={(period) => patch({ period })} /></Field>
          <Field label="Teaching weeks"><NumberInput min={1} max={30} value={m.teachingWeeks} onValue={(teachingWeeks) => patch({ teachingWeeks })} /></Field>
          <Field label="Reading week" hint="No teaching, no new material">
            <Select value={m.readingWeek ?? 0} onValue={(v) => patch({ readingWeek: v || null })}
              options={[{ value: 0, label: "None" }, ...Array.from({ length: m.teachingWeeks }, (_, i) => ({ value: i + 1, label: `Week ${i + 1}` }))]} />
          </Field>
        </div>
      </Section>

      <Section title="People" sub="Who can see reports and make decisions. Staff are matched to university accounts through single sign-on.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Module leader"><TextInput value={m.leader} onChange={(e) => patch({ leader: e.target.value })} /></Field>
          <Field label="Teaching team" hint="Lecturers and graduate teaching assistants (GTAs), separated by semicolons"><TextInput value={m.team} onChange={(e) => patch({ team: e.target.value })} /></Field>
          <Field label="External examiner" hint="Can view anonymised viva evidence when sampling"><TextInput value={m.externalExaminer} onChange={(e) => patch({ externalExaminer: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Links to university systems">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="VLE course page" hint="Moodle, Blackboard or Canvas"><TextInput type="url" value={m.vleUrl} onChange={(e) => patch({ vleUrl: e.target.value })} /></Field>
          <Field label="Student record module code" hint="e.g. the SITS module occurrence, for exporting results"><TextInput value={m.recordCode} onChange={(e) => patch({ recordCode: e.target.value })} /></Field>
        </div>
      </Section>
    </>
  );
}

/* ---------------- Weekly teaching ---------------- */

function TeachingTab({ m, patch }: { m: ModuleConfig; patch: Patch }) {
  const f = formatInfo(m.format);
  const setWeek = (id: string, p: Partial<ModuleConfig["weeks"][number]>) => patch({ weeks: m.weeks.map((w) => (w.id === id ? { ...w, ...p } : w)) });
  const defaultType: SessionType = m.format === "mixed" ? "labs" : m.format;
  const addWeek = () => {
    const used = new Set(m.weeks.map((w) => w.week));
    let n = 1;
    while (used.has(n) || n === m.readingWeek) n++;
    patch({ weeks: [...m.weeks, newWeek(n, defaultType)] });
  };
  const sorted = [...m.weeks].sort((a, b) => a.week - b.week);
  // Reading week shows in sequence as a non-teaching row.
  const rows: ({ kind: "week"; w: (typeof sorted)[number] } | { kind: "reading" })[] = [];
  let readingShown = !m.readingWeek;
  for (const w of sorted) {
    if (!readingShown && m.readingWeek! <= w.week) { rows.push({ kind: "reading" }); readingShown = true; }
    rows.push({ kind: "week", w });
  }
  if (!readingShown) rows.push({ kind: "reading" });

  return (
    <>
      <Section title="Teaching format" sub="How students meet the material each week. This decides what lecturers upload and how Max practises with students.">
        <Segmented label="Teaching format" value={m.format} onValue={(format) => patch({ format, weeks: format === "mixed" ? m.weeks : m.weeks.map((w) => ({ ...w, type: format })) })}
          options={FORMATS.map((x) => ({ value: x.value, label: x.label }))} />
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="rounded-md border border-line bg-subtle p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink3">What students see</p>
            <p className="mt-2 font-semibold">{f.plural} → {f.maxName}</p>
            <p className="mt-1 leading-relaxed text-ink2">{f.maxRole}</p>
            <p className="mt-2 text-xs text-ink3">Lecturers upload: {f.material.toLowerCase()}{m.format === "seminars" ? ", discussion topics and the position Max argues" : " and key topics"}.</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Release day"><Select value={m.releaseDay} options={DAYS} onValue={(releaseDay) => patch({ releaseDay })} /></Field>
              <Field label="Time"><TextInput type="time" value={m.releaseTime} onChange={(e) => patch({ releaseTime: e.target.value })} /></Field>
            </div>
            <Toggle label="Preparation required" hint="Students should finish it before the session" checked={m.prepRequired} onChange={(prepRequired) => patch({ prepRequired })} />
          </div>
        </div>
      </Section>

      <Section title="Week by week" sub={`${m.weeks.filter((w) => w.published).length} of ${m.weeks.length} published`}
        actions={<GhostButton type="button" onClick={addWeek}><Plus size={14} /> Add week</GhostButton>}>
        {rows.length === 0 && <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-ink2">No weeks yet. Add the first week&apos;s {f.material.toLowerCase()}.</p>}
        <ul className="space-y-3">
          {rows.map((r) => r.kind === "reading" ? (
            <li key="reading" className="flex items-center gap-2 rounded border border-dashed border-line-strong px-4 py-2.5 text-sm text-ink2">
              <BookOpen size={14} /> Week {m.readingWeek}: reading week, no teaching
            </li>
          ) : (
            <WeekRow key={r.w.id} w={r.w} mixed={m.format === "mixed"} onChange={(p) => setWeek(r.w.id, p)}
              onRemove={() => patch({ weeks: m.weeks.filter((x) => x.id !== r.w.id) })} />
          ))}
        </ul>
        <div className="mt-4">
          <Field label="Module reading list" hint="Talis Aspire or Leganto list. Seminar readings link here."><TextInput type="url" value={m.readingListUrl} onChange={(e) => patch({ readingListUrl: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Engagement">
        <Toggle label="Count Max practice as engagement" checked={m.countEngagement} onChange={(countEngagement) => patch({ countEngagement })}
          hint="Off by default. If on, practice counts as a light-touch engagement point. It never replaces attendance monitoring for students on a Student visa (UKVI)." />
      </Section>
    </>
  );
}

function WeekRow({ w, mixed, onChange, onRemove }: { w: ModuleConfig["weeks"][number]; mixed: boolean; onChange: (p: Partial<ModuleConfig["weeks"][number]>) => void; onRemove: () => void }) {
  const f = formatInfo(w.type);
  const seminar = w.type === "seminars";
  return (
    <li className="rounded-md border border-line p-4">
      <div className="grid gap-3 sm:grid-cols-[80px_1fr_auto]">
        <Field label="Week"><NumberInput min={1} value={w.week} onValue={(week) => onChange({ week })} /></Field>
        <Field label="Title"><TextInput value={w.title} onChange={(e) => onChange({ title: e.target.value })} placeholder={seminar ? "e.g. Conformity" : "e.g. Sampling"} /></Field>
        <div className="flex items-end gap-2">
          {mixed && (
            <Field label="Type"><Select value={w.type} onValue={(type) => onChange({ type })} options={FORMATS.filter((x) => x.value !== "mixed").map((x) => ({ value: x.value as SessionType, label: x.label.replace(/s$/, "") }))} /></Field>
          )}
          <label className="mb-2 flex items-center gap-2 whitespace-nowrap text-xs font-medium text-ink2">
            <input type="checkbox" checked={w.published} onChange={(e) => onChange({ published: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Published
          </label>
          <button type="button" onClick={onRemove} aria-label={`Remove week ${w.week}`} className="mb-1 rounded p-1.5 text-ink3 hover:bg-subtle hover:text-red"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={seminar ? "Discussion topics" : "Key topics"} hint="Comma separated. Each becomes a concept on the mastery map.">
          <TextInput value={w.topics} onChange={(e) => onChange({ topics: e.target.value })} />
        </Field>
        <Field label={f.material}><TextInput value={w.material} onChange={(e) => onChange({ material: e.target.value })} placeholder={seminar ? "Author (year) Title" : "file name or link"} /></Field>
      </div>
      {seminar && (
        <div className="mt-3">
          <Field label="Position Max argues" hint="A plausible but flawed reading of the text, for students to challenge with evidence.">
            <TextInput value={w.maxPosition} onChange={(e) => onChange({ maxPosition: e.target.value })} />
          </Field>
        </div>
      )}
    </li>
  );
}

/* ---------------- Assessment ---------------- */

function AssessmentTab({ m, patch }: { m: ModuleConfig; patch: Patch }) {
  const total = m.components.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const critTotal = m.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const setComp = (id: string, p: Partial<ModuleConfig["components"][number]>) => patch({ components: m.components.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const loLabel = (id: string) => `LO${m.outcomes.findIndex((o) => o.id === id) + 1}`;

  return (
    <>
      <Section title="Assessment components" sub="Weights must add up to 100%. Tick which learning outcomes each component tests."
        actions={<GhostButton type="button" onClick={() => patch({ components: [...m.components, newComponent()] })}><Plus size={14} /> Add component</GhostButton>}>
        <ul className="space-y-3">
          {m.components.map((c) => (
            <li key={c.id} className="rounded-md border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_170px_90px_130px_auto]">
                <Field label="Name"><TextInput value={c.name} onChange={(e) => setComp(c.id, { name: e.target.value })} /></Field>
                <Field label="Type"><Select value={c.type} options={COMPONENT_TYPES} onValue={(type) => setComp(c.id, { type })} /></Field>
                <Field label="Weight %"><NumberInput min={0} max={100} value={c.weight} onValue={(weight) => setComp(c.id, { weight })} /></Field>
                <Field label="Due (week / period)"><TextInput value={c.dueWeek} onChange={(e) => setComp(c.id, { dueWeek: e.target.value })} /></Field>
                <div className="flex items-end">
                  <button type="button" onClick={() => patch({ components: m.components.filter((x) => x.id !== c.id) })} aria-label={`Remove ${c.name || "component"}`} className="mb-1 rounded p-1.5 text-ink3 hover:bg-subtle hover:text-red"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink2">
                <span className="font-medium">Tests:</span>
                {m.outcomes.length === 0 && <span className="text-ink3">Add learning outcomes below</span>}
                {m.outcomes.map((o) => (
                  <label key={o.id} className="flex items-center gap-1.5" title={o.text}>
                    <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-accent)]" checked={c.outcomes.includes(o.id)}
                      onChange={(e) => setComp(c.id, { outcomes: e.target.checked ? [...c.outcomes, o.id] : c.outcomes.filter((x) => x !== o.id) })} />
                    {loLabel(o.id)}
                  </label>
                ))}
                <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
                <label className="flex items-center gap-1.5"><input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-accent)]" checked={c.viva} onChange={(e) => setComp(c.id, { viva: e.target.checked })} /> Spoken viva after submission</label>
                <label className="flex items-center gap-1.5" title="A core component must be passed and can't be compensated"><input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-accent)]" checked={c.core} onChange={(e) => setComp(c.id, { core: e.target.checked })} /> Core (must pass)</label>
                <label className="flex items-center gap-1.5">AI use
                  <Select className="!mt-0 !w-auto !py-1 text-xs" value={c.aiLevel} options={AI_LEVELS} onValue={(aiLevel) => setComp(c.id, { aiLevel })} />
                </label>
              </div>
            </li>
          ))}
        </ul>
        <TotalBar total={total} />
      </Section>

      <Section title="Pass rules and policies" sub="Defaults follow common UK regulations. Check them against your university's assessment regulations.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Module pass mark %" hint={m.passMark !== passMarkFor(m.level) ? `Level ${m.level} usually uses ${passMarkFor(m.level)}%` : `Standard for level ${m.level}`}>
            <NumberInput min={0} max={100} value={m.passMark} onValue={(passMark) => patch({ passMark })} />
          </Field>
          <Field label="Qualifying mark %" hint="Minimum on a core component"><NumberInput min={0} max={100} value={m.qualifyingMark} onValue={(qualifyingMark) => patch({ qualifyingMark })} /></Field>
          <Field label="Feedback returned within" hint="Working days after submission"><NumberInput min={1} max={40} value={m.feedbackDays} onValue={(feedbackDays) => patch({ feedbackDays })} /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Late submission penalty"><TextInput value={m.latePenalty} onChange={(e) => patch({ latePenalty: e.target.value })} /></Field>
          <Field label="Reassessment"><TextInput value={m.reassessment} onChange={(e) => patch({ reassessment: e.target.value })} /></Field>
          <Field label="Moderation sample %" hint="Share of scripts second-marked; the external examiner sees a sample too"><NumberInput min={0} max={100} value={m.moderationPct} onValue={(moderationPct) => patch({ moderationPct })} /></Field>
        </div>
        <div className="mt-2 divide-y divide-line">
          <Toggle label="Compensation allowed" hint="A marginal fail on a non-core component can be balanced by other marks" checked={m.compensation} onChange={(compensation) => patch({ compensation })} />
          <Toggle label="Anonymous marking" hint="Markers see a candidate number, not a name, until marks are confirmed. Vivas can't be anonymous, so they're kept as evidence, not marks." checked={m.anonymousMarking} onChange={(anonymousMarking) => patch({ anonymousMarking })} />
        </div>
      </Section>

      <Section title="Viva marking criteria" sub="What the examiner and marker look for in the work and the spoken answers. Weights must add up to 100%."
        actions={<GhostButton type="button" onClick={() => patch({ criteria: [...m.criteria, newCriterion()] })}><Plus size={14} /> Add criterion</GhostButton>}>
        <div className="grid gap-5 md:grid-cols-[1fr_250px]">
          <div>
            <ul className="space-y-2">
              {m.criteria.map((k) => (
                <li key={k.id} className="grid grid-cols-[1fr_90px_auto] items-end gap-2">
                  <TextInput aria-label="Criterion" value={k.name} onChange={(e) => patch({ criteria: m.criteria.map((x) => (x.id === k.id ? { ...x, name: e.target.value } : x)) })} />
                  <NumberInput aria-label="Weight %" min={0} max={100} value={k.weight} onValue={(weight) => patch({ criteria: m.criteria.map((x) => (x.id === k.id ? { ...x, weight } : x)) })} />
                  <button type="button" onClick={() => patch({ criteria: m.criteria.filter((x) => x.id !== k.id) })} aria-label={`Remove ${k.name || "criterion"}`} className="mb-1 rounded p-1.5 text-ink3 hover:bg-subtle hover:text-red"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
            <TotalBar total={critTotal} />
          </div>
          <div className="rounded-md border border-line">
            <p className="border-b border-line bg-subtle px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink2">UK grade bands</p>
            <table className="w-full text-sm"><tbody>
              {GRADE_BANDS.map((g) => <tr key={g.band} className="border-b border-line last:border-0"><td className="px-3 py-1.5">{g.band}</td><td className="tnum whitespace-nowrap px-3 py-1.5 text-right text-ink2">{g.range}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      </Section>

      <Section title="Intended learning outcomes" sub="Usually 4 to 6 per module, worded for the module's FHEQ level."
        actions={<GhostButton type="button" onClick={() => patch({ outcomes: [...m.outcomes, newOutcome()] })}><Plus size={14} /> Add outcome</GhostButton>}>
        <ol className="space-y-2">
          {m.outcomes.map((o, i) => {
            const by = m.components.filter((c) => c.outcomes.includes(o.id));
            return (
              <li key={o.id} className="grid grid-cols-[44px_1fr_auto] items-start gap-2">
                <span className="mt-3 text-sm font-semibold text-ink2">LO{i + 1}</span>
                <div>
                  <TextInput aria-label={`Learning outcome ${i + 1}`} className="!mt-0" value={o.text} onChange={(e) => patch({ outcomes: m.outcomes.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                  <p className={`mt-1 text-xs ${by.length ? "text-ink3" : "text-amber-ink"}`}>{by.length ? `Assessed by: ${by.map((c) => c.name || "unnamed").join(", ")}` : "Not assessed by any component yet"}</p>
                </div>
                <button type="button" onClick={() => patch({ outcomes: m.outcomes.filter((x) => x.id !== o.id), components: m.components.map((c) => ({ ...c, outcomes: c.outcomes.filter((x) => x !== o.id) })) })}
                  aria-label={`Remove LO${i + 1}`} className="mt-1.5 rounded p-1.5 text-ink3 hover:bg-subtle hover:text-red"><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 max-w-md">
          <Field label="QAA Subject Benchmark Statement"><TextInput value={m.benchmark} onChange={(e) => patch({ benchmark: e.target.value })} placeholder="e.g. Computing" /></Field>
        </div>
      </Section>
    </>
  );
}

function TotalBar({ total }: { total: number }) {
  const ok = total === 100;
  return (
    <div className="mt-3 flex items-center gap-3 text-sm" role="status">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-[width] ${ok ? "bg-green" : total > 100 ? "bg-red" : "bg-amber"}`} style={{ width: `${Math.min(total, 100)}%` }} />
      </div>
      <span className={`tnum font-medium ${ok ? "text-green" : "text-amber-ink"}`}>{total}%{!ok && (total > 100 ? ` · ${total - 100}% over` : ` · ${100 - total}% to allocate`)}</span>
    </div>
  );
}

/* ---------------- Viva & Max ---------------- */

function VivaTab({ m, patch }: { m: ModuleConfig; patch: Patch }) {
  const vivaFor = m.components.filter((c) => c.viva);
  return (
    <>
      <Section title="Purpose of the viva" sub={vivaFor.length ? `Runs after: ${vivaFor.map((c) => c.name).join(", ")}` : "No component has a viva yet. Turn it on in Assessment."}>
        <Segmented label="Viva purpose" value={m.vivaPurpose} onValue={(vivaPurpose) => patch({ vivaPurpose })}
          options={[{ value: "authenticity", label: "Check understanding of submitted work" }, { value: "formative", label: "Formative practice only" }]} />
        <Note className="mt-3" icon={<Info size={15} />}>
          {m.vivaPurpose === "authenticity"
            ? "The viva gathers evidence that a student understands their own work. It doesn't mark the work or decide misconduct: a person reviews the evidence and decides, following your academic integrity policy."
            : "Students can practise explaining their work. Nothing is shared with markers unless the student chooses to."}
        </Note>
      </Section>

      <Section title="Conversation">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Suggested length" hint="Soft timer, never cuts off"><NumberInput min={2} max={30} value={m.vivaMinutes} onValue={(vivaMinutes) => patch({ vivaMinutes })} /></Field>
          <Field label="Questions"><NumberInput min={2} max={12} value={m.vivaQuestions} onValue={(vivaQuestions) => patch({ vivaQuestions })} /></Field>
          <Field label="Window (days)" hint="After submission"><NumberInput min={1} max={28} value={m.vivaWindowDays} onValue={(vivaWindowDays) => patch({ vivaWindowDays })} /></Field>
          <Field label="Attempts"><NumberInput min={1} max={3} value={m.attempts} onValue={(attempts) => patch({ attempts })} /></Field>
        </div>
        <div className="mt-2 divide-y divide-line">
          <Toggle label="One follow-up question when an answer is vague" checked={m.followUp} onChange={(followUp) => patch({ followUp })} />
          <Toggle label={`Hand over to ${formatInfo(m.format).maxName} on a misconception`} hint="Max takes the mistaken view and the student corrects him, then the viva carries on" checked={m.maxHandover} onChange={(maxHandover) => patch({ maxHandover })} />
          <Toggle label="Allow 'Say that in plain English'" hint="Rewords the question without hints. Supports students working in a second language." checked={m.allowRephrase} onChange={(allowRephrase) => patch({ allowRephrase })} />
        </div>
      </Section>

      <Section title="How students can take part" sub="Students choose. At least one of voice or text must stay on.">
        <div className="divide-y divide-line">
          <Toggle label="Voice" checked={m.allowVoice} onChange={(allowVoice) => patch({ allowVoice: allowVoice || !m.allowText ? allowVoice : true })} />
          <Toggle label="Text" hint="Typed answers. Recommended to keep on for accessibility." checked={m.allowText} onChange={(allowText) => patch({ allowText: allowText || !m.allowVoice ? allowText : true })} />
          <Toggle label="Video examiner" hint="An animated examiner face. The student's camera is optional and never recorded." checked={m.allowVideo} onChange={(allowVideo) => patch({ allowVideo })} />
        </div>
      </Section>

      <Section title="Human oversight">
        <div className="max-w-xs">
          <Field label="Send to a person below this confidence" hint="The marker's confidence, 0 to 1. Lower-confidence results are flagged for review.">
            <NumberInput min={0} max={1} step={0.05} value={m.reviewThreshold} onValue={(reviewThreshold) => patch({ reviewThreshold: Math.min(1, Math.max(0, reviewThreshold)) })} />
          </Field>
        </div>
        <div className="mt-2 divide-y divide-line">
          <Toggle locked label="A person makes every final decision" checked hint="Socratic suggests; the module leader decides. Required by the Russell Group principles and most university AI policies." />
          <Toggle locked label="No automatic penalties or misconduct findings" checked hint="Concerns are raised neutrally for a conversation, never as an accusation." />
          <Toggle locked label="No AI-detector scores" checked hint="Detectors are unreliable and most UK universities advise against them." />
        </div>
      </Section>

      <Section title="AI-use statement for students" sub="Shown on the brief and before the viva. Set the AI-use level for each component in Assessment.">
        <TextArea value={m.aiStatement} onChange={(e) => patch({ aiStatement: e.target.value })} />
      </Section>
    </>
  );
}

/* ---------------- Accessibility ---------------- */

function AccessTab({ m, patch }: { m: ModuleConfig; patch: Patch }) {
  return (
    <>
      <Section title="Reasonable adjustments" sub="Applied automatically for students with a support plan from Disability Services. Students never have to explain why.">
        <div className="divide-y divide-line">
          <Toggle label="Extra time" hint="Hides the viva timer and doubles the response pause" checked={m.adjExtraTime} onChange={(adjExtraTime) => patch({ adjExtraTime })} />
          <Toggle label="Text-only alternative to speaking" checked={m.adjTextOnly} onChange={(adjTextOnly) => patch({ adjTextOnly })} />
          <Toggle label="Rest breaks" hint="Students can pause the viva and come back within the window" checked={m.adjRestBreaks} onChange={(adjRestBreaks) => patch({ adjRestBreaks })} />
          <Toggle label="Written alternative to the viva" hint="Short written answers to the same questions, reviewed by a person" checked={m.adjWritten} onChange={(adjWritten) => patch({ adjWritten })} />
          <Toggle locked label="Captions on spoken questions" checked />
        </div>
      </Section>
      <Section title="Language">
        <Toggle label="Offer the viva in Welsh" hint="For institutions in Wales under the Welsh Language Standards" checked={m.welsh} onChange={(welsh) => patch({ welsh })} />
      </Section>
      <Section title="Accessibility statement" sub="Required for public sector websites, including universities (WCAG 2.2 AA).">
        <div className="max-w-lg"><Field label="Statement link"><TextInput type="url" value={m.accessibilityUrl} onChange={(e) => patch({ accessibilityUrl: e.target.value })} /></Field></div>
      </Section>
    </>
  );
}

/* ---------------- Data & integrations ---------------- */

function DataTab({ m, patch }: { m: ModuleConfig; patch: Patch }) {
  return (
    <>
      <Section title="Data protection" sub="Agree these with your Data Protection Officer before use.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lawful basis (UK GDPR)"><TextInput value={m.lawfulBasis} onChange={(e) => patch({ lawfulBasis: e.target.value })} /></Field>
          <Field label="DPIA reference" hint="Data Protection Impact Assessment, required for new AI processing"><TextInput value={m.dpiaRef} onChange={(e) => patch({ dpiaRef: e.target.value })} placeholder="e.g. DPIA-2026-041" /></Field>
          <Field label="Keep viva transcripts for" hint="Until the exam board and any appeals are finished, then deleted">
            <Select value={m.retentionMonths} onValue={(retentionMonths) => patch({ retentionMonths })} options={[6, 12, 18, 24].map((n) => ({ value: n, label: `${n} months` }))} />
          </Field>
          <Field label="Student privacy notice"><TextInput type="url" value={m.privacyUrl} onChange={(e) => patch({ privacyUrl: e.target.value })} /></Field>
        </div>
        <div className="mt-2 divide-y divide-line">
          <Toggle locked label="Student audio is never stored" checked hint="Speech is turned into text in the browser; only the text is kept." />
          <Toggle locked label="Camera is never recorded or sent" checked />
          <Toggle locked label="Student work is not used to train AI models" checked />
        </div>
      </Section>

      <Section title="Processors">
        <ul className="divide-y divide-line rounded-md border border-line text-sm">
          {PROCESSORS.map((p) => <li key={p.name} className="px-4 py-2.5"><p className="font-medium">{p.name}</p><p className="text-xs text-ink2">{p.purpose}</p></li>)}
        </ul>
      </Section>

      <Section title="Integrations" sub="Not connected in this demo.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Integration title="VLE (LTI 1.3)" body="Launch Socratic from Moodle, Blackboard or Canvas, with students and roles passed in." />
          <Integration title="Single sign-on" body="University login through Shibboleth (UK Access Federation) or Microsoft Entra ID." />
          <Integration title="Student records" body="Send confirmed outcomes to SITS or Banner after the exam board." />
        </div>
      </Section>
    </>
  );
}

function Integration({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-line p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><Link2 size={14} className="text-ink3" /> {title}</p>
        <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink3">Demo only</span>
      </div>
      <p className="text-xs leading-relaxed text-ink2">{body}</p>
      <p className="mt-2 text-xs font-medium text-ink3">Not connected</p>
    </div>
  );
}

/* ---------------- Summary ---------------- */

function Summary({ m }: { m: ModuleConfig }) {
  const checks = useMemo(() => readiness(m), [m]);
  const done = checks.filter((c) => c.ok).length;
  const f = formatInfo(m.format);
  const row = (k: string, v: ReactNode) => <div className="flex justify-between gap-3 py-1.5"><dt className="text-ink2">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
  return (
    <div className="min-w-0 space-y-4 xl:sticky xl:top-0">
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{m.code}</p>
        <p className="text-lg font-semibold leading-snug">{m.title}</p>
        <dl className="mt-3 divide-y divide-line text-sm">
          {row("Level", `FHEQ ${m.level}`)}
          {row("Credits", m.credits)}
          {row("Period", PERIODS.find((p) => p.value === m.period)?.label)}
          {row("Format", <span className="inline-flex items-center gap-1.5">{m.format === "labs" ? <FlaskConical size={13} className="text-ink3" /> : <BookOpen size={13} className="text-ink3" />}{f.label}</span>)}
          {row("Pass mark", `${m.passMark}%`)}
          {row("Viva", m.components.some((c) => c.viva) ? `${m.vivaMinutes} min · ${m.vivaQuestions} questions` : "Off")}
        </dl>
      </Card>
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Ready for students</p>
          <span className="tnum text-sm text-ink2">{done}/{checks.length}</span>
        </div>
        <ul className="space-y-2 text-[13px]">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              <span className="mt-1"><Dot status={c.ok ? "green" : "amber"} /></span>
              <span className={c.ok ? "text-ink2" : "text-ink"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Note icon={<Info size={15} />} title="Draft settings">
        Saved in this browser only. They don&apos;t change the student experience yet.
      </Note>
    </div>
  );
}
