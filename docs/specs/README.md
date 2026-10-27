# AI UPSC — platform specs

Specification set for an AI-first UPSC (Indian civil services) preparation platform. Written from the owner's Figma file and a product conversation (2026-10-26/27). The specs are meant to be turned into tasks and then code, module by module.

## Read in this order
1. `PROGRESS.md` — what is written, what is next. **Start here when resuming.**
2. `DECISIONS.md` — what the owner decided, what the author assumed, what is still open.
3. `00-overview.md` then `01-architecture.md` — context every other spec assumes.
4. The module spec you are working on. Its Figma frames are listed inside it; the full index is `figma/FRAME_INDEX.md`.

## Conventions
- `[FIGMA]` = behaviour visible in the owner's designs. `[PROPOSED]` = added by the spec author because the design is silent. Treat `[PROPOSED]` items as suggestions to confirm.
- Requirement ids: `FR-<spec>-<n>`; stories `US-<spec>-<n>`; open questions point to `DECISIONS.md` ids (`O1`...).
- Feature gating is by **entitlement keys** (see `03`). Never hard-code "free" vs "paid".
- Everything user-visible is English for v1 but all strings go through an i18n layer (D11).
- Figma screens carry "Demo/Illustrative" labels; those are placeholders, not requirements (D4).

## Spec map
| File | Module |
|---|---|
| 00-overview | Vision, personas, module map, build order |
| 01-architecture | Stack, system design, AI layer, ingestion API, NFRs |
| 02-auth-onboarding-profile | Public site, signup/login, onboarding, profile & settings |
| 03-subscriptions-entitlements | Plans, quotas, billing |
| 04-notifications-search | Notifications, global search |
| 05-learn-content | Syllabus, lessons, reader/video, progress |
| 06-current-affairs | News feed, reader, syllabus mapping, digests |
| 07-resources-acts-bills | Magazines & Resources, Acts & Bills |
| 08-prelims-practice | MCQs, PYQs, mocks, All-India tests, AI MCQs |
| 09-mains-ai-evaluation | Answer writing, AI/mentor/peer feedback, rewrite |
| 10-planner-study-sessions | Home, planner, focus sessions, AI plan |
| 11-revision-flashcards | Spaced repetition, mistakes |
| 12-progress-gamification | Analytics, streaks, XP, leaderboards |
| 13-notes | Notebooks, editor, OCR, annotation, offline |
| 14-ask-ai | AI assistant panel and workspace |
| 15-forum-community | Forum, circles, peer review, messages, moderation |
| 16-mentorship | Mentor marketplace and live sessions |
| 17-payments-payouts | Session payments and mentor payouts |
| 18-admin-console | Minimal admin |
| 19-help-support | Help centre and support |
| 20-data-model | Consolidated entities |
| 99-roadmap | Phases and open decisions |

## Source design
Figma: https://www.figma.com/design/6iaUE9cOXWyq5SbDe5esKm/Untitled (fileKey `6iaUE9cOXWyq5SbDe5esKm`). The file has ~1,040 top-level frames (full screens plus modal/toast states). `figma/FRAME_INDEX.md` groups them by module with node ids so any frame can be re-fetched with the Figma MCP `get_screenshot`.

Brand/visual language seen in the designs (reference for the front-end spec, not final tokens): dark navy left sidebar (~#13233A), teal primary (~#0F766E), white cards on a light grey-blue canvas, Inter-style sans-serif, 1596x1120 desktop frames. Pull exact tokens with `get_variable_defs` before building the design system.
