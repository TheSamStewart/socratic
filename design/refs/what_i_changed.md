# What I changed (Sam's frontend)

This file is gitignored (`design/refs/`). It records everything built on `sams-branch`, in order, and what is real versus demo.

## 1. Product restructure (latest round)

| # | Request | What it is now |
|---|---|---|
| 1 | Submit work is upload only, with a red bubble for the viva | **Submit work** lists the module's assessments. The rubric is already set by the module, so students only upload their work. After an upload the row shows "Viva to do", the sidebar item gets a small red count bubble, a banner asks for the voice viva, and a notification is added. |
| 1b | Viva results go to the teacher for a human decision, with a similar notification | When the viva finishes, the module leader gets a notification and a red badge on **Viva reports**. They open the student's report and press **Satisfied** or **Arrange follow-up**. The student is then notified. |
| 1c | Use notifications anywhere else useful | Bell in the top bar with a dropdown. Red bubbles on: Submit work (viva due), Assignment brief (module leader answered), Feedback (feedback ready or decision made), Teach Max (new weekly lab), Student questions (open escalations), Viva reports (awaiting decision). Visiting a page clears its notifications, except the viva nudge, which clears only when the viva is done. |
| 2 | Explain rubric check, make it a weekly lab notes checker | **Feedback** page. Tab 1, **Weekly lab feedback**: pick a week, paste lab notes, get feedback on each lab concept (green/amber/red, a gap note quoting the student's own sentence, confidence). It is formative and never a grade. Tab 2, **Assessments and viva**: the module rubric criteria per assessment, plus the viva feedback and the human decision. |
| 3 | Teach Max is for weekly labs uploaded by teachers | **Teach Max** shows one card per weekly lab. Pick a week and Max works on that lab's concepts. Teachers publish labs on the new **Weekly labs** page. |
| 4 | Viva is not its own tab | Removed from the sidebar. The viva lives at `/submit/viva/[id]`, opened from Submit work. It is voice first: spoken questions, a mic button, typed fallback, a soft timer and "Plain English". |
| 5 | Mastery map is based on lab work | Mastery is stored per lab concept. Teach Max updates it. **My progress** shows the hex map by weekly lab. |
| 7 | Quizzes and a final piece, each with a viva, under Submit work | Quiz 1 (10%, already reviewed as an example), Quiz 2 (10%), Final piece (40%). Viva feedback shows in the Feedback page next to the rubric. |
| 8 | Class insights: topic overview, qualitative data | Per week and per topic bars (green/amber/red), a "worth addressing with the whole class" box, headline stats, and quotes from Max chats such as "Your class struggles with correlation vs causation". The ambiguous-brief card is kept. |
| 9 | Agents section reflects the changes | Agent cards now say where each agent is used. A human-in-the-loop strip counts vivas awaiting a decision, decisions made, labs published and notifications sent. The Guardian log includes "viva sent to a person". |

Note: the module is still CMP2045 Research Methods, so the lab topics are research-methods ones. Your DSA example (stacks amber, binary trees red) was used as the model for how Class insights reads.

## 2. Earlier rounds (same branch)
- Built the whole frontend from the shared contract: sidebar shell, Student/Lecturer toggle, Brief, Submit, Rubric Check, Teach Max, Viva, My Progress, Escalations, Viva Reports, Class Insights, Agents.
- API client with an offline fallback, so every page works when the backend is down (`lib/viva.ts`).
- Design research (`design/refs/designresearch.md`), then two restyles. First blue and cream. Then, as asked, a university-platform look: navy top bar with a gold rule, module banner with breadcrumb, flat module menu, serif headings (Source Serif 4), Source Sans 3 body.
- Merged `origin/main` into `sams-branch` (fast-forward).

## 3. What is real and what is demo
- **Real if the backend is up:** final-piece submit (`/api/submit`), viva and Max turns (`/api/session/{id}/viva|max`), brief questions, the lecturer queue and answers, agents, TTS.
- **Frontend only (browser storage, no backend yet):** weekly labs, assessments and their statuses, notifications, human decisions, lab-note feedback fallback, mastery per lab concept. State is saved in `localStorage` and shared across tabs, so a lecturer tab and a student tab update each other.
- **Demo data:** class insights numbers, the other 7 students in Viva reports, Quiz 1 as an example, the agent call counts.
- The offline marker is keyword based. It is only there so the demo path works with no backend.

## 4. What the backend would need (for Hamid, Ebube and Nüman)
- Endpoints to upload and list weekly labs, with the Reader extracting concepts from the lab sheet.
- Endpoints for assessments (submit, status) and for recording a human decision.
- A lab-notes feedback call, or reuse of `/api/submit` with the lab objectives as the rubric (the frontend already tries this).
- A Max session scoped to a lab's concepts.
- Class-wide aggregates from real Max sessions for Class insights.
- A notifications endpoint, if it should work across machines.

## 5. Things to know
- `frontend/package.json` is a shared file. I added `lucide-react`. `CLAUDE.md` says to ask before adding dependencies, so please confirm with the team.
- When a viva mentions a red concept, the old hand-off to Teach Max is gone. The viva now shows a note that the topic can be practised in Teach Max afterwards.
- Branch name is `sams-branch`, but `CLAUDE.md` expects `sam/frontend`.
- Not browser-tested. `npm run build` passes with 14 routes.
- To reset demo state: clear site data for localhost:3000.

## 6. Voice first (added last)
- Viva and Teach Max now have a **Voice / Text** switch in the chat header. The choice is remembered. Voice is the default.
- **Voice mode:** a "Start" button (browsers block audio until the user clicks), then the AI speaks out loud through ElevenLabs (`POST /api/tts`, key stays on the server). When it stops, the mic opens automatically, the student answers out loud and it sends itself. The AI's words show as captions, and there are Skip and Plain English buttons.
- **Text mode:** silent, with a typed box. Nothing is spoken.
- **Speech to text** is the browser's own en-GB recogniser, as in the original spec. It works best in Chrome and Edge. If a browser can't listen, the panel says so and points to Text.
- **Fallback:** if `/api/tts` fails or has no key, the browser's built-in voice speaks instead. The panel says which voice is in use: "ElevenLabs" or "browser voice". I haven't heard the ElevenLabs voice. It needs `ELEVENLABS_API_KEY` in the backend `.env` and Ebube's `tts.py`.
