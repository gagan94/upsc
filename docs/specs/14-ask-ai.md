# 14 — Ask AI (assistant panel, workspace, AI gateway behaviour)

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03; reads from 05, 06, 07, 08, 09, 10, 11, 12, 13 | **Used by:** every module via the panel
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
A context-aware study assistant available everywhere. Two surfaces: a **side panel** that knows the material on screen ("Ask about the material in view. Close to return to the same screen.") and a **full workspace** with modes, history, attachments and actions. It explains, analyses current affairs against the syllabus, generates practice, reviews answers, plans study, and answers questions about attached documents — with grounded, source-citing answers and honest uncertainty.

## 2. Actors
Student; AI gateway (system); mentors indirectly ("Ask a mentor" hand-off).

## 3. User stories
- US-14-01 On any screen I press **Ask AI**; the panel opens with the current material attached (lesson, article, note, question, answer) and quick actions ("Explain this material", "Choose context", "Open full workspace", "Close").
- US-14-02 In the workspace I pick a mode (Prelims / Mains / Interview) and a starter: Understand a topic, Analyse current affairs, Practise questions, Review my answer, Plan my study, Ask a document.
- US-14-03 I control what AI may use: attach lessons/notes/documents/articles; "No unrelated private notes used"; personal progress data is **off by default** and I can allow it per request.
- US-14-04 I get structured answers with Sources, and one-tap actions: Save to Notes, Create flashcards, Add revision task, Practise this topic, Review my answer, Ask a mentor, Helpful, Report an issue, Copy, Edit question, Regenerate.
- US-14-05 I keep conversations (search, archive, history) or use **Temporary chat** that isn't saved.
- US-14-06 I get clear states for: preparing, stopped, error, offline, daily allowance reached, evidence needs checking, attachment unavailable.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Panel (side drawer) | `72:4594` Ask AI dialog / panel · panel answer variant ("Ask AI dialog / panelAnswer") |
| Workspace home ("What would you like to do? — Understand a topic / Analyse current affairs / Practise questions / Review my answer / Plan my study / Ask a document"; sidebar "Your conversations" with Search, Archived, Temporary chat; top actions New chat · History · Preferences · Privacy; mode chips Prelims · Mains · Interview; "Ask a follow-up" with Choose a sample question / Attach material / Upload) | `149:16452` Ask AI |
| Conversations | `274:36131` Fundamental Rights explained · `274:36398` Current affairs → syllabus (answer card with GS connection, Prelims connection, Mains angle, caveat, "Context: selected article only · No unrelated private notes used"; action rows) · `274:36665` Ask your document · `274:36932` Mains answer feedback · `274:37199` Your next 90 minutes (suggested plan "review before saving", "Allow Progress for this plan", Preview tasks) · `274:37466`–`38267` Polity practice (4 states) · `274:41738` Interview practice |
| History | `274:38534` Conversation history · `274:38801` Archived conversations · `274:39068` Conversation history (search results) |
| System states | `274:39335` Preparing your answer · `274:39602` Generation stopped · `274:39869` Could not generate the answer · `274:40136` You are offline · `274:40403` Daily AI allowance reached · `274:40670` **Evidence needs checking** ("I do not have a verified current figure… Attach a verified source… No verified current source · No invented citation") · `274:40937` Choose what AI should use (Attach context / Ask a general question) · `274:41204` Attached material is unavailable · `274:41471` Language: Hindi (**out of scope for v1**, D11) |
| Result actions | `274:42005` Saved note · Fundamental Rights · `274:42272` Flashcards · Writ remedies · `274:42539` Planner · AI revision task added · `513:83236` AI context bridge (platform consolidation) |
| In-context entry points | Top bar **Ask AI** button; reader toolbars ("Ask AI", "Explain with AI", "Explain passage" `129:10871`), Notes "Ask AI" dialog `500:76696`, Mains feedback, Practice "Ask AI about my reasoning", Planner/Home |

## 5. Functional requirements
**Surfaces and context**
- FR-14-01 `[FIGMA]` **Panel** opens over the current page (right drawer, 420–480 px; full-screen on mobile web) without navigation; closing returns to the same scroll/position. It shows the attached context chip ("No study material attached" → "Lesson: The Company Rule · Section 2"), and actions: *Explain this material*, *Choose context*, *Open full workspace* (carries the thread), *Close*.
- FR-14-02 `[FIGMA]` **Context sources** (each attachable, removable): current page object (lesson/section, article/passage, Act, resource section, question + attempt, Mains answer + evaluation, note, planner day), selected text, uploaded document (PDF/image up to 20 MB, ≤ 50 pages) or "selected PDF pages", user's notes (explicit pick), syllabus node(s), Progress summary (opt-in).
- FR-14-03 `[FIGMA]` **Privacy by default**: only explicitly attached context is sent; the answer footer states what was used ("Context: selected article only · No unrelated private notes used"). **Personal study data (progress, mistakes, planner) is off by default** and is enabled per request via "Allow Progress for this plan" or via Preferences ("Remember my permission for plans").
- FR-14-04 `[FIGMA]` Modes: **Prelims** (concise, option-elimination, facts), **Mains** (structure, multi-dimensional, keywords, answer templates), **Interview** (DAF-style questions, follow-ups, feedback on delivery text) — mode sets system prompt, output format and default tools.
- FR-14-05 `[FIGMA]` Starters: Understand a topic; Analyse current affairs (Background, Syllabus links, Mains angles); Practise questions (generated questions with explanations -> practice set in 08); Review my answer (rubric + specific improvements, hands off to 09 for formal evaluation); Plan my study (suggested tasks, preview before saving, 10); Ask a document.

**Conversation**
- FR-14-10 `[FIGMA]` Chat thread with streaming responses (SSE), stop generation ("Generation stopped"), regenerate, edit question and resend (creates a branch), follow-ups keep context; title auto-generated; "Preparing your answer…" skeleton; error state with retry; offline state queues nothing (explains).
- FR-14-11 `[FIGMA]` Response structure (mode-aware): short answer first, then sections (Background, Syllabus connection (GS paper/topic), Prelims angle, Mains angle, Example/Diagram `[PROPOSED]`), caveats, **Sources** (expandable citations to lessons/articles/Acts/user docs with section anchors — never uncited external claims presented as fact).
- FR-14-12 `[FIGMA]` Action bar under each answer: **Sources**, **Save to Notes** (note kind `ai_saved` with citations, 13), **Create flashcards** (11), **Add revision task** (10), **Practice this topic** (08 prefilled by topic), **Review my answer** (09), **Ask a mentor** (opens mentor directory/booking with the thread summary as the booking agenda `[PROPOSED]`), **Helpful** (thumbs), **Report an issue** (categories: wrong fact, unsafe, off-topic, other), **Copy answer**, **Edit question**, **Regenerate**.
- FR-14-13 `[FIGMA]` Result confirmations: toasts "Saved note · Fundamental Rights", "Flashcards · Writ remedies (N created)", "Planner · AI revision task added" with Undo/Open.
- FR-14-14 `[FIGMA]` History & organisation: list (Today/Yesterday/Earlier, with module chip "Polity", "Current affairs", "Planner"), search conversations, rename, archive/unarchive, delete, **Temporary chat** (not stored, excluded from history, no memory; server keeps nothing beyond the request except abuse/safety logs per policy), export conversation `[PROPOSED]`.
- FR-14-15 `[FIGMA]` Preferences: default mode, answer length (concise/standard/detailed), tone, show sources by default, remember progress permission, save history on/off. **Privacy** page: what's stored, how to delete all history, data-use statement (not used to train models).

**Grounding and honesty (critical)**
- FR-14-20 `[FIGMA]` **Evidence rule**: for factual claims about *current figures, dates, legal status, schemes, committee names, case citations*, the assistant must have a supporting source in context or retrieved from the platform's verified corpus; otherwise it states the limitation ("I do not have a verified current figure in the attached material…"), shows "No verified current source · No invented citation", and offers **Attach a verified source**. The UI uses a distinct "Evidence needs checking" state.
- FR-14-21 Retrieval: hybrid search over lessons, verified articles, resources, Acts & Bills, PYQ explanations, and the user's attached/notes (permission-filtered), ranked by syllabus match; top-k passages with ids passed to the model; answer must cite passage ids; a post-check drops citations not present in retrieved ids.
- FR-14-22 Conflicting sources are surfaced ("The sample notes and article use different reporting periods, so I should not combine their totals").
- FR-14-23 Safety: refuse non-study harmful requests; no exam-leak/cheating assistance; political neutrality in Mains/Interview prompts (balanced arguments); never impersonate UPSC/official evaluators; medical/mental-health crises -> supportive redirect `[PROPOSED]`.
- FR-14-24 Answer-quality telemetry: Helpful/Report ratio per mode; fallback to "I'm not sure" rather than speculating; eval suites per starter (see §8).

**Limits and states**
- FR-14-30 `[FIGMA]` Quotas via entitlements (03): messages/day, documents/day, tokens/month; "Daily AI allowance reached" shows reset time, what still works (browse, notes, saved answers), upgrade CTA; soft warning at 80%.
- FR-14-31 `[FIGMA]` "Attached material is unavailable" (deleted/moved/permission lost) -> thread continues without it with a notice; the stored snippet is not silently reused.
- FR-14-32 `[FIGMA]` Language selector exists in Figma (Hindi variant) — **v1: English only**; keep `locale` parameter in API and prompts (D11).
- FR-14-33 Rate limit: 20 requests/min/user; concurrency 2 streams/user.

**Interview practice `[FIGMA]` (`274:41738`)**
- FR-14-40 `[PROPOSED]` Mock-interview chat: user picks profile (DAF-lite: education, hobbies, service preference, state); assistant asks sequential questions, probes, then gives feedback (clarity, balance, content depth, red flags) on text answers; optional voice input later (non-goal v1).

## 6. Data model (module `askai`; AI infra in `ai`)
- `ai_conversations(id, user_id, title, mode, context_summary jsonb, is_temporary, archived_at, created_at, last_message_at, deleted_at)`
- `ai_messages(id, conversation_id, role[user|assistant|system_event], content_blocks jsonb, citations jsonb, attachments jsonb, context_used jsonb (what was sent), tokens_in/out, model, prompt_version, latency_ms, status, feedback[helpful|not_helpful|reported], parent_message_id (branches), created_at)`
- `ai_attachments(id, user_id, file_id, kind, pages, status, extracted_text_ref)`
- `ai_preferences(user_id, default_mode, length, tone, show_sources, remember_progress_permission, save_history)`
- `ai_reports(id, message_id, user_id, category, text, status, handled_by)`
- `ai_usage(user_id, day, requests, tokens_in, tokens_out, cost_minor)` (also in billing counters)
- `ai_prompts(task, version, template, schema, status)` + `ai_eval_runs`
- `retrieval_chunks(id, source_type, source_id, anchor, text, embedding vector, syllabus_node_ids[], visibility, entitlement_key, verified bool, updated_at)` (shared with search, 04)
Temporary chats store nothing in `ai_*` tables except aggregated usage.

## 7. API surface
`POST /ai/chat` (conversation_id|new, mode, message, context refs[], options) -> SSE stream of tokens + final structured message · `POST /ai/chat/{id}/stop` · `GET /ai/conversations?q=&archived=` · `GET/PATCH/DELETE /ai/conversations/{id}` · `POST /ai/messages/{id}/feedback|report|regenerate` · `POST /ai/messages/{id}/actions/{save_note|flashcards|revision_task|practice|plan_preview}` · `POST /ai/attachments` (presign) · `GET/PUT /ai/preferences` · `GET /ai/usage` · `DELETE /ai/history` (all). Internal `ai.run(task, input)` used by other modules (see 01 §5.4).

## 8. AI behaviour (gateway specifics)
- **Prompt architecture:** system (role, UPSC domain rules, evidence rule, safety, mode style) + retrieved context (with ids) + user context (only permitted) + conversation window (summarised beyond N turns) + tool schema.
- **Tools** (function calls the model may request; each permission-checked): `search_corpus(query, filters)`, `get_lesson_section(id)`, `get_article(id)`, `get_legal_record(id)`, `get_question(id)`, `get_user_note(id)` (only attached), `get_progress_summary()` (only if allowed), `create_note_draft`, `create_flashcards_draft`, `create_task_drafts` (preview-only; persistence requires UI confirmation), `generate_mcq_set`.
- **Models:** strong model for reasoning/analysis; fast model for classification/intent/title; configurable per task and per entitlement tier (cost control).
- **Structured output:** answers returned as typed blocks (heading, paragraph, bullets, table, citation) to render consistently and to enable "Save to Notes" without markdown parsing.
- **Evaluation:** offline eval sets per mode (≥ 150 prompts each): factual accuracy on UPSC syllabus items, citation validity (≥ 98% of citations resolve to provided passages), refusal correctness on unverifiable current figures (≥ 95% abstain), formatting compliance; regression gates before changing prompt/model; red-team set for jailbreaks and cheating requests.
- **Logging:** store prompt hash, ids of context used, tokens, cost; raw content only in `ai_messages` (user-visible, deletable); no third-party training use.
- **Latency targets:** first token < 3 s p95; full answer < 25 s p95 for standard length.

## 9. Entitlements
`ai.ask.message` (per day), `ai.ask.document` (documents/day), `ai.ask.interview`, `ai.ask.history` (retention days), `ai.context.progress`. Defaults TBD (O1).

## 10. Events
`ai.message_sent`, `ai.answer_helpful|reported`, `ai.action_taken(kind)`; drives product analytics and cost dashboards; reports feed admin queue (18).

## 11. Non-functional
Streaming resilience (resume after reconnect from last token id); multi-tab consistency; prompt injection defences (documents and articles treated as data; strip/neutralise instructions in retrieved content; tool calls constrained to the user's own permissions); PII minimisation; accessibility (live-region announcements for streamed answers, keyboard shortcuts `⌘/` to open); cost circuit breaker per user and global.

## 12. Edge cases
Attached document is scanned/handwritten (OCR path, 13); very long documents (chunked retrieval, say which pages used); user asks for current figures (evidence rule); conflicting user note vs lesson (show both); entitlement exhausted mid-stream (finish current answer); model outage (fallback model, then friendly error); regenerate loops (cap 5); accidentally sharing sensitive data (warn on detected card numbers/phones `[PROPOSED]`); mentor hand-off with temporary chat (ask to include summary).

## 13. Acceptance criteria
- Given an article is open and I click Ask AI → Explain this material, then the answer cites the article's passages, shows "Context: selected article only", and no notes/progress were sent (verifiable in `context_used`).
- Given I ask "What is the latest funding figure for this scheme?" with no verified source attached, then the response abstains per the evidence rule, shows the "Evidence needs checking" state and offers Attach a verified source; no number is invented.
- Given "Plan my study" without Progress permission, then tasks are generic by syllabus and the UI offers "Allow Progress for this plan"; with permission, tasks reflect weak topics; either way nothing is saved until I confirm in the preview.
- Given Temporary chat, then no conversation appears in History and no message rows are stored.

## 14. Task breakdown hint
1. AI gateway: provider client, prompt registry, structured output, logging, quotas, tracing (L)
2. Retrieval layer: chunking/embeddings pipeline for lessons/articles/resources/legal/questions; permission filters (L)
3. Chat API + SSE + conversation storage + history/archival/temporary mode (L)
4. Panel UI + workspace UI + context chips + permission model (L)
5. Answer renderer + action bar integrations (notes, flashcards, tasks, practice) (M)
6. Evidence/citation validator + abstain behaviour (M)
7. Interview mode + documents Q&A (M)
8. Eval harness + red-team suite + dashboards (M)
9. Preferences/privacy/delete-all (S)

## 15. Open questions
O1 (quotas), model/vendor final choice and region/data-residency terms, whether general (non-attached) questions are allowed on free tier, voice for interview (later), Hindi (O8).
