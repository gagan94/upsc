# 00 — Product overview

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** none | **Used by:** all

## 1. Vision
A single connected workspace in which a UPSC aspirant reads, takes notes, revises, practises and plans, with AI woven through every step and everything anchored to the **real UPSC syllabus**. The design tagline: *"Your preparation, one connected workspace. Read and learn. Capture useful notes. Revise, practise and plan your next step."*

The gap in the market (owner): no platform combines AI-assisted daily planning, current affairs mapped to the syllabus, on-demand MCQs, AI Mains evaluation, and mentorship in one place.

## 2. Personas
| Persona | Description | Key jobs |
|---|---|---|
| **Aspirant (student)** | Preparing for Prelims/Mains/Interview, 2027/2028 target, beginner to revision stage, first attempt or repeat | Plan each day, learn syllabus topics, read current affairs and link to topics, practise MCQs and answers, revise, get feedback, get mentored |
| **Mentor** | Educator or experienced aspirant who applies, is approved, sets availability/price, runs sessions and writes feedback | Get booked, prepare from the student's context, run live sessions, give feedback, get paid |
| **Content editor** | Internal team member | Upload lessons, manage syllabus and question bank, review AI-to-syllabus mappings |
| **Moderator** | Internal/community role | Handle reports on forum posts, messages, mentor reviews; manage restrictions and appeals |
| **Admin** | Internal operator | Users, plans, mentors, ingestion health, platform settings |
| **Guest** | Unauthenticated visitor | Try sample lesson/question/Mains prompt, read blog/about/contact, sign up |

## 3. Goals
1. A student can go from sign-up to a personalised starting plan in under 5 minutes (onboarding, 4 steps).
2. Every piece of study material (lesson, article, note, question, answer) is linked to syllabus nodes so progress, revision and recommendations are meaningful.
3. AI is available in context everywhere ("Ask AI" panel knows what is on screen) without leaving the page.
4. Paid mentorship works end to end (discover, book, pay or free, prepare, live session, feedback, payout).
5. Content and configuration are operable by a non-engineering team through a minimal admin console.
6. Plan tiers can change without code changes (entitlements as data).

## 4. Non-goals (v1)
- Native mobile apps (API-first so they can follow, D10).
- Languages other than English (D11), though i18n plumbing is included.
- Building the news-collection service (separate project, D6); this platform only ingests.
- Live group classes/webinars, e-commerce for physical books, offline-first PWA beyond explicitly designed offline reading.
- A full CMS or LMS authoring suite; admin is minimal (D3).

## 5. Anti-goals (would make the product a failure even if it "works")
- AI answers that sound confident but are not grounded in syllabus/sources (hallucinated Articles, dates, schemes). The design includes an "Evidence needs checking" state; specs make grounding mandatory.
- Gamification that rewards idle time instead of real study (design: "Recorded study, excluding idle time"; "A meaningful activity each day").
- Mentor-AI feedback blurred together; the design states "AI and mentor reviews remain distinct".
- Dark patterns around subscriptions or quotas.

## 6. Module map and navigation (as designed)
Left sidebar groups `[FIGMA]`:
- **Overview:** Home
- **Study:** Learn, Notes, Revision
- **Current Affairs:** Current Affairs, Magazines & Resources, Acts & Bills
- **Practice:** Prelims, Mains
- **Plan & Track:** Planner, Progress, Ask AI
- **Community:** Forum, Mentorship
- Footer: Help & Resources (menu), Profile & Settings (menu). Top bar: global search (⌘K), Ask AI button, notifications bell, user menu.

Spec mapping: Home/Planner → 10; Learn → 05; Notes → 13; Revision → 11; Current Affairs → 06; Magazines/Acts → 07; Prelims → 08; Mains → 09; Progress → 12; Ask AI → 14; Forum → 15; Mentorship → 16; Help → 19; Profile/Settings, auth, onboarding, public site → 02.

## 7. Cross-cutting product principles
1. **Context travels.** Moving between a news article, a note, a lesson, a flashcard and a question preserves the link (`source_ref`). Notes remember exact excerpts and their source.
2. **One syllabus spine.** A canonical syllabus tree (GS I–IV, Essay, CSAT, optional later) is the anchor for content, questions, tasks, progress and AI grounding.
3. **Recoverability.** Autosave on notes/answers/drafts; "Save and finish later" in onboarding; session recovery for study sessions; offline problem states are designed.
4. **Honest states.** Every screen has empty / loading / error / permission states (the Figma file draws many of them; specs enumerate them).
5. **Respect for the learner.** Optional fields (e.g. attempts) offer "Prefer not to say"; privacy and data controls are first-class.

## 8. Build order (summary; detail in `99-roadmap.md`)
- **Phase 0:** foundations — architecture, auth, profile, design system, entitlements, admin shell.
- **Phase 1 (core study loop):** syllabus + Learn, Notes, Planner/Home, Prelims practice, Ask AI basic, Current Affairs (ingestion + reader).
- **Phase 2:** Mains + AI evaluation, Revision, Progress, subscriptions billing, notifications, search.
- **Phase 3:** Mentorship + payments/payouts, Forum/community/messaging + moderation, mock tests/All-India.
- **Phase 4:** offline reading, calendar sync, advanced analytics, polish.

## 9. Glossary
- **GS I–IV:** General Studies Mains papers. **Prelims:** objective screening exam (GS + CSAT). **Mains:** descriptive papers incl. Essay and Ethics. **PYQ:** previous year question. **CSAT:** aptitude paper in Prelims (qualifying).
- **Syllabus node:** an entry in the canonical syllabus tree.
- **Mapping:** link between a content item (article/question/lesson) and syllabus nodes, possibly AI-suggested then admin-reviewed.
- **Entitlement:** a named capability or quota a plan grants (see 03).
- **Study session:** a timed focus block recorded against a task/topic (see 10).
