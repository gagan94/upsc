# 06 — Current affairs

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03, 05 (syllabus), 13 (notes), 14 (Ask AI) | **Used by:** 08, 10, 12, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`. Magazines/Resources and Acts & Bills are in spec 07.

## 1. Purpose
Turn the daily news into UPSC-relevant study: curated articles (pushed by a separate news service, D6), each mapped to the real syllabus, with Prelims/Mains angles, a quick overview, a focused reader, passage-level saving to notes, AI explanation, bookmarking, read tracking and weekly digests.

## 2. Actors
Student (read, filter, save, annotate, ask AI), News service (system actor; pushes via ingestion API), Content editor/Admin (review, correct mapping, retract, curate digests).

## 3. User stories
- US-06-01 I see today's curated articles with source, date, GS paper, subject, read time, a short brief and my read state.
- US-06-02 I filter by source (The Hindu / Indian Express / PIB), GS paper, subject, topic, date range, Prelims/Mains, read/unread, and sort newest/oldest; I can search news.
- US-06-03 I preview an article (quick overview) without leaving the list, then open the full focused reader.
- US-06-04 I select a passage and save it to Notes with its source, or ask AI to explain it in context.
- US-06-05 I bookmark/mark read, and revisit Saved, Archive and Digests.
- US-06-06 I see which syllabus topic and which of my lessons/PYQs/MCQs relate to an article ("Exam relevance", "Related learning").
- US-06-07 As an editor I can fix an article's mapping or retract it.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Today (tabs Today · Saved · Archive · Digests; links Magazines & Resources, Acts & Bills; source chips All sources / The Hindu / Indian Express / PIB; filter chips GS paper · Subject · Topic · Date range · Prelims/Mains · Sort · Search news; "News overview" list + "Quick overview" panel; item buttons Read · Bookmark · Preview) | `98:3939` Today · `98:4254` News item symbol · `129:9020` The Hindu · `129:9167` Indian Express · `129:9314` PIB · `129:9461` Unread · `129:9608` Read · `129:9755` GS II · `129:9902` GS III · `129:10049` Prelims · `129:10196` Mains · `129:10343` Oldest · `129:10490` Search results · `129:10637` Date range · topic pages `129:7844` Biodiversity · `129:7991` Constitutional proportionality · `129:8138` Public policy |
| Saved / Archive / Digests | `129:8285` Saved · `129:8432` Archive · `129:8579` Digests · `129:8726` Weekly digest ("28 Sep–04 Oct") |
| Reader | `446:73700` Finance Commission · Focused reader (title, source/date/GS/subject/read time, buttons Add to Notes · Explain with AI · Mark as read · Bookmark · More; Overview; Read the analysis; **UPSC connection** Prelims/Mains angles; Open publisher source; Back to overview / Next article) · `134:14030` Reading without selection · tabbed in-page analysis (Overview · Exam relevance · Related learning) in `98:3939`-style layout |
| Passage → notes modals (540px) | `134:13747`…`134:13962` per article (0–3): Save passage, Passage saved, Save full reference, Contextual explanation · `129:10784` Save passage · `129:10790` Save article · `129:10796` Note saved · `129:10827` New note · `129:10844` Bookmarked · `129:10853` Read · `129:10862` Highlighted · `129:10871` Explain passage · `98:4317` Add selection to notes · `129:8873` Notes / selection saved |
| Selector sheets | `134:13972` GS selector · `134:13984` Subject selector · `134:13999` Stage selector |
| Per-topic cards | `129:11541`/`11550` today exam relevance / learning; `11695`/`11704` environment; `11849`/`11858` proportionality; `12003`/`12012` policy |
| Verification | `513:82558` Source details · `513:82389` Content status · `513:82896` Missing content |
Home widget "Today's current affairs" `[FIGMA]` in Home concept B (`89:3378`).

## 5. Functional requirements
**Feed**
- FR-06-01 `[FIGMA]` Article card shows: title, source, published date, GS paper, subject, topic chips, read time, 1–2 line brief, read state (Unread/Read), bookmark state; actions Read / Bookmark / Preview.
- FR-06-02 `[FIGMA]` Tabs: **Today** (articles for the selected date, default today in IST; if none, latest available date with a notice), **Saved** (bookmarked), **Archive** (browse by date/month), **Digests** (weekly/monthly consolidations).
- FR-06-03 `[FIGMA]` Filters combine with AND: source, GS paper (I–IV, Essay `[PROPOSED]`, Prelims GS/CSAT), subject, topic, date range, Prelims/Mains relevance, Read/Unread; Sort newest/oldest; free-text search (title, brief, body, tags).
- FR-06-04 `[FIGMA]` Preview opens the "Quick overview" panel beside the list: In brief + **UPSC connections** (Prelims facts, Mains angles) + "Read full article". No navigation.
- FR-06-05 Default ordering (newest) with "Recommended for you" `[PROPOSED]` boost by the user's focus subjects and weak topics (12), clearly labelled.
- FR-06-06 Pagination/infinite scroll (cursor); counts per filter chip `[PROPOSED]`.

**Reader**
- FR-06-10 `[FIGMA]` Focused reader renders: header (source · date · GS · subject · read time), verification line ("Publication source shown; article-level verification pending" until verified), tabs/sections: Overview, Read the analysis (article text/summary the service is permitted to provide), UPSC connection (Prelims: key terms/Articles; Mains: themes/keywords), Exam relevance (probable question types, linked syllabus nodes), Related learning (lessons/modules, PYQs, practice MCQs, notes), "Open publisher source" (always present), Next article.
- FR-06-11 `[FIGMA]` Text selection toolbar: **Save passage** (to a note with excerpt + article ref), **Explain** (Ask AI contextual explanation anchored to the passage), **Highlight** (private highlight, listed under annotations), **Select a passage** helper button when no selection ("Reading without selection" state).
- FR-06-12 `[FIGMA]` "Add to Notes" at article level: creates/appends to a note with title, source, date, mapped syllabus nodes, plus chosen passages; "Save full reference" stores citation only. Success toast "Note saved" with link; "New note" modal to choose notebook/subject (13).
- FR-06-13 `[FIGMA]` Mark as read toggles `read_at`; auto-mark-read when ≥ 80% scrolled and ≥ 60% of estimated time `[PROPOSED]`; a read counts toward streak/XP only once and only as "meaningful activity" (12).
- FR-06-14 `[FIGMA]` Bookmark toggles saved list. "More" menu: copy link, report issue ("Report incorrect mapping"/"Report error"), share to forum `[PROPOSED]`, add to planner as task `[PROPOSED]`.
- FR-06-15 `[FIGMA]` "Open module" / "Related PYQs" / "Practice MCQs" buttons: open mapped lesson (05), PYQs filtered by node (08), or generate a 5–10 question AI MCQ set from the article grounded in its text (08, quota `ai.mcq.generate`).

**Digests**
- FR-06-20 `[FIGMA]` Weekly digest (e.g. "28 Sep–04 Oct") groups the week's articles by GS paper/subject with the same overview/preview behaviour; Monthly compilation `[FIGMA]` (`447:73738` Monthly compilation · Focused reader).
- FR-06-21 Digests are generated by a scheduled job (AI-assisted: group, de-duplicate, rank by exam relevance) and **reviewed/published by an editor** `[PROPOSED]`; digest page links back to full articles.
- FR-06-22 `[PROPOSED]` "Digest ready" notification (04).

**Mapping and quality**
- FR-06-30 Every article has `syllabus_map` (≥1 node) with `exam_use` and `confidence`; AI creates suggestions at ingest; `confidence < 0.7` or missing node => `needs_review` (admin, 18) and article still shows with "Mapping pending".
- FR-06-31 `[FIGMA]` Verification badge: `platform_sample | pending | verified`. "Verified" = editor confirmed original source, date and mapping (see 04 §8).
- FR-06-32 Retraction/correction: news service or editor can retract (`status=retracted`; shown as "This article was withdrawn by the source" in saved lists; user notes keep their excerpt).
- FR-06-33 De-duplication: same story from multiple sources groups into a "story cluster" `[PROPOSED]` with "Also covered by".

**Personalisation and linking**
- FR-06-40 Planner integration `[FIGMA]`: "Current affairs reading" task type (30 min) in Planner; reading completes the task prompt (10).
- FR-06-41 Home "Today's current affairs" widget shows top 3 relevant items.
- FR-06-42 Revision: user can "Add to revision" on an article, generating 2–5 flashcards from key facts (11).

## 6. Data model (module `affairs`)
- `articles(id, source, source_article_id, url, title, author, published_at, language, body_text null, summary, brief, gs_papers[], subject_ids[], topic_ids[], exam_use[prelims|mains], read_minutes, status[received|enriching|needs_review|published|retracted], verification_status, verified_by, verified_at, ingest_payload_ref, created_at)` (unique `(source, source_article_id)`)
- `article_analysis(article_id pk, overview, analysis_blocks jsonb, prelims_points jsonb, mains_angles jsonb, related_ids jsonb, model_version, generated_at)`
- `content_syllabus_map` (shared with 05)
- `user_article_state(user_id, article_id, read_at, bookmarked_at, last_position, highlights jsonb)` pk `(user_id, article_id)`
- `story_clusters(id, headline)` + `story_cluster_items`
- `digests(id, kind[weekly|monthly], period_start, period_end, status, published_at, editor_id)` + `digest_items(digest_id, article_id, group_key, order)`
- `ingest_log(id, idempotency_key, received_at, payload_hash, result, error)`
Indexes: `(published_at desc)`, GIN on `gs_papers`/`topic_ids`, FTS on title/brief/body.

## 7. API surface
Student: `GET /affairs/articles?tab=today|saved|archive&date=&from=&to=&source=&gs=&subject=&topic=&exam=&read=&sort=&q=&cursor=` · `GET /affairs/articles/{id}` · `GET /affairs/articles/{id}/related` · `POST /affairs/articles/{id}/read|unread|bookmark|unbookmark` · `POST /affairs/articles/{id}/highlights` · `POST /affairs/articles/{id}/save-to-notes` (passage[] | full) · `POST /affairs/articles/{id}/mcq-set` · `POST /affairs/articles/{id}/report` · `GET /affairs/digests?kind=` · `GET /affairs/digests/{id}`.
Ingestion (service-to-service, see 01 §5.5): `POST /ingest/v1/articles` · `POST /ingest/v1/articles/{id}/retract` · `PUT /ingest/v1/articles/{id}` (corrections) · `GET /ingest/v1/health`.
Admin: `GET /admin/affairs/queue?status=needs_review` · `PATCH /admin/affairs/articles/{id}` (mapping, verification, status) · `POST /admin/affairs/digests` / publish.

## 8. AI behaviour
Tasks (all grounded only in article text + syllabus node definitions; output JSON validated):
- `summarise_article`: 2–3 sentence brief + key facts list; no facts not present in text.
- `map_to_syllabus`: top-k nodes with confidence and `exam_use`; cites sentences supporting each node.
- `exam_relevance`: Prelims keywords/Articles/schemes; Mains themes, keywords, possible question stems.
- `explain_passage`: contextual explanation tied to syllabus; if the passage can't be grounded -> "Evidence needs checking" response (14).
- `digest_compose`: groups and orders; drafts section intros for editor approval.
Guardrails: never invent quotes, numbers, Articles or dates; include "source" reference for each claim; low-confidence flagged; prompts versioned; eval set of ≥200 hand-labelled articles for mapping accuracy (target ≥ 85% top-1 subject, ≥ 70% topic).

## 9. Entitlements
`affairs.read` (feed; likely free), `ai.explain.passage` (quota), `ai.mcq.generate` (quota), `notes.save` (free), `affairs.digest` and `affairs.archive.depth` (e.g. archive months) — defaults TBD (O1).

## 10. Events and notifications
Consumes `article.published`; emits `article.read`, `article.bookmarked`, `note.created_from_article`. Notifications: daily brief ready `[PROPOSED]`, weekly digest ready.

## 11. Non-functional
Ingest -> visible within 5 min p95 (enrichment async; article visible before AI finishes with "Analysis pending"); idempotent ingestion; payload ≤ 1 MB; HMAC signature + timestamp (5 min skew) + replay protection; storage of body text only when permitted by the service flag `redistribution_allowed`, else show brief + link; accessibility of selection toolbar via keyboard.

## 12. Edge cases
Duplicate pushes; late corrections after users saved passages (notes keep original excerpt + "source updated"); article without mapping; foreign-language article (reject in v1 or store `language` and hide, D11); extremely long article (chunked rendering); service outage (health page; "No articles yet today — showing yesterday"); timezone boundary (IST day); user saved passage text no longer present; paywalled source (publisher link only).

## 13. Acceptance criteria
- Given the news service posts the same `(source, source_article_id)` twice, then one article exists and the second call returns the same id (HTTP 200, `duplicate=true`).
- Given I select a paragraph and press Save passage, then a note is created containing the exact excerpt, article title/source/date, and link back; it appears in Notes → "Lesson highlights/Saved sources" style list (13).
- Given filters GS II + Prelims + The Hindu + date range, then only articles meeting all conditions are listed and the filter chips show the active state; clearing filters restores today's list.
- Given the article is retracted, then it disappears from Today but my saved note remains with a retraction banner.

## 14. Task breakdown hint
1. Ingestion endpoint + auth + idempotency + storage + dead-letter (M)
2. Enrichment pipeline (summary, mapping, relevance) + eval harness (L)
3. Feed API + filters + search (M)
4. Feed UI + preview panel (M)
5. Reader + selection toolbar + save-to-notes + explain (L; needs 13/14)
6. Bookmark/read/archive/saved (S)
7. Digests job + editor publish (M)
8. Admin review queue (S, in 18)

## 15. Open questions
O5 (licensing owned by news service), exact ingestion payload fields to be agreed with news-service team, whether PIB/Hindu items include full text or only summaries, regional-language sources later (D11).
