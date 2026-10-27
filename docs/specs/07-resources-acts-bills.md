# 07 — Magazines & Resources, Acts & Bills

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 05, 06, 13, 14 | **Used by:** 08, 12, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`. Both sections live under the Current Affairs nav group in the designs.

## 1. Purpose
Reference reading beyond daily news: magazines (e.g. Yojana, Kurukshetra), government/think-tank reports, monthly compilations, and a legal tracker for Acts and Bills that shows **status honestly** (a Bill is not an Act; enacted is not the same as commenced; superseded and withdrawn versions are labelled).

## 2. Actors
Student (browse, read, save, practise), Content editor/Admin (upload/manage, verify, link), News service or other feeds (optional ingestion `[PROPOSED]`).

## 3. User stories
- US-07-01 I browse resources by type, source, subject and language; search, filter, save, and resume reading at my last section.
- US-07-02 I read an issue/report in the focused reader, take passage notes, ask AI, mark sections complete.
- US-07-03 I open an Act or Bill and see overview, key provisions, status & timeline, amendments, earlier versions, with clear labels and a verification date.
- US-07-04 I practise questions generated from a magazine/Act and review them.
- US-07-05 As an editor I can upload a resource (PDF/HTML/blocks), tag it to the syllabus and mark it verified.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Magazines & Resources (cards: "Yojana · May 2026" (magazine, English, Governance, 24 min), "Governance outcomes · 2026 report" (report), "Monthly current affairs · May 2026" (compilation), "Kurukshetra · Sample issue" (unavailable); Search / Filters / Saved / Clear filters; "Continue reading … counts completed sections, not time with the tab open") | `377:67108` · `377:67358` Filtered resources · `377:67608` No resources found · `377:67858` Saved resources · `377:68108` Yojana · Sample issue · `377:68358` Yojana · Article reader · `377:68608` Reading completed · `377:68858` Governance report · Overview · `377:69108` Governance report · Reader · `377:69358` Issue unavailable · `377:69608` Magazine practice · `377:69858` Magazine practice review · `377:73608` Source unavailable · `446:73869`/`447:73738` Focused readers · `377:73881` Resource card symbol |
| Acts & Bills (cards: "Sample Transparency Act, 2024" Act · Enacted · Commencement to verify; "Sample Public Services Bill, 2026" Bill · Under review · Not enacted law; "Earlier version" Act · Superseded · Historical; "Withdrawn" Bill · Historical example; banner "Bill ≠ Act. Enacted ≠ commenced.") | `377:70108` · `377:70358` Filtered · `377:70608` None found · `377:70858` Saved · `377:71108` Act · Overview · `377:71358` Key provisions · `377:71608` Status & timeline · `377:71858` Amendments · `377:72108` Practice · `377:72358` Practice review · `377:72608` Bill · Overview · `377:72858` Bill · Timeline · `377:73108` Bill · Withdrawn · `377:73358` Earlier version |
| Global nav component | `382:67752` Global navigation · Current resources |

## 5. Functional requirements
**Resources**
- FR-07-01 `[FIGMA]` Resource types: `magazine_issue`, `report`, `compilation`, `book_extract` `[PROPOSED]`, `pdf`. Fields: title, type, publisher, issue/date, language (en), subject(s), GS paper(s), est. read minutes, cover, summary, source URL, verification status.
- FR-07-02 `[FIGMA]` Browse with Search, Filters (type, publisher, subject, GS paper, year/month, language, read state), Saved, Clear filters; empty state "No resources found" with reset action.
- FR-07-03 `[FIGMA]` Reader: sectioned content (articles inside an issue); progress is recorded per **completed section**, not time spent; "Continue <resource>" resumes at last section; "Reading completed" summary with next suggestions.
- FR-07-04 `[FIGMA]` Per-section tools identical to the article reader (06): Add to Notes, Explain with AI, Mark as read, Bookmark, passage save.
- FR-07-05 `[FIGMA]` "Issue unavailable" / "Source unavailable": when the original is missing or the license ended, show title/metadata, link to original source if public, and alternatives.
- FR-07-06 `[FIGMA]` Practice from a resource ("Magazine practice" + "review"): AI-generated MCQs/short answers grounded in the resource sections (08/09), with review screen.
- FR-07-07 `[PROPOSED]` Original PDFs shown via a secure viewer (no raw download unless allowed by license flag); text layer extracted for search/AI.

**Acts & Bills**
- FR-07-10 `[FIGMA]` Record types: `act`, `bill`, `ordinance` `[PROPOSED]`, `amendment`. Mandatory status fields: `legal_status` (`draft|introduced|under_review|passed_one_house|passed_both|assented|enacted|in_force|partially_in_force|withdrawn|lapsed|superseded|repealed`), `commencement_status` (`not_notified|notified|in_force|partial`), `version_label`, `verified_at`, `source_url` (official gazette/Parliament link).
- FR-07-11 `[FIGMA]` Always show the banner "Bill ≠ Act. Enacted ≠ commenced." and a "Read status before provisions" block on the list; detail pages show a status chip row (Act · Enacted · Commencement to verify).
- FR-07-12 `[FIGMA]` Detail tabs: **Overview**, **Key provisions** (structured list: scope/definitions, responsibilities, process/timelines, exceptions/safeguards, review/redress), **Status & timeline** (stages with dates for Bills: introduced, committee, passed, assent; for Acts: enactment, commencement notifications, rules), **Amendments** (list with links), **Earlier versions** (superseded text clearly labelled, link to current), **Related** (news, lessons, PYQs).
- FR-07-13 `[FIGMA]` Historical/withdrawn records carry a prominent label ("No longer under consideration. Check for a successor bill before using this text.").
- FR-07-14 `[FIGMA]` Actions: Add to Notes, Explain with AI, Mark as read, Bookmark, Open source; Acts & Bills practice + review.
- FR-07-15 Filters: type, ministry/subject, year, status, commenced/not, Prelims relevance.
- FR-07-16 AI explanations must quote the **legal_status** and warn if `verified_at` is older than 90 days or missing `[PROPOSED]`.
- FR-07-17 `[PROPOSED]` Subscription ("Follow this Bill") -> notification on status change (04).

## 6. Data model
`resources(id, type, title, publisher, issue_label, published_on, language, cover_file_id, summary, source_url, license_flags jsonb, status, verification_status, verified_at)` · `resource_sections(id, resource_id, order, title, body_blocks jsonb, read_minutes)` · `resource_files(resource_id, file_id, kind)` · `user_resource_state(user_id, resource_id, last_section_id, completed_sections uuid[], saved_at, completed_at)` · `legal_records(id, kind, title, short_title, year, ministry, subject_ids[], legal_status, commencement_status, version_label, supersedes_id, superseded_by_id, summary, source_url, verified_at, verified_by)` · `legal_timeline_events(legal_record_id, date, stage, description, source_url)` · `legal_provisions(legal_record_id, order, heading, body_blocks)` · `legal_amendments(legal_record_id, amending_record_id, date, summary)` · syllabus mapping via shared `content_syllabus_map`.

## 7. API surface
`GET /resources?type=&publisher=&subject=&gs=&q=&saved=&cursor=` · `GET /resources/{id}` · `GET /resources/{id}/sections/{sid}` · `PUT /resources/{id}/progress` · `POST /resources/{id}/save|unsave` · `POST /resources/{id}/practice` · `GET /legal?kind=&status=&year=&q=` · `GET /legal/{id}` (+ `/provisions`, `/timeline`, `/amendments`, `/versions`) · `POST /legal/{id}/follow`.
Admin: CRUD + upload endpoints under `/admin/resources` and `/admin/legal` (18); optional `POST /ingest/v1/resources` for the news service.

## 8. AI behaviour
Grounded Q&A, summaries, key-provision extraction (editor-approved before publish), MCQ generation, mapping to syllabus. Hard rule: for legal content AI **must not** infer status or dates not in the record; unknown -> "not verified". Eval set for legal-status statements; red-team prompts about "is X law yet?".

## 9. Entitlements
`resources.read`, `resources.premium` (per item `entitlement_key`), `legal.read`, `ai.mcq.generate`, `notes.offline` — TBD (O1).

## 10. Events
`resource.opened|section_completed|completed`, `legal.viewed`, `legal.status_changed` (editor update) -> notifications for followers.

## 11. Non-functional
PDF viewer performance (lazy page loading), license compliance flags enforced server-side, signed URLs, audit of verification changes, accessibility of long documents (landmarks, reading order).

## 12. Edge cases
Resource removed after user progress (keep progress, show unavailable); issue re-uploaded (map old section ids by order/title); Bill becomes Act (create/link new Act record, mark Bill `passed_both/assented` and link `superseded_by`); partial commencement; two Acts with same short title different years; user bookmarks an item that is later withdrawn (badge).

## 13. Acceptance criteria
- Given an Act with `legal_status=enacted` and `commencement_status=not_notified`, then the card shows "Enacted · Commencement to verify" and the AI never says it is "in force".
- Given I read sections 1–2 of 3 and leave, then "Continue" returns to section 3 start and progress shows 2/3 regardless of time spent.
- Given a superseded version, then the page shows "Superseded" and a link to the current version above the text.

## 14. Task breakdown hint
1. Resource + section model, admin upload (PDF/blocks) (L)
2. Resource list/filters/saved UI (M)
3. Reader with section progress (M, reuse 06 reader)
4. Legal records model + admin editor (L)
5. Legal detail tabs + timeline UI (M)
6. Practice-from-resource (M, needs 08)
7. Follow + status-change notifications (S)

## 15. Open questions
**New O9:** who supplies/licences magazine and Acts & Bills content (admin upload vs separate feed)? Official sources for Acts (India Code, PRS)? Terms of reuse. Not discussed with owner — spec supports both admin upload and ingestion.
