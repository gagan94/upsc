# 05 — Learn: syllabus, subjects, modules, lessons

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03 | **Used by:** 06, 08, 09, 10, 11, 12, 13, 14, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
The structured curriculum. The owner's team authors lessons (D5) and uploads them through the admin console; students move through subjects -> modules -> lessons/activities, read or watch, annotate, practise and revise, always anchored to the canonical UPSC syllabus tree.

## 2. Actors
| Actor | Can |
|---|---|
| Student | Browse subjects, resume, read/watch lessons, annotate, select passages to notes, complete lessons, view progress, practise/revise from a lesson |
| Content editor / Admin | Create & manage syllabus tree, subjects, modules, lessons, media, PYQ/resource links, publish/unpublish, verify sources (see 18) |
| Guest | One sample lesson (02) |

## 3. User stories
- US-05-01 I see all subjects with my progress and a "Continue learning" card that resumes exactly where I stopped (lesson, section, % progress).
- US-05-02 I filter subjects by In progress / Not started / Completed, search subjects, filter by GS paper.
- US-05-03 I open a subject and see modules (ordered chapters), my progress per module, locked items, grades and resources.
- US-05-04 I read a lesson in a distraction-free reader (or watch its video), jump via contents, annotate, select a passage and save it to Notes or ask AI to explain it.
- US-05-05 I finish a lesson and see a recap with next steps (practise, review notes, revision due, next module).
- US-05-06 I see Mains connections and PYQs for the topic and can write or upload an answer from the lesson.
- US-05-07 As an editor I upload a lesson once and it appears correctly tagged to the syllabus.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Learn home (Continue learning card; filters All / In progress / Not started / Completed / Search subjects / GS paper; subject cards with module count, required-lessons progress "40% · 4/10 required lessons complete", "Foundation complete") | `128:8481` Subjects and continue · `486:75416` New learner |
| Subject page (tabs Overview · Modules · Grades · Resources; "Resume next item"; unit with activities: Reading *Done* / *Resume*, Quiz *Next*, PYQs *Locked*; right rail "All Modules", Subject progress "27/30 activities", Next revision) | `129:10876` & `130:14414` Indian Polity · Modules · `478:76398` Subject modules · `478:76567` Topic modules |
| Lesson reader ("Focus reader": Back to module, Contents, Ask AI, More, Annotations, Make available offline, Study session bar, lesson progress "65% · Section 2 of 3", Read/Watch toggle, numbered sections, comparison tables, "Select this passage") | `478:76736` Focus reader · `479:74551` Lesson complete |
| Video | `478:76738` Watch lesson (Play video, Chapters, Transcript, "Note at 04:32", Playback options; "Reading or watching can support the same lesson. Completion is counted once") · `486:75391` Video full screen |
| After lesson | `479:74553` Module recap ("40% · 2/5 required lessons complete"; Learning/Practice/Revision tracked separately; Continue learning, Practise this module, Review notes, Revision due, Next module) · `479:74555` Topic PYQs · `479:74557` Mains connections (Mains PYQs & answer writing: Choose question & write, Upload an answer, Model & top answers, Save argument to Notes) · `479:74559` Related resources · `479:74561` Learning notes · `479:74563` Revision queue · `479:74565` Revision session |
| Learn progress components | `AI UPSC/Learn/Progress / subjectPage|module|reader|video` symbols, `AI UPSC/Learn/Subject card`, `Module item` |
| Studio/annotation/offline | Study collaboration frames `529:82837`–`529:83861` (Annotated reader, Annotation editor, Page annotations, Offline options/downloads/reader/problem/update/remove) |
| Verification | `513:82389` Content status · `513:82558` Source details · `513:82896` Missing content |

Subjects visible in design `[FIGMA]`: Indian Polity, History, Geography, Economy, Environment, Science & Technology, Ethics, CSAT (card images tagged GS I/II/III). Lesson example: "The Company Rule (1773–1858)" under Indian Polity > Historical Background; module example "Fundamental Rights · Expanded", activities "Nature of rights", "Article 19 restrictions", "Rights checkpoint (quiz, 10 questions)", "Constitutional remedies (PYQs 2017–2025, 12 questions)".

## 5. Functional requirements
**Syllabus spine**
- FR-05-01 `[PROPOSED]` Canonical syllabus tree seeded from the official UPSC syllabus: Prelims (GS Paper I, CSAT Paper II), Mains (Essay, GS I–IV, qualifying languages, optional later), with levels `exam_stage > paper > subject > unit > topic > subtopic`. Nodes have stable ids, slug, order, `source_doc_ref` (official notification).
- FR-05-02 Admin may edit the tree (add/rename/reorder/merge) with versioning; merges remap all references.

**Content structure**
- FR-05-03 `[FIGMA]` Hierarchy: `Subject (= syllabus subject)` -> `Module` (a unit/chapter, ordered) -> `Activity` where activity type ∈ `lesson (read/watch)`, `quiz`, `assignment`, `pyq_set`, `revision`, `resource`. Each lesson belongs to one module and maps to ≥1 syllabus node.
- FR-05-04 `[FIGMA]` Activities can be `required` or optional; module/subject completion = required activities completed (e.g. "4/10 required lessons").
- FR-05-05 `[FIGMA]` Sequencing: modules ordered; an activity may be **locked** until prerequisites complete (rule per activity: `unlock_after: [activity_ids]`); locked items show padlock + reason.
- FR-05-06 Lesson body is structured blocks (heading, rich text, table, callout, image/diagram, key-points list, "select passage" quote, embedded question, footnote/source). Stored as JSON (blocks), rendered consistently. Markdown import `[PROPOSED]`.
- FR-05-07 Video lessons: HLS stream, chapters (timestamps), transcript (searchable, synced), captions, playback speed, resume position. Lesson may have text, video, or both ("Reading or watching can support the same lesson. Completion is counted once").
- FR-05-08 Each content item stores `verification_status` and `source` (author, reference books, official docs, date) — shown in "Source details" (see 04 §8, 18).
- FR-05-09 Entitlement: subject/module/lesson has `entitlement_key` (nullable). Gated items are visible in outline with lock chip but body is withheld (preview first section `[PROPOSED]`).

**Student experience**
- FR-05-10 `[FIGMA]` Learn home: "Continue learning" = last opened incomplete lesson with `progress_pct`, section index, `Resume reading` button. Subject cards: module count, "N required lessons", % complete, state "Not started" / "In progress" / "Completed" / "Foundation complete". Filters + search.
- FR-05-11 `[FIGMA]` Lesson progress is tracked by section and scroll/time engagement (≥ 80% of sections viewed and dwell ≥ threshold, or explicit "Mark complete"); completion fires once even if both read and watch occur.
- FR-05-12 `[FIGMA]` Reader tools: Contents (outline), Annotations (highlight/notes — see 13), "Select this passage" -> save to Notes with exact excerpt and lesson link (13), Ask AI with the passage as context (14), "Make available offline" (`notes.offline` entitlement, O7), Study session bar to start/see a focus session (10).
- FR-05-13 `[FIGMA]` Video: Note at current timestamp (creates a note anchored to `t=272s`), Chapters, Transcript, Playback options, fullscreen state.
- FR-05-14 `[FIGMA]` Lesson complete screen: summary, next lesson, "Add to revision" toggle (creates revision cards, see 11), related PYQs.
- FR-05-15 `[FIGMA]` Module recap: required-lesson %, plus separate Practice stats (attempts/accuracy) and Revision stats ("tracked separately"); CTAs to practise the module (08 filtered by module's syllabus nodes), review notes, due revision, next module.
- FR-05-16 `[FIGMA]` Topic PYQs (08) filtered by mapped topic; **only verified mappings** are shown ("Verified topic PYQs appear here when mapped"), otherwise "Mapping review"/"No verified question mapping" state with options View subject PYQ bank, View Mains PYQs, Keep mapping pending, Report incorrect mapping (`513:82727`).
- FR-05-17 `[FIGMA]` Mains connections: link lesson topics to Mains questions (GS paper, year, 10 marks/150 words) and a platform-authored practice prompt; actions: choose question & write (09), upload an answer (09), model & top answers (09), save argument to Notes (13).
- FR-05-18 `[FIGMA]` Related resources: magazines/Acts/articles mapped to the topic (06/07). Learning notes: the student's notes linked to the lesson (13).
- FR-05-19 `[FIGMA]` Grades tab: per-subject summary of quiz scores and assignment results `[PROPOSED]` (quiz scores by module, average, best attempt).
- FR-05-20 "New learner" state: curated starting path based on onboarding (02) with first lesson CTA.
- FR-05-21 Subject/lesson recommendations: next best lesson from syllabus gaps, weak topics (12), and current-affairs links `[PROPOSED]`.

**Authoring (see 18 for UI)**
- FR-05-30 Create/edit lessons with block editor; upload video (direct-to-S3 -> transcode job), attach images; set module, order, required flag, unlock rules, estimated minutes, syllabus mappings, entitlement key, related resources/PYQs.
- FR-05-31 Draft -> In review -> Published -> Archived states; scheduled publish; version history with diff and rollback; unpublishing keeps student progress.
- FR-05-32 Bulk import (CSV/JSON/Markdown package) for lesson metadata and block content `[PROPOSED]`.
- FR-05-33 Content validations: every lesson has ≥1 syllabus mapping, duration, summary, at least one source; videos have transcript or "transcript pending".

## 6. Data model (module `catalog`)
- `syllabus_nodes(id, parent_id, path ltree, level, exam_stage, paper, title, slug, order, official_ref, version, status)`
- `subjects(id, syllabus_node_id, slug, title, description, gs_paper, cover_file_id, order, entitlement_key, status)`
- `modules(id, subject_id, title, order, summary, required bool, unlock_rule jsonb, status)`
- `activities(id, module_id, type[lesson|quiz|assignment|pyq_set|revision|resource], title, order, required, est_minutes, unlock_after uuid[], entitlement_key, status, published_at)`
- `lessons(activity_id pk, summary, body_blocks jsonb, video_asset_id null, transcript jsonb, chapters jsonb, learning_objective, verification_status, verified_by, verified_at, version)`
- `content_sources(id, entity_type, entity_id, title, url, publisher, published_on, accessed_on, notes)`
- `content_syllabus_map(entity_type, entity_id, syllabus_node_id, relevance[primary|secondary], exam_use[prelims|mains|both], status[suggested|confirmed|rejected], confidence, reviewed_by)`
- `lesson_progress(user_id, activity_id, status[not_started|in_progress|completed], progress_pct, last_section, last_video_second, started_at, completed_at, time_spent_s)`
- `module_progress`, `subject_progress` materialised views / rollup tables.
- `media_assets(id, type, storage_key, duration_s, status, hls_manifest, captions)`
Indexes: `(user_id, status)` on progress; FTS on lesson title/summary/body text; `ltree` GiST on syllabus.

## 7. API surface
Student: `GET /learn/subjects?filter=&gs=&q=` · `GET /learn/continue` · `GET /learn/subjects/{slug}` (+`/modules`) · `GET /learn/modules/{id}` · `GET /learn/activities/{id}` (lesson payload, entitlement-checked) · `PUT /learn/activities/{id}/progress` (section, pct, video second; idempotent, throttled) · `POST /learn/activities/{id}/complete` · `GET /learn/activities/{id}/related` (PYQs, resources, notes, mains) · `GET /learn/recap/{moduleId}` · `GET /syllabus/tree?stage=` · `GET /syllabus/nodes/{id}`.
Admin (under `/admin/content`): CRUD for syllabus nodes, subjects, modules, activities, lessons; `POST /admin/media/uploads` (presign) · `POST /admin/lessons/{id}/publish` · `GET /admin/lessons/{id}/versions` · `POST /admin/import`.

## 8. AI behaviour
- Auto-tagging on publish (`map_to_syllabus`): suggests syllabus nodes and Prelims/Mains use; editors confirm. Confidence < 0.7 => `Mapping review` queue.
- Lesson summary + key points + suggested flashcards (`flashcards_generate`) offered to the editor as drafts, never auto-published.
- In-reader "Explain" uses passage + surrounding section + syllabus node as grounding (14).
- Transcripts via ASR job; AI cleanup optional.

## 9. Entitlements
`learn.content.premium` (boolean on gated activities via `entitlement_key`), `notes.offline` for offline download, `ai.explain.passage` quota. Defaults TBD (O1).

## 10. Events
Emits `lesson.started|completed`, `module.completed`, `subject.completed`, `lesson.video_progress`; consumed by progress (12), revision (11), planner (10), XP/streaks (12).

## 11. Non-functional
Reader renders ≤ 1 s on mid-range laptops; video start < 2 s via CDN; progress writes debounced (5 s); media signed URLs; accessibility: transcript, captions, keyboard reader navigation, reflow with text-size setting; content versioning so students mid-lesson see consistent text.

## 12. Edge cases
Lesson republished mid-read (keep section anchors stable via block ids; show "updated" banner); module reordered after progress exists; required flag toggled (recompute %); video missing ("No playable asset attached" state per Content status `513:82389`); unlock rule cycles (validate in admin); deleting a node referenced by content (block, or require remap); concurrent progress writes from two devices (max-wins per section).

## 13. Acceptance criteria
- Given I stopped at section 2 of 3 at 65%, when I tap "Resume reading", then I land at section 2 scroll position within 1 section.
- Given I read and also watch the same lesson, then completion count and XP increase once.
- Given a PYQ mapped to the topic but `mapping_status != confirmed`, then it never appears in the "Topic PYQs" list.
- Given a gated lesson without entitlement, then body JSON is not returned by the API (not merely hidden in UI).

## 14. Task breakdown hint
1. Syllabus tree schema + seed importer + admin tree editor (M)
2. Catalog entities + admin CRUD (L)
3. Block renderer + reader UI + progress tracking (L)
4. Video pipeline (upload, transcode, HLS, transcript) (L)
5. Learn home/subject/module pages + continue logic (M)
6. Recap/related/PYQ/Mains connection panels (M, needs 08/09)
7. Locks/unlock rules + entitlements (S)
8. Versioning + scheduled publish + import (M)

## 15. Open questions
Who owns the official syllabus seed (and optional-subject coverage)? Required optional subjects? Transcode vendor vs self-run? O1, O7.
