# 13 — Notes, handwritten pages, annotations and offline

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03, 05, 06, 07, 11, 14 | **Used by:** 04, 09, 11, 14, 16
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
One place for everything the student captures: typed notes, handwritten class-note pages (converted to searchable text but originals retained), exact excerpts saved from lessons/articles/Acts/answers with their source, subject notebooks, and tools to organise, export, annotate, read offline and push into revision. Design copy: "Your explanations, handwritten pages and saved sources, together."

## 2. Actors
Student (owner). Mentor (read-only access to a note only if the student attaches it to a booking, 16). AI (summaries, flashcards, explanations on request).

## 3. User stories
- US-13-01 I see Continue editing, All notes, filters, subject notebooks and notebook tools; create a new note quickly.
- US-13-02 I write typed notes with headings, bullets, highlights, a subject/topic, tags and a link back to the source; autosave protects me.
- US-13-03 I upload photos/PDF of handwritten pages; the system scans, converts to text, I review uncertain words, and keep the original beside the text.
- US-13-04 From a lesson, article, resource, Act, Mains answer or mentor feedback I save a passage (exact excerpt retained) or the full reference into a note.
- US-13-05 I search notes (including handwriting text), filter by subject/source/type/date/tags, organise into notebooks, move, delete to trash and restore, export/download.
- US-13-06 I annotate lesson pages and notes, ask AI about a note, and send a note to revision.
- US-13-07 I can make selected content available offline and understand what is cached.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Notes overview (Continue editing "Historical background — my notes · Autosave on · Saved"; Your notes list with types "Typed · Personal notebook", "Handwritten · Original pages and converted text", "Source linked · Exact excerpt retained"; Subject notebooks Indian Polity · History · Economy · Mains enrichment; Notebook tools; New note / Search notes / Filters / Download notes) | `129:12554` Notes / Overview · `132:13872` Notes workspace · `500:76167` Notebook · `500:76344` Notes empty |
| Editor | `500:76336` Note editor (Back, Add to revision, Ask AI, More; title; Heading / Bullet list / Highlight; "Your explanation"; Subject/topic; Tags; Linked source + Open original source; Save note; Save & add to revision; Download note; Autosave on · Saved) |
| Handwritten | `500:76338` Handwritten viewer · dialogs `500:76683` Upload notes · `500:76684` Scan preview · `500:76685` Upload error · `500:76686` Upload saved · `500:76687` OCR review ("Review converted text against the original… Uncertain words need your confirmation"; Save alongside original; Conversion failed) |
| Dialogs | `500:76682` New note · `500:76688` Note tools · `500:76689` Note saved · `500:76690` Save error · `500:76691` Leave draft · `500:76692` Move note · `500:76693` Delete note · `500:76694` Deleted note · `500:76695` Note filters · `500:76696` Ask AI (on note) · `500:76704` Export note · `500:76705` Source changed · `500:76703` Source unavailable · `508:76694` Autosave and drafts |
| Platform consolidation | `513:80361` Notes trash · `513:80530` Organize notes |
| From sources | CA: `129:8873` Notes / Current affairs selection saved, `98:4317`, `129:10784`…`129:10871` · Lessons: `479:74561` Learning notes · `Study collaboration / Annotated reader` `529:82837`, `Annotation editor` `529:82839`, `Delete annotation` `529:82841`, `Page annotations` `529:82843`, `Download notes` `529:82845`, `Download status` `529:83014`, `Offline options` `529:83183`, `Offline downloads` `529:83352`, `Offline reader` `529:83521`, `Offline problem` `529:83523`, `Offline update` `529:83692`, `Remove download` `529:83861` |
| Mentor | `132:14154` Mentorship / Notes saved (session notes, 16) · Ask AI saved note `Ask AI / Saved note · Fundamental Rights` |

## 5. Functional requirements
**Note model**
- FR-13-01 `[FIGMA]` Note kinds: `typed`, `handwritten` (pages + converted text), `source_excerpt` (passage(s) from a source with exact text and source ref), `answer_notes` (from Mains/mentor feedback, e.g. "Save argument to Notes"), `session_notes` (from mentor sessions), `ai_saved` (Ask AI answer saved as note "Saved note · Fundamental Rights").
- FR-13-02 Fields: title, body (block JSON: paragraph, heading, bullet/numbered list, quote, highlight mark, table `[PROPOSED]`, image), subject/topic (syllabus node), tags, notebook, `source_refs[]` (type, id, anchor/offset, quoted text, captured_at, publisher/date), color/pin `[PROPOSED]`, `created_at/updated_at`, `deleted_at`.
- FR-13-03 `[FIGMA]` **Exact excerpt retained**: excerpts saved from sources are stored verbatim with an immutable `quote` field + source snapshot; if the source later changes show the "Source changed" dialog (compare, update or keep) or "Source unavailable" (keep snapshot).
- FR-13-04 `[FIGMA]` Notebooks: per subject (auto-created from syllabus: Indian Polity, History, Economy, …) plus "Mains enrichment" and user-defined; a note belongs to one notebook, many tags.
- FR-13-05 `[FIGMA]` Autosave every 3–5 s and on blur; status "Autosave on · Saved/Saving/Offline — saved on this device"; **Leave draft** dialog if unsynced; **Autosave and drafts** dialog explains recovery; version history (last 30 versions/30 days) `[PROPOSED]`.

**Capture**
- FR-13-10 `[FIGMA]` Save from reader: selection toolbar (06/05/07/09) -> "Save passage" modal (choose existing note or new, notebook, subject auto-suggested from the source's syllabus mapping, tags) -> toast "Note saved" with Open. "Save full reference" stores only citation. "Add article to Notes" adds a summary + chosen passages.
- FR-13-11 `[FIGMA]` Quick note: global "New note" (dialog), keyboard shortcut `N` `[PROPOSED]`; "Note at 04:32" from video (05).
- FR-13-12 `[FIGMA]` Handwritten upload: image (JPG/PNG/HEIC) or PDF, multi-page ≤ 30 pages/≤ 10 MB each; camera capture on mobile web; **Scan preview** (auto-crop, deskew, brighten, reorder, rotate); "Upload error" with specific reason; OCR job (vision model) -> **OCR review** screen: original page side-by-side with editable converted text, low-confidence words highlighted (confidence < 0.8) requiring confirmation, "Save alongside original" (both retained), "Conversion failed" -> keep as image-only note and offer retry.
- FR-13-13 `[PROPOSED]` Web clipper (browser extension "Research clipper", verified in Connected tools, 02): sends selected web text + URL to a note (marked `source_type=web`, not verified).
- FR-13-14 Import: paste Markdown/plain text; upload Word/PDF text `[PROPOSED later]`.

**Organise & find**
- FR-13-20 `[FIGMA]` Notes list: sort (updated, created, title), group by notebook, filter by kind, subject, tag, source type (lesson/article/resource/answer/mentor/manual), has-handwriting, linked-to-revision, date range ("Note filters" dialog); search (title, body, **handwriting text**, quotes) with highlighted snippets (04).
- FR-13-21 `[FIGMA]` **Organize notes**: bulk select -> move, tag, merge `[PROPOSED]`, add to revision, delete; **Move note** dialog.
- FR-13-22 `[FIGMA]` Delete = move to **Trash** (30-day retention) with restore and "Delete forever"; "Deleted note" confirmation with Undo.
- FR-13-23 `[FIGMA]` Export/Download: single note (PDF/Markdown/DOCX), notebook or all notes (ZIP with PDFs + originals); async job for large exports; "Download status" with link in notifications.
- FR-13-24 `[FIGMA]` "Note tools" menu: duplicate, move, export, share-with-mentor (to a booking), add to revision, ask AI, view source, history.

**Annotations (reader) `[FIGMA Study collaboration]`**
- FR-13-30 Highlight (4 colours), underline, comment on any text in lessons/articles/resources/own notes; annotations are private and anchored by (block id, start/end offsets, quote) so they survive minor edits; "Page annotations" list per document with jump-to; edit/delete annotation (confirm dialog).
- FR-13-31 Annotations roll into the document's "Learning notes" tab and are searchable.

**AI**
- FR-13-40 `[FIGMA]` "Ask AI" on a note (dialog): summarise, explain, quiz me, make flashcards (11), convert to Mains outline (09), find related lessons/PYQs; output can be saved back as a new note section ("Saved note · Fundamental Rights") with an "AI-generated" tag.
- FR-13-41 Note-aware search suggestions and related-content panel `[PROPOSED]`.

**Offline**
- FR-13-50 `[FIGMA]` "Make available offline" for lessons/articles/resources/notes: caches rendered content + media (service worker + IndexedDB); "Offline options" (what is included, storage used), "Offline downloads" list (size, last updated), "Offline reader", "Offline problem" (storage full/unsupported), "Offline update" (new version available), "Remove download". Edits made offline sync later (notes only; conflicts -> keep both with banner).
- FR-13-51 Entitlement `notes.offline` + storage cap (e.g. 500 MB `[PROPOSED]`); DRM-light: cached lesson content is encrypted at rest in the browser and expires after 30 days offline.

## 6. Data model (module `notes`)
- `notebooks(id, user_id, name, syllabus_node_id null, kind[subject|custom|system], order)`
- `notes(id, user_id, notebook_id, kind, title, body_blocks jsonb, body_text tsvector, syllabus_node_id, tags text[], pinned, source_summary jsonb, revision_enabled, created_at, updated_at, deleted_at, version)`
- `note_sources(id, note_id, source_type[lesson|article|resource|legal|answer|feedback|web|ai], source_id, anchor jsonb, quote text, snapshot jsonb, captured_at, status[ok|changed|unavailable])`
- `note_pages(id, note_id, page_no, original_file_id, scan_file_id, ocr_text, ocr_confidence, low_conf_spans jsonb, confirmed_at, status)`
- `note_versions(note_id, version, body_blocks, saved_at)` (retention policy)
- `annotations(id, user_id, doc_type, doc_id, block_id, start, end, quote, color, comment, created_at, deleted_at)`
- `offline_items(user_id, device_id, item_type, item_id, version, size_bytes, cached_at, expires_at)`
- `export_jobs(id, user_id, scope, format, status, file_id)`
Indexes: FTS GIN on `body_text` (plus OCR text), `(user_id, updated_at)`, `(user_id, notebook_id)`, `(user_id, deleted_at)`.

## 7. API surface
`GET /notes?notebook=&kind=&subject=&tag=&source=&q=&deleted=&cursor=` · `POST /notes` · `GET/PATCH/DELETE /notes/{id}` (PATCH uses version for conflict detection) · `POST /notes/{id}/restore|duplicate|move|export` · `POST /notes/from-source` (source_type, anchor, quote, target note/new) · `POST /notes/uploads` (presign) · `POST /notes/{id}/pages/{n}/ocr` · `PUT /notes/{id}/pages/{n}/confirm` · `GET /notebooks`, `POST /notebooks` · `GET /notes/{id}/versions` · `GET/POST/PATCH/DELETE /annotations` · `POST /notes/{id}/ai` (action) · `POST /notes/exports` · `GET /offline/manifest` · `POST /offline/items` · `DELETE /offline/items/{id}` · `POST /notes/bulk` (move/tag/delete/add-to-revision).

## 8. AI behaviour
- OCR: vision model with per-line confidence, language English v1 (Devanagari later), preserves line breaks, marks diagrams as `[diagram]`, never "corrects" meaning; low confidence spans flagged.
- Note AI actions: grounded on the note text + its sources; outputs labelled; can write into the note only with explicit "Insert".
- Privacy: notes never used for training; AI prompts exclude other users' data; per-request redaction of emails/phones `[PROPOSED]`.

## 9. Entitlements
`notes.basic` (free; count cap TBD), `notes.handwriting.ocr` (pages per month), `notes.offline`, `notes.export`, `ai.notes.assist` (quota). TBD (O1, O7).

## 10. Events
`note.created|updated|deleted|restored`, `note.page_converted`, `note.added_to_revision`, `annotation.created`; feeds search index (04), revision (11), progress (12).

## 11. Non-functional
Editor latency < 50 ms typing; autosave conflict-safe via version number + CRDT-lite merge for same-user multi-device `[PROPOSED]` (last-write-wins per block with conflict copy); OCR p95 < 20 s per page; storage encrypted; originals private bucket + signed URLs; trash purge job; accessibility (screen-reader friendly editor, keyboard shortcuts).

## 12. Edge cases
Duplicate saves of the same passage (detect & offer open existing); note referencing deleted source; very large notes (> 200k chars chunking); blurred pages; rotated pages; mixed handwriting/typed; offline edit conflicts; account deletion/export includes originals; trash restore into deleted notebook (restore to "Unfiled"); excerpt length limits for copyright (cap quoted text per source at 1,000 words per note `[PROPOSED]`).

## 13. Acceptance criteria
- Given I upload two handwritten pages, when OCR completes, then the review screen shows the page image and editable text with low-confidence words highlighted; saving keeps both original and text and the note appears in search for words in the text.
- Given I save a passage from an article, then the note contains the exact quote, the article title/source/date and a link that reopens the article at the passage.
- Given I delete a note, then it is in Trash for 30 days and restorable; after 30 days it is purged including originals.
- Given I'm offline, then offline-enabled notes are readable and editable; on reconnect changes sync or a conflict copy is created without data loss.

## 14. Task breakdown hint
1. Notes/notebooks CRUD + block editor + autosave + versions (L)
2. Source capture endpoints + excerpt storage + source-changed handling (M)
3. Handwritten upload + scan preview + OCR + review UI (L)
4. List/search/filters/organise/bulk/trash (M)
5. Export jobs (M)
6. Annotations on reader/notes (M)
7. Note AI actions (M, with 14)
8. Offline cache (service worker, manifest, encryption) (L)
9. Web clipper extension (M, later)

## 15. Open questions
O7 (offline scope/plan), clipper scope, note sharing between students (v1 none), collaborative notes (non-goal), DOCX export fidelity.
