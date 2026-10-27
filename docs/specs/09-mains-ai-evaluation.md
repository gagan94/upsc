# 09 — Mains answer writing and AI evaluation

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03, 05, 13, 14, 16 (mentor review), 15 (peer review) | **Used by:** 10, 11, 12, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`. AI evaluates answers (D8); AI, mentor and peer reviews **stay distinct** (design note on feedback page).

## 1. Purpose
Help students practise descriptive writing for UPSC Mains (GS I–IV, Essay, Ethics case studies, qualifying languages): choose or receive a question, write or upload a handwritten answer, get structured feedback (AI, mentor, peer), rewrite, compare with model/community answers, and track improvement and weaknesses against the syllabus.

## 2. Actors
Student; AI evaluator (system); Mentor (reviews on request, see 16); Peer reviewer (15); Content editor (question bank, model answers, rubrics).

## 3. User stories
- US-09-01 I get a daily practice question and can start writing, continue a draft, or upload a handwritten answer.
- US-09-02 I browse the Mains question bank / PYQs by paper, subject, topic, year, marks and word limit.
- US-09-03 I set up a practice: untimed or timed, feedback route (AI / mentor / peer), language.
- US-09-04 I write in an editor with word count, outline, autosaved drafts and optional timer, then review and submit.
- US-09-05 For handwritten pages I upload photos, check order/legibility, review/correct extracted text, then submit.
- US-09-06 I receive AI feedback (score band, rubric, passage-level comments, improvements), request a mentor review, or send to peers; they stay clearly labelled.
- US-09-07 I rewrite using feedback, keep versions, and compare before/after.
- US-09-08 I see model answers and community answers (after submitting), my history, progress, weakness notebook, and a rewrite queue.
- US-09-09 I practise Essay, Ethics case studies, sectional tests and full-paper simulations, and qualifying-language papers.

## 4. Screens and states
| Screen | Figma nodes (page 0:1) |
|---|---|
| Mains home ("Today's answer-writing practice": question, GS II · Governance · 10 marks · 150 words; Start writing / Continue current draft / Upload handwritten answer; shortcuts Question bank, PYQs, My attempts, Mains progress, Essay practice, Ethics case studies, Sectional/full paper, Qualifying languages; "Your review and rewrite loop": Feedback, Rewrite queue, Mentor reviews, Bookmarks; "Build your Mains toolkit": Syllabus coverage, Weakness notebook, Examples & diagrams, Community answers; Private peer review) | `149:15935` Mains / Home |
| Bank & PYQs | `350:55187` Mains / bank · `350:55502` Mains / pyq · `350:63377` bookmarks |
| Setup (writing mode Untimed/Timed; feedback route AI/Mentor/Peer; language English/Hindi [see O8: English only in v1]) | `350:55817` Mains / setup |
| Write (workspace: question card, "Your answer" editor with 0 words, Save draft, Outline, Upload pages, Timer/offline; optional resources: Model answer, Community examples, Save question, Report question; Review & submit, Save & exit) | `350:56132` Mains / write · `350:58652` Mains / rewrite |
| Upload (page capture) | `350:56447` Mains / upload · `350:56762` Mains / uploadReview (page preview, "Pages are readable", Retake/replace, Extract text, Extracted text correction, Submit reviewed upload) |
| Submitted & feedback (Question, Mentor feedback "Not requested", Rewrite this answer / Add to rewrite queue / Model answer / Community answers, passage-level comment, "AI and mentor reviews remain distinct") | `350:57077` submitted · `350:57392` feedback · `350:57707` model · `350:58022` community · `350:58337` communityAnswer · `350:58967` comparison · `350:59282` history |
| Analytics & toolkit | `350:59597` progress · `350:59912` syllabus coverage · `350:60227` weakness notebook · `350:60542` enrichment (examples & diagrams) · `350:60857` rewrite queue |
| Mentor routes | `350:61172` mentor review request · `350:61487` mentorStatus |
| Other papers | `350:61802` essay · `350:62117` ethics · `350:62432` paperSetup (GS II / Essay / GS IV; Sectional vs Full-paper simulation) · `350:62747` paperWrite · `350:63062` paperResult · `350:63692` qualifying languages |
| Cross-links | Learn / Mains connections `479:74557` (07/05), Study collaboration / Peer reviews `529:81143`…`81823` (15), Mentorship / feedback frames (16) |

## 5. Functional requirements
**Question bank**
- FR-09-01 `[PROPOSED]` Mains question: text, paper (GS I–IV / Essay / Ethics case / Language), marks (10/15/20/250 essay), word limit (150/250/1000-1200), directive keyword (discuss, critically examine, ...), syllabus mapping, source (`pyq` year, `platform`), verification status, optional case-study stem, model answer(s), rubric template id, tags (keywords).
- FR-09-02 `[FIGMA]` Daily question: one per day per user (rotating by weak topics, syllabus coverage and current affairs) `[PROPOSED algorithm]`; user can swap once/day (quota).
- FR-09-03 `[FIGMA]` Bank browsing with filters (paper, subject, topic, year, marks, word limit, attempted/not, bookmarked), "Save question", "Report question".

**Writing**
- FR-09-10 `[FIGMA]` Setup choices stored per attempt: `timer_mode` (untimed/timed — default timer = marks × 0.7 min? **TBD**; proposal: 10-mark/150-word = 7–8 min, 15/250 = 11–12 min), `feedback_route[]` (`ai`, `mentor`, `peer` — multiple allowed `[PROPOSED]`), `language` (`en`; Hindi disabled by flag in v1).
- FR-09-11 `[FIGMA]` Editor: plain rich text (bold, lists, simple tables/diagram upload for examples & diagrams), live word count vs limit with soft warning at 90–110%, autosave every 5 s + "Save draft", "Outline" scratchpad (bullets, points to cover) shown alongside, offline-safe local buffer, "Timer / offline" toggle; draft privacy default private ("Drafts stay private").
- FR-09-12 `[FIGMA]` Review & submit step: shows word count, time spent, checklist (intro, body headings, conclusion, example, diagram) `[PROPOSED]`; submit locks the attempt version (new edits create a rewrite).
- FR-09-13 `[FIGMA]` Upload pages: 1–8 images/PDF per answer (JPG/PNG/HEIC/PDF ≤ 10 MB each), reorder, retake/replace; auto-crop/deskew; OCR (vision model) -> **extracted text** shown beside pages; student corrects text; "readability warnings must be resolved before assessment" (blur/crop/low contrast) and diagrams omitted by OCR are flagged ("A text extraction may omit handwritten diagrams").
- FR-09-14 Original upload is always retained and shown to mentors; AI evaluates the confirmed text plus visual cues (structure, diagram presence) `[PROPOSED]`.

**Evaluation (AI)**
- FR-09-20 `[FIGMA]` On submit with route `ai`, create an evaluation job (SLA: first result < 60 s typical, < 3 min p95). Output (JSON, validated):
  - `overall_score` (out of marks) with `band` (e.g. Below / Average / Good / Excellent) and confidence;
  - rubric dimensions (default: Introduction & relevance, Content & coverage/facts, Analysis & multi-dimensionality, Structure & flow, Examples & evidence, Conclusion, Language & clarity, Word-limit adherence, Directive compliance) each with 0–5, rationale, 1–2 evidence quotes;
  - **passage-level comments** anchored to spans (offset ranges in text) with type (praise, fix, add, remove, fact-check);
  - `missing_points` (syllabus/keyword checklist from the question's model/keyword set), `suggested_structure`, `examples_to_add` (with sources), `improved_sample` for one paragraph (not the whole answer by default), `next_actions`.
- FR-09-21 AI feedback is labelled "AI feedback" with disclaimers ("Educational estimate; not an UPSC evaluator"), model/rubric version, and a "Report feedback" control. It must never present a score as an official mark.
- FR-09-22 Calibration: nightly job compares AI scores with mentor scores for double-reviewed answers; alert if mean absolute error > 1.5 marks per 10; rubric/prompt versions A/B-tested offline first.
- FR-09-23 Re-evaluation of the same text returns the same score band ±0 for identical input (low temperature + caching by content hash).
- FR-09-24 Entitlement/quota: `ai.mains.evaluate` per month; if exhausted, student can still self-review with model answer and keyword checklist (non-AI) and request mentor/peer.

**Mentor and peer**
- FR-09-30 `[FIGMA]` Request mentor review from feedback page: choose a mentor with Mains-review expertise or open to a booked session ("Open submitted answer" is available in the live session, 16); statuses `not_requested|requested|accepted|in_progress|completed|declined|expired` shown on `mentorStatus`; mentor feedback structure: score, annotated answer (comments on spans), strengths/improvements, tasks (auto-added to planner), optional public review (16).
- FR-09-31 `[FIGMA]` Peer review: share to a private circle or open forum thread (15): reviewers use a rubric form (Relevance, Structure, Evidence, Conclusion 1–5 + text feedback); results aggregated and shown under "Peer feedback"; no raw scores shown as official.
- FR-09-32 All three sources shown in separate tabs; they never merge into one score.

**Rewrite loop**
- FR-09-40 `[FIGMA]` "Rewrite this answer" creates attempt v2 pre-filled with v1 text and highlighted comments; "Add to rewrite queue" schedules for later (planner task + revision); comparison view (`350:58967`) diffs v1→v2 with score deltas by rubric dimension.
- FR-09-41 Model answers & community answers are hidden until the student has submitted (design: "model answers and community examples stay hidden until submission" in simulation); community answers are opt-in shared by authors (anonymous handle).
- FR-09-42 `[FIGMA]` History/attempts: list by date, question, score band, route, versions.

**Other papers**
- FR-09-50 `[FIGMA]` Essay practice: topic choice (two sections like UPSC `[PROPOSED]`), outline-first, word target 1000–1200, rubric emphasises thesis, structure, balance, examples; AI feedback style tuned.
- FR-09-51 `[FIGMA]` Ethics case studies: case stem + sub-questions; rubric emphasises stakeholders, ethical dilemmas, options with pros/cons, decision justification, values linked to syllabus.
- FR-09-52 `[FIGMA]` Sectional/Full-paper simulation: paper templates (GS I–IV: 20 questions, 250 marks, 3 hours; essay 2 sections) with timer checkpoints, question palette, unanswered state, answers persist across questions; model/community answers hidden until finish; result = per-question feedback + paper summary (partial in v1: AI-evaluates a selected subset).
- FR-09-53 `[FIGMA]` Qualifying languages: English/Indian-language comprehension and essay practice; English only in v1; others deferred (D11).

**Analytics and weakness**
- FR-09-60 `[FIGMA]` Mains progress: attempts count, average band, rubric radar over time, word-limit adherence, time per answer, rewrite improvement, coverage of syllabus (heatmap by paper/subject/topic).
- FR-09-61 `[FIGMA]` Weakness notebook: recurring issues extracted from feedback (e.g. "No examples", "Conclusion weak", "Missing federalism dimension"), each linked to lessons, drills and a "practice again" action; auto-add to revision (11).
- FR-09-62 `[FIGMA]` "Examples & diagrams" enrichment: curated reusable examples/diagrams per topic from lessons/news (editor-curated + AI suggested); "Save argument to Notes".

## 6. Data model (module `mains`)
- `mains_questions(id, text, case_stem, paper, marks, word_limit, directive, source_type, source_ref, verification_status, rubric_id, status, created_by)`; `mains_question_keywords(question_id, keyword, weight)`; `model_answers(id, question_id, author_id, body_blocks, kind[model|topper|editor], status)`.
- `answer_attempts(id, user_id, question_id, parent_attempt_id null, version_no, mode, timer_seconds, started_at, submitted_at, language, word_count, text_body, input_kind[typed|handwritten|mixed], status[draft|submitted|evaluating|evaluated|failed], visibility[private|circle|community])`.
- `answer_uploads(id, attempt_id, page_no, file_id, ocr_text, ocr_confidence, legibility_flags jsonb, user_confirmed_text)`.
- `evaluations(id, attempt_id, source[ai|mentor|peer], evaluator_id null, rubric_id, rubric_version, model_version, overall_score, band, dimensions jsonb, comments jsonb (span-anchored), missing_points jsonb, suggestions jsonb, status, created_at, latency_ms, cost)`.
- `rubrics(id, name, paper, dimensions jsonb, version)`.
- `rewrite_queue(user_id, attempt_id, due_on, status)`; `weakness_items(user_id, tag, count, last_seen, linked_syllabus_node_ids, resolved_at)`; `mains_bookmarks`; `mentor_review_requests(id, attempt_id, mentor_id, status, booking_id null, requested_at)`; `paper_simulations(id, user_id, paper, kind, started_at, ends_at, answers jsonb, status, result jsonb)`.

## 7. API surface
`GET /mains/today` · `POST /mains/today/swap` · `GET /mains/questions?...` · `POST /mains/attempts` (question, mode, route, language) · `PATCH /mains/attempts/{id}` (autosave text/outline) · `POST /mains/attempts/{id}/uploads` (presign) · `POST /mains/attempts/{id}/uploads/{n}/ocr` · `PUT /mains/attempts/{id}/extracted-text` · `POST /mains/attempts/{id}/submit` · `GET /mains/attempts/{id}` (with evaluations) · `POST /mains/attempts/{id}/evaluate` (ai) · `POST /mains/attempts/{id}/request-mentor` · `POST /mains/attempts/{id}/share-peer` · `POST /mains/attempts/{id}/rewrite` · `GET /mains/attempts/{a}/compare/{b}` · `GET /mains/history` · `GET /mains/progress` · `GET /mains/weaknesses` · `GET /mains/model-answers?question=` (post-submit only) · papers: `POST /mains/papers/simulations`, `PUT /mains/papers/simulations/{id}/answers/{qid}`, `POST /mains/papers/simulations/{id}/submit`.
Admin: `/admin/mains/questions`, `/admin/mains/rubrics`, `/admin/mains/model-answers`.

## 8. AI behaviour (task `mains_evaluate`)
Inputs: question (+keywords/model outline when available), answer text (+OCR confidence), marks/word limit, rubric version, student stage, language `en`. Grounding: syllabus node(s), approved model outline, lesson key points, recent current affairs tagged to the topic (only used as *suggested* examples with source link). Rules: do not fabricate facts, committee names, case citations, data; mark uncertain items as "verify"; quote answer text for each critique; keep tone constructive; never reveal a hidden model answer verbatim before submission; handle empty/too-short/off-topic/AI-pasted answers with specific guidance; bias checks across handwriting vs typed. Two-pass: (1) analysis with structured rubric, (2) validator ensures JSON schema, score arithmetic, span offsets valid. Fallback: if AI fails, queue retry and notify; provide keyword checklist immediately. Cost control: tiered model, cache by `hash(question_id, text, rubric_version)`. Privacy: answers not used for model training; stored encrypted; PII scrubbing in logs.

## 9. Entitlements
`mains.write` (free), `ai.mains.evaluate` (monthly quota), `mains.upload.ocr`, `mains.mentor_review` (booking-based, 17), `mains.paper_simulation`, `mains.analytics.advanced`. Defaults TBD (O1).

## 10. Events
`mains.answer_submitted`, `mains.evaluated`, `mains.rewritten`, `weakness.added`; consumers: progress/XP (only for submitted answers with ≥ 60% of word-limit `[PROPOSED]`), planner (rewrite tasks), revision, notifications ("Feedback is ready").

## 11. Non-functional
Autosave never loses > 5 s of text; upload resumable; OCR < 20 s/page p95; AI job idempotent; evaluation visible via polling/SSE; accessibility for editor (screen reader, large text); mentors can only access attempts explicitly shared via booking or review request; deletion of attempts honours privacy requests.

## 12. Edge cases
Answer far over/under word limit; non-English text in v1 (warn, evaluate best-effort or reject per flag); handwritten page order mistakes; OCR hallucination (confidence per line, require confirmation); AI contradicts mentor (display both; collect feedback "which was more helpful?"); resubmitting identical text (return cached); concurrent edits on two devices (last-write with version check + conflict banner); question edited/retired after attempts (freeze snapshot text in attempt).

## 13. Acceptance criteria
- Given a 150-word typed answer submitted with route AI, then within 3 minutes I see overall score/band, ≥ 6 rubric dimensions and ≥ 3 passage comments anchored to my text, labelled "AI feedback".
- Given two handwritten pages with one blurred, then I can't submit until I retake/replace it or acknowledge the warning (if policy allows) and the extracted text is user-confirmed.
- Given I request a mentor review and the mentor completes it, then the mentor review appears in its own tab and does not change the AI score.
- Given I haven't submitted, then model/community answers return `403 submit_required`.

## 14. Task breakdown hint
1. Mains question/rubric model + admin CRUD (M)
2. Attempt lifecycle + editor + autosave + timer (L)
3. Upload + OCR + extracted-text confirmation (L)
4. AI evaluation service + validator + UI rendering with anchored comments (XL; core differentiator)
5. Rewrite/compare/history (M)
6. Mentor-review request + peer-review hooks (M; with 15/16)
7. Weakness notebook + progress analytics (M)
8. Essay/Ethics/paper simulation (L)
9. Calibration harness and eval datasets (M)

## 15. Open questions
O1; default timer rule; whether AI score is shown numerically or as bands only (recommend band + range to avoid false precision); Hindi timing (O8); who authors rubrics and model answers; whether handwritten uploads are free-quota.
