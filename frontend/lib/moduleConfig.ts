// Module settings (lecturer): a draft of what a UK university would configure per module.
// Frontend only and stored in this browser. Nothing here changes the student experience yet.
import { SEED_LABS } from "./course";

export type Format = "labs" | "seminars" | "tutorials" | "workshops" | "mixed";
export type SessionType = Exclude<Format, "mixed">;
export type ComponentType = "coursework" | "exam" | "in_class_test" | "presentation" | "portfolio";
export type Period = "sem1" | "sem2" | "term1" | "term2" | "term3" | "full_year";

export type WeeklySession = {
  id: string;
  week: number;
  title: string;
  type: SessionType;
  topics: string;
  /** Seminars: the set reading. Labs: the lab sheet. */
  material: string;
  /** Seminars only: the position Max argues from the reading. */
  maxPosition: string;
  published: boolean;
};

export type AssessmentComponent = {
  id: string;
  name: string;
  type: ComponentType;
  weight: number;
  dueWeek: string;
  outcomes: string[];
  viva: boolean;
  core: boolean;
  aiLevel: number;
};

export type LearningOutcome = { id: string; text: string };
export type Criterion = { id: string; name: string; weight: number };

export type ModuleConfig = {
  id: string;
  // Module
  code: string;
  title: string;
  school: string;
  programmes: string;
  level: number;
  credits: number;
  year: string;
  period: Period;
  teachingWeeks: number;
  readingWeek: number | null;
  leader: string;
  team: string;
  externalExaminer: string;
  vleUrl: string;
  recordCode: string;
  // Weekly teaching
  format: Format;
  releaseDay: string;
  releaseTime: string;
  prepRequired: boolean;
  weeks: WeeklySession[];
  countEngagement: boolean;
  readingListUrl: string;
  // Assessment
  components: AssessmentComponent[];
  passMark: number;
  qualifyingMark: number;
  compensation: boolean;
  reassessment: string;
  latePenalty: string;
  anonymousMarking: boolean;
  feedbackDays: number;
  moderationPct: number;
  criteria: Criterion[];
  outcomes: LearningOutcome[];
  benchmark: string;
  // Viva & Max
  vivaPurpose: "authenticity" | "formative";
  vivaMinutes: number;
  vivaQuestions: number;
  followUp: boolean;
  maxHandover: boolean;
  vivaWindowDays: number;
  attempts: number;
  allowVoice: boolean;
  allowText: boolean;
  allowVideo: boolean;
  allowRephrase: boolean;
  reviewThreshold: number;
  aiStatement: string;
  // Accessibility
  adjExtraTime: boolean;
  adjTextOnly: boolean;
  adjRestBreaks: boolean;
  adjWritten: boolean;
  welsh: boolean;
  accessibilityUrl: string;
  // Data
  retentionMonths: number;
  lawfulBasis: string;
  dpiaRef: string;
  privacyUrl: string;
};

export const FORMATS: { value: Format; label: string; plural: string; maxName: string; material: string; maxRole: string }[] = [
  { value: "labs", label: "Labs", plural: "Weekly labs", maxName: "Teach Max", material: "Lab sheet", maxRole: "Max misunderstands the method from this week's lab and the student corrects him." },
  { value: "seminars", label: "Seminars", plural: "Weekly seminars", maxName: "Debate Max", material: "Set reading", maxRole: "Max argues a position from the set reading and the student challenges it with evidence." },
  { value: "tutorials", label: "Tutorials", plural: "Weekly tutorials", maxName: "Teach Max", material: "Problem sheet", maxRole: "Max works through a problem with a plausible wrong step for the student to spot." },
  { value: "workshops", label: "Workshops", plural: "Weekly workshops", maxName: "Teach Max", material: "Workshop brief", maxRole: "Max proposes an approach to the workshop task that the student has to critique." },
  { value: "mixed", label: "Mixed", plural: "Weekly sessions", maxName: "Teach Max", material: "Session material", maxRole: "Max adapts to each week's session type." },
];
export const formatInfo = (f: Format) => FORMATS.find((x) => x.value === f) ?? FORMATS[0];

export const LEVELS = [
  { value: 3, label: "Level 3 (foundation year)" },
  { value: 4, label: "Level 4 (UG year 1)" },
  { value: 5, label: "Level 5 (UG year 2)" },
  { value: 6, label: "Level 6 (UG final year)" },
  { value: 7, label: "Level 7 (Master's)" },
];
export const CREDITS = [10, 15, 20, 30, 40, 60];
export const PERIODS: { value: Period; label: string }[] = [
  { value: "sem1", label: "Semester 1" }, { value: "sem2", label: "Semester 2" },
  { value: "term1", label: "Term 1 (Autumn)" }, { value: "term2", label: "Term 2 (Spring)" }, { value: "term3", label: "Term 3 (Summer)" },
  { value: "full_year", label: "Full year" },
];
export const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: "coursework", label: "Coursework" }, { value: "exam", label: "Exam" }, { value: "in_class_test", label: "In-class test" },
  { value: "presentation", label: "Presentation" }, { value: "portfolio", label: "Portfolio" },
];
/** The AI Assessment Scale (Perkins, Furze, Roe & MacVaugh), widely used by UK universities. */
export const AI_LEVELS = [
  { value: 1, label: "1 · No AI" },
  { value: 2, label: "2 · AI for planning" },
  { value: 3, label: "3 · AI collaboration" },
  { value: 4, label: "4 · Full AI" },
  { value: 5, label: "5 · AI exploration" },
];
/** UK undergraduate degree classification bands. */
export const GRADE_BANDS = [
  { band: "First", range: "70–100" }, { band: "Upper second (2:1)", range: "60–69" },
  { band: "Lower second (2:2)", range: "50–59" }, { band: "Third", range: "40–49" }, { band: "Fail", range: "0–39" },
];
export const PROCESSORS = [
  { name: "Anthropic (Claude)", purpose: "Reads submissions, asks viva questions, suggests marks for a person to check" },
  { name: "ElevenLabs", purpose: "Turns the examiner's and Max's lines into speech. Text only, no student audio" },
  { name: "Simli", purpose: "Animates the video examiner's face. The student's camera is never sent" },
];

/** Standard UK pass marks: 40% at undergraduate levels, 50% at Master's. */
export const passMarkFor = (level: number) => (level >= 7 ? 50 : 40);

const id = () => Math.random().toString(36).slice(2, 9);

const VIVA_DEFAULTS = {
  vivaPurpose: "authenticity" as const, vivaMinutes: 5, vivaQuestions: 6, followUp: true, maxHandover: true,
  vivaWindowDays: 7, attempts: 1, allowVoice: true, allowText: true, allowVideo: true, allowRephrase: true, reviewThreshold: 0.5,
  adjExtraTime: true, adjTextOnly: true, adjRestBreaks: true, adjWritten: true, welsh: false,
  accessibilityUrl: "https://www.example.ac.uk/accessibility",
  retentionMonths: 12, lawfulBasis: "Public task (UK GDPR Art. 6(1)(e))", dpiaRef: "", privacyUrl: "https://www.example.ac.uk/privacy/students",
  anonymousMarking: true, feedbackDays: 15, moderationPct: 10, compensation: true, qualifyingMark: 30,
  latePenalty: "5 marks per working day, up to 5 working days; then 0",
  reassessment: "Resit in the August reassessment period, capped at the pass mark",
};

const RESEARCH_METHODS: ModuleConfig = {
  ...VIVA_DEFAULTS,
  id: "cmp2045",
  code: "CMP2045", title: "Research Methods", school: "School of Computer Science",
  programmes: "BSc Psychology; BSc Psychology with Data Science",
  level: 5, credits: 20, year: "2026/27", period: "sem1", teachingWeeks: 11, readingWeek: 6,
  leader: "Dr A. Patel", team: "Dr J. Okafor; Ms L. Chen (GTA)", externalExaminer: "Prof. R. Hughes (University of Leeds)",
  vleUrl: "https://online.example.ac.uk/course/CMP2045", recordCode: "CMP2045-2627-S1",
  format: "labs", releaseDay: "Monday", releaseTime: "09:00", prepRequired: false, countEngagement: false,
  readingListUrl: "https://readinglists.example.ac.uk/modules/cmp2045",
  weeks: SEED_LABS.map((l) => ({
    id: l.id, week: l.week, title: l.title, type: "labs" as const,
    topics: l.concepts.map((c) => c.name).join(", "), material: `week${l.week}-lab-sheet.pdf`, maxPosition: "", published: true,
  })),
  components: [
    { id: "a1", name: "Quiz 1 (weeks 1–2)", type: "in_class_test", weight: 10, dueWeek: "3", outcomes: ["lo1"], viva: false, core: false, aiLevel: 1 },
    { id: "a2", name: "Quiz 2 (weeks 3–4)", type: "in_class_test", weight: 10, dueWeek: "5", outcomes: ["lo2", "lo3"], viva: false, core: false, aiLevel: 1 },
    { id: "a3", name: "Critical evaluation essay", type: "coursework", weight: 40, dueWeek: "8", outcomes: ["lo1", "lo2", "lo3", "lo4"], viva: true, core: true, aiLevel: 2 },
    { id: "a4", name: "Written exam", type: "exam", weight: 40, dueWeek: "January exams", outcomes: ["lo1", "lo2", "lo3"], viva: false, core: true, aiLevel: 1 },
  ],
  passMark: 40,
  criteria: [
    { id: "k1", name: "Critical analysis", weight: 40 }, { id: "k2", name: "Understanding of methods", weight: 30 },
    { id: "k3", name: "Use of sources", weight: 20 }, { id: "k4", name: "Presentation", weight: 10 },
  ],
  outcomes: [
    { id: "lo1", text: "Distinguish experimental and observational designs and the claims each can support." },
    { id: "lo2", text: "Evaluate sampling methods and their effect on generalisability." },
    { id: "lo3", text: "Assess the reliability and validity of measures, including self-report." },
    { id: "lo4", text: "Critically evaluate a published study, avoiding unsupported causal claims." },
  ],
  benchmark: "Psychology (QAA Subject Benchmark Statement)",
  aiStatement: "You may use AI tools to plan and check spelling, but the argument and writing must be your own. You'll have a short spoken viva about your essay.",
};

const SOCIAL_PSYCH: ModuleConfig = {
  ...VIVA_DEFAULTS,
  id: "psy2010",
  code: "PSY2010", title: "Social Psychology", school: "School of Psychology",
  programmes: "BSc Psychology", level: 5, credits: 20, year: "2026/27", period: "sem2", teachingWeeks: 11, readingWeek: 6,
  leader: "Dr S. Morgan", team: "Dr K. Ahmed; Mr T. Evans (GTA)", externalExaminer: "Dr M. Byrne (Cardiff University)",
  vleUrl: "https://online.example.ac.uk/course/PSY2010", recordCode: "PSY2010-2627-S2",
  format: "seminars", releaseDay: "Thursday", releaseTime: "17:00", prepRequired: true, countEngagement: false,
  readingListUrl: "https://readinglists.example.ac.uk/modules/psy2010",
  weeks: [
    { id: "p1", week: 1, title: "Conformity", type: "seminars", topics: "Normative influence, informational influence", material: "Asch (1951) Effects of group pressure", maxPosition: "People conform only because they're afraid of looking stupid.", published: true },
    { id: "p2", week: 2, title: "Obedience", type: "seminars", topics: "Authority, agentic state", material: "Milgram (1963) Behavioral study of obedience", maxPosition: "Milgram proves anyone would harm a stranger if told to.", published: true },
    { id: "p3", week: 3, title: "Bystander effect", type: "seminars", topics: "Diffusion of responsibility", material: "Darley & Latané (1968) Bystander intervention", maxPosition: "More witnesses always means someone is more likely to help.", published: true },
    { id: "p4", week: 4, title: "Attitudes and behaviour", type: "seminars", topics: "Theory of planned behaviour", material: "Ajzen (1991) The theory of planned behavior", maxPosition: "If you know someone's attitude you can predict what they'll do.", published: false },
  ],
  components: [
    { id: "b1", name: "Seminar portfolio", type: "portfolio", weight: 20, dueWeek: "11", outcomes: ["lo1", "lo3"], viva: false, core: false, aiLevel: 2 },
    { id: "b2", name: "Essay: replication crisis", type: "coursework", weight: 50, dueWeek: "9", outcomes: ["lo1", "lo2", "lo3"], viva: true, core: true, aiLevel: 2 },
    { id: "b3", name: "Unseen exam", type: "exam", weight: 30, dueWeek: "May exams", outcomes: ["lo1", "lo2"], viva: false, core: true, aiLevel: 1 },
  ],
  passMark: 40,
  criteria: [
    { id: "k1", name: "Argument and evaluation", weight: 40 }, { id: "k2", name: "Knowledge of theory and evidence", weight: 35 },
    { id: "k3", name: "Use of sources", weight: 15 }, { id: "k4", name: "Structure and expression", weight: 10 },
  ],
  outcomes: [
    { id: "lo1", text: "Explain classic and contemporary studies of social influence." },
    { id: "lo2", text: "Evaluate the methods and ethics of landmark social psychology studies." },
    { id: "lo3", text: "Construct an evidence-based argument in seminar discussion and in writing." },
  ],
  benchmark: "Psychology (QAA Subject Benchmark Statement)",
  aiStatement: "AI may help you plan and find sources. Seminar contributions and essay arguments must be your own; the viva checks you can defend them.",
};

export const SEED_MODULES: ModuleConfig[] = [RESEARCH_METHODS, SOCIAL_PSYCH];

export function blankModule(): ModuleConfig {
  return {
    ...VIVA_DEFAULTS,
    id: `m-${id()}`, code: "NEW1000", title: "New module", school: "", programmes: "", level: 4, credits: 20,
    year: "2026/27", period: "sem1", teachingWeeks: 11, readingWeek: 6, leader: "", team: "", externalExaminer: "",
    vleUrl: "", recordCode: "", format: "labs", releaseDay: "Monday", releaseTime: "09:00", prepRequired: false,
    weeks: [], countEngagement: false, readingListUrl: "", components: [], passMark: 40, criteria: [], outcomes: [],
    benchmark: "", aiStatement: "",
  };
}

export const newWeek = (week: number, type: SessionType): WeeklySession =>
  ({ id: id(), week, title: "", type, topics: "", material: "", maxPosition: "", published: false });
export const newComponent = (): AssessmentComponent =>
  ({ id: id(), name: "", type: "coursework", weight: 0, dueWeek: "", outcomes: [], viva: false, core: false, aiLevel: 2 });
export const newOutcome = (): LearningOutcome => ({ id: `lo-${id()}`, text: "" });
export const newCriterion = (): Criterion => ({ id: id(), name: "", weight: 0 });

/** Readiness checks shown beside the form: [label, ok]. */
export function readiness(m: ModuleConfig): { label: string; ok: boolean }[] {
  const total = m.components.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const critTotal = m.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const mapped = m.outcomes.length > 0 && m.outcomes.every((o) => m.components.some((c) => c.outcomes.includes(o.id)));
  return [
    { label: `Assessment weights total 100% (now ${total}%)`, ok: total === 100 },
    { label: "Every learning outcome is assessed", ok: mapped },
    { label: m.criteria.length ? `Viva criteria total 100% (now ${critTotal}%)` : "Viva marking criteria set", ok: m.criteria.length > 0 && critTotal === 100 },
    { label: "At least one week published", ok: m.weeks.some((w) => w.published) },
    { label: "External examiner named", ok: !!m.externalExaminer.trim() },
    { label: "DPIA reference recorded", ok: !!m.dpiaRef.trim() },
    { label: "Student AI-use statement written", ok: !!m.aiStatement.trim() },
  ];
}

/* ---------- storage: own key, so the main demo store is untouched ---------- */
const KEY = "socratic-module-config-v1";
export function loadModules(): ModuleConfig[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ModuleConfig[]) : null;
    // Fill fields added after a draft was saved.
    return Array.isArray(parsed) && parsed.length ? parsed.map((m) => ({ ...blankModule(), ...m })) : null;
  } catch { return null; }
}
export function saveModules(mods: ModuleConfig[]) {
  try { localStorage.setItem(KEY, JSON.stringify(mods)); return true; } catch { return false; }
}
export function clearModules() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
