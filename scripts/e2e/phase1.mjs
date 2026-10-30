#!/usr/bin/env node
// Phase 1 click-through (Playwright, Node ESM). Run by hand against a deployed site:
//   DEMO_PASSWORD=... PLAYWRIGHT_DIR=/path/to/dir/with/node_modules node scripts/e2e/phase1.mjs \
//     --base-url https://<web-url> --out ./e2e-out
// See scripts/e2e/README.md. Reads DEMO_PASSWORD from the environment only and never prints it.
//
// Flags: --base-url <url> (required) --out <dir> (default ./e2e-out) --dry-run (print the plan, run nothing)
//        --only a,b,c,d (run only these scenarios) --headed --skip-warmup
//
// Failure rule for EVERY step: any uncaught page error, any console.error, or any HTTP >= 400 response from the
// app's own origin that is not on that step's explicit `expect` list fails the step. A failing step takes a
// screenshot; the run continues with the next step/scenario and exits 1 if anything failed.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const DRY = flag("dry-run");
const BASE = (opt("base-url", "") || "").replace(/\/+$/, "");
const OUT = path.resolve(opt("out", "./e2e-out"));
const ONLY = (opt("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const HEADED = flag("headed");
const PASSWORD = process.env.DEMO_PASSWORD ?? "";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14); // e.g. 20261030153045

const ACCOUNTS = { student: "student@example.com", admin: "admin@example.com", newstudent: "newstudent@example.com" };

const redact = (s) => {
  let out = String(s ?? "");
  if (PASSWORD) out = out.split(PASSWORD).join("[redacted]");
  return out;
};
const log = (...a) => console.error(redact(a.join(" "))); // progress goes to stderr; stdout is the JSON summary only

// ---------- tiny assertion helpers (no @playwright/test dependency) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, what, timeout = 15000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      last = e;
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for: ${what}${last ? ` (${last.message})` : ""}`);
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
};
const see = (loc, what) => loc.first().waitFor({ state: "visible" }).catch(() => {
  throw new Error(`Not visible: ${what}`);
});
const gone = (loc, what) => loc.first().waitFor({ state: "hidden" }).catch(() => {
  throw new Error(`Still visible: ${what}`);
});
const heading = (page, name, level = 1) => page.getByRole("heading", { name, level, exact: typeof name === "string" });
/** The app shows these when a server load fails; none of them may appear on a healthy page. */
async function noErrorPanel(page) {
  const bad = page.getByText(/We couldn.t load|Something went wrong|Couldn.t load your session/);
  if ((await bad.count()) > 0) {
    // Only read the text when a panel exists (innerText on an empty locator waits for the timeout).
    const text = (await bad.first().innerText()).slice(0, 80);
    assert(false, `error panel on ${new URL(page.url()).pathname}: "${text}"`);
  }
}
/** Clicks a toggle chip only when it is not already on (keeps re-runs idempotent). */
async function ensurePressed(loc) {
  if ((await loc.getAttribute("aria-pressed")) !== "true") await loc.click();
  assert((await loc.getAttribute("aria-pressed")) === "true", "toggle chip did not turn on");
}
const respondsTo = (page, method, re, timeout = 20000) =>
  page.waitForResponse((r) => (Array.isArray(method) ? method : [method]).includes(r.request().method()) && re.test(r.url()), { timeout });

// ---------- scenario registry ----------
/** @type {{id:string,title:string,steps:{name:string,critical?:boolean,expect?:{status:number,url?:RegExp}[],run:Function}[]}[]} */
const SCENARIOS = [];
function scenario(id, title, build) {
  const steps = [];
  const api = { step: (name, run, o = {}) => steps.push({ name, run, ...o }) };
  build(api);
  SCENARIOS.push({ id, title, steps });
}

// ---------- login helper ----------
async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/\/(home|onboarding)(\/|\?|$)/, { timeout: 90000 }); // first call may wake the free-tier API
}

// =====================================================================================
// (a) newstudent: onboarding -> planner -> task -> study session
// =====================================================================================
scenario("a", "New student: onboarding, planner, tasks, study session", (s) => {
  const taskTitle = `E2E task ${STAMP}`;
  let onboarded = false; // true only if this run completed onboarding

  s.step("log in as newstudent (not_started lands straight on /onboarding)", async ({ page }) => {
    await login(page, ACCOUNTS.newstudent);
    if (!/\/onboarding/.test(page.url())) {
      await see(heading(page, "Your preparation at a glance"), "Home heading");
    }
  }, { critical: true });

  s.step("onboarding wizard: 4 steps + review, accept plan", async ({ page }) => {
    // A fresh newstudent (not_started) is already on /onboarding after login. Only an earlier, interrupted
    // run (in_progress) or a completed one lands on Home: resume via the banner, or skip if there is none.
    if (!/\/onboarding/.test(page.url())) {
      await see(heading(page, "Your preparation at a glance"), "Home heading");
      const banner = page.getByRole("link", { name: "Finish personalising my workspace" });
      if ((await banner.count()) === 0) {
        log("  newstudent already completed onboarding in an earlier run: skipping the wizard");
        return { note: "onboarding already completed earlier; wizard skipped" };
      }
      await banner.click();
      await page.waitForURL(/\/onboarding/);
    }
    for (let i = 0; i < 7; i++) {
      const title = (await page.getByRole("heading", { level: 1 }).first().innerText()).trim();
      if (title === "Review your plan") break;
      if (title === "Your preparation") {
        await page.getByRole("radio", { name: "2027", exact: true }).click();
        await page.getByRole("radio", { name: "Preparing", exact: true }).click();
      } else if (title === "Your focus") {
        await page.getByRole("radio", { name: "Both", exact: true }).click();
      } else if (title === "Your routine") {
        await page.getByRole("radio", { name: "3 hours", exact: true }).click();
        await ensurePressed(page.getByRole("button", { name: "Morning", exact: true }));
        await ensurePressed(page.getByRole("button", { name: "Evening", exact: true }));
      } else if (title === "Support you want") {
        await ensurePressed(page.getByRole("button", { name: "A study plan", exact: true }));
        await ensurePressed(page.getByRole("button", { name: "Practice questions", exact: true }));
      } else {
        throw new Error(`Unexpected wizard heading "${title}"`);
      }
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await until(async () => (await page.getByRole("heading", { level: 1 }).first().innerText()).trim() !== title, `wizard to leave "${title}"`);
    }
    await see(heading(page, "Review your plan"), "Review step");
    const accept = page.getByRole("button", { name: "Accept plan and start" });
    await see(accept, "Accept plan button (preview loaded)");
    const taskCount = await page.locator("main ul li").count();
    assert(taskCount >= 5, `starter plan preview has ${taskCount} tasks, expected >= 5`);
    await accept.click();
    await page.waitForURL(/\/home/, { timeout: 30000 });
    await see(heading(page, "Your preparation at a glance"), "Home after onboarding");
    assert((await page.getByRole("link", { name: "Finish personalising my workspace" }).count()) === 0, "onboarding banner still shown after completing");
    onboarded = true;
    return { previewTasks: taskCount };
  });

  s.step("planner shows the starter-plan tasks (>= 5)", async ({ page }) => {
    await page.goto("/planner?view=week");
    await see(page.getByRole("link", { name: "Next week" }), "week view");
    await noErrorPanel(page);
    const open = page.getByRole("button", { name: /^Open / });
    const thisWeek = await open.count();
    await page.goto(await page.getByRole("link", { name: "Next week" }).getAttribute("href"));
    await see(page.getByRole("link", { name: "Next week" }), "next week view");
    const nextWeek = await open.count();
    await page.goto("/planner?view=backlog");
    await see(heading(page, "Backlog", 2), "backlog heading");
    const backlog = await page.getByRole("button", { name: /^Schedule / }).count();
    const total = thisWeek + nextWeek + backlog;
    if (onboarded) assert(total >= 5, `planner shows ${total} tasks (this week ${thisWeek}, next ${nextWeek}, backlog ${backlog}), expected >= 5`);
    return { thisWeek, nextWeek, backlog, enforced: onboarded };
  });

  s.step("add a task by title only: it lands in the backlog", async ({ page }) => {
    await page.goto("/planner?view=backlog");
    await see(heading(page, "Backlog", 2), "backlog heading");
    await page.getByRole("button", { name: "Add task", exact: true }).click();
    const dlg = page.getByRole("dialog", { name: "Add a task" });
    await see(dlg, "Add a task dialog");
    await dlg.getByLabel("Title", { exact: true }).fill(taskTitle);
    const saved = respondsTo(page, "POST", /\/planner\/tasks$/);
    await dlg.getByRole("button", { name: "Add task", exact: true }).click();
    assert((await saved).ok(), "create task request failed");
    await gone(dlg, "Add a task dialog");
    await see(page.getByText(taskTitle, { exact: true }), "new task in the backlog");
  });

  s.step("schedule it for today, then complete it", async ({ page }) => {
    await page.goto("/planner?view=backlog");
    await page.getByRole("button", { name: `Schedule ${taskTitle}`, exact: true }).click();
    const dlg = page.getByRole("dialog", { name: "Schedule task" });
    await see(dlg, "Schedule task dialog");
    const moved = respondsTo(page, ["POST", "PATCH"], /\/planner\/tasks\//);
    await dlg.getByRole("button", { name: "Schedule task", exact: true }).click();
    assert((await moved).ok(), "schedule request failed");
    await page.goto("/planner");
    const row = page.getByRole("listitem").filter({ hasText: taskTitle });
    await see(row, "scheduled task on Today");
    const done = respondsTo(page, ["POST", "PATCH"], /\/planner\/tasks\//);
    await page.getByRole("button", { name: `Mark ${taskTitle} complete`, exact: true }).click();
    assert((await done).ok(), "complete request failed");
    await see(row.getByText("Completed", { exact: true }), "Completed badge on the task");
  });

  s.step("start a study session, wait for a heartbeat, end it with a rating", async ({ page }) => {
    await page.goto("/planner/sessions");
    await see(heading(page, "Study sessions"), "sessions heading");
    const rows = page.getByRole("table").locator("tbody tr");
    const before = (await page.getByRole("table").count()) ? await rows.count() : 0;
    const bar = page.getByRole("group", { name: "Study session" });
    await see(bar, "study session bar");
    // Clean up a session left over from an aborted run so Start is available.
    if ((await bar.getByRole("button", { name: "Session needs recovery" }).count()) > 0) {
      await bar.getByRole("button", { name: "Session needs recovery" }).click();
      await page.getByRole("button", { name: "Discard", exact: true }).click();
      await see(bar.getByText("No active session"), "no active session after discard");
    } else if ((await bar.getByRole("timer").count()) > 0) {
      await bar.getByRole("button", { name: "End", exact: true }).click();
      await page.getByRole("dialog", { name: "End study session" }).getByRole("button", { name: "End session" }).click();
      await see(bar.getByText("No active session"), "no active session after ending the leftover one");
    }
    await bar.getByRole("button", { name: "Study session", exact: true }).click();
    const start = page.getByRole("dialog", { name: "Start study session" });
    await see(start, "Start study session dialog");
    // The shortest length the UI allows is 5 minutes (custom field min=5); we end it after ~35 s.
    await start.getByLabel("Custom (minutes)").fill("5");
    const started = respondsTo(page, "POST", /\/study-sessions$/);
    await start.getByRole("button", { name: "Start", exact: true }).click();
    assert((await started).ok(), "start session request failed");
    await see(bar.getByRole("timer"), "running timer");
    // Deliberate wait: the client heartbeats every 30 s. Wait for that response (no fixed sleep), moving the mouse
    // once so the beat is an interacted one.
    await page.mouse.move(200, 200);
    const beat = await page.waitForResponse((r) => r.request().method() === "POST" && /\/study-sessions\/[^/]+\/heartbeat$/.test(r.url()), { timeout: 60000 });
    assert(beat.ok(), `heartbeat answered ${beat.status()}`);
    await bar.getByRole("button", { name: "End", exact: true }).click();
    const end = page.getByRole("dialog", { name: "End study session" });
    await see(end, "End study session dialog");
    await end.locator("label").filter({ hasText: /^4$/ }).click();
    const ended = respondsTo(page, "POST", /\/study-sessions\/[^/]+\/end$/);
    await end.getByRole("button", { name: "End session", exact: true }).click();
    assert((await ended).ok(), "end session request failed");
    await gone(end, "End study session dialog");
    await see(bar.getByText("No active session"), "bar back to idle");
    return { historyRowsBefore: before };
  });

  s.step("/planner/sessions lists the session", async ({ page }) => {
    await page.goto("/planner/sessions");
    await see(heading(page, "Study sessions"), "sessions heading");
    await see(page.getByRole("table"), "session history table");
    const n = await page.getByRole("table").locator("tbody tr").count();
    assert(n >= 1, "no sessions in the history table");
    await noErrorPanel(page);
    return { rows: n };
  });
});

// =====================================================================================
// (b) newstudent: build and take a test, results, review, bookmark
// =====================================================================================
scenario("b", "New student: practice test, results, review, bookmark", (s) => {
  let questionStem = "";

  s.step("log in as newstudent", async ({ page }) => {
    await login(page, ACCOUNTS.newstudent);
  }, { critical: true });

  s.step("build a Test-mode, untimed Indian Polity set and start it", async ({ page }) => {
    await page.goto("/prelims/new");
    await see(heading(page, "New practice set"), "builder heading");
    await noErrorPanel(page);
    await page.getByRole("checkbox", { name: /Indian Polity/ }).check();
    // The builder offers 10/20/50 questions (no 5): 10 is the smallest set.
    await page.getByRole("radiogroup", { name: "Number of questions" }).getByRole("radio", { name: "10", exact: true }).click();
    await page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name: "Test", exact: true }).click();
    await page.getByRole("radiogroup", { name: "Timing" }).getByRole("radio", { name: "Untimed", exact: true }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click(); // waits until enabled (availability loaded)
    await page.waitForURL(/\/prelims\/session\/[0-9a-f-]{36}/, { timeout: 30000 });
    await see(page.getByRole("heading", { level: 1, name: /^Practice · Question 1 of \d+$/ }), "workspace heading");
  });

  s.step("answer 3, flag 1, skip 1, submit", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    const total = Number(/of (\d+)$/.exec((await h1.first().innerText()).trim())?.[1]);
    assert(total >= 5, `set has ${total} questions, need at least 5`);
    const options = page.getByRole("radiogroup", { name: "Answer options" }).getByRole("radio");
    const at = async (n) => see(page.getByRole("heading", { level: 1, name: `Practice · Question ${n} of ${total}` }), `question ${n}`);
    const next = async (n) => {
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await at(n + 1);
    };
    for (let q = 1; q <= 3; q++) {
      await options.nth(q - 1).click(); // A, B, C
      await next(q);
    }
    await page.getByRole("button", { name: "Flag for review", exact: true }).click(); // question 4
    await see(page.getByRole("button", { name: "Flagged for review", exact: true }), "flag toggled");
    await next(4);
    await page.getByRole("button", { name: "Skip", exact: true }).click(); // question 5: left unanswered
    await at(6);
    await see(page.getByTestId("save-status").getByText("Saved", { exact: true }), "autosave status Saved");
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    const dlg = page.getByRole("dialog", { name: "Submit this set?" });
    await see(dlg, "submit dialog");
    await see(dlg.getByText(`${total - 3} unanswered`), "unanswered count in the dialog");
    await see(dlg.getByText("1 flagged for review"), "flagged count in the dialog");
    await dlg.getByRole("button", { name: "Submit now", exact: true }).click();
    await page.waitForURL(/\/prelims\/results\/[0-9a-f-]{36}/, { timeout: 30000 });
    return { total };
  });

  s.step("results page shows tiles and the review list", async ({ page }) => {
    await see(heading(page, "Results"), "results heading");
    await noErrorPanel(page);
    const tile = async (name) => Number((await page.getByRole("group", { name, exact: true }).locator("div").last().innerText()).replace(/[^\d]/g, ""));
    for (const name of ["Score", "Accuracy", "Correct", "Incorrect", "Skipped", "Time taken"]) {
      await see(page.getByRole("group", { name, exact: true }), `${name} tile`);
    }
    const correct = await tile("Correct");
    const incorrect = await tile("Incorrect");
    const skipped = await tile("Skipped");
    assert(correct + incorrect === 3, `answered tiles add up to ${correct + incorrect}, expected 3`);
    assert(skipped >= 1, "skipped tile should count the unanswered questions");
    const items = await page.locator("section[aria-labelledby=qlist-h] ul li").count();
    assert(items === correct + incorrect + skipped, `review list has ${items} rows, tiles say ${correct + incorrect + skipped}`);
    return { correct, incorrect, skipped, items };
  });

  s.step("open a review page and bookmark the question", async ({ page }) => {
    await page.getByRole("link", { name: /^Question 1\b/ }).click();
    await page.waitForURL(/\/prelims\/review\/[0-9a-f-]{36}\/1$/);
    await see(page.getByRole("heading", { level: 1, name: /^Question 1 of \d+$/ }), "review heading");
    await see(page.getByRole("heading", { level: 2, name: /^Why [A-D] is correct$/ }), "explanation heading");
    await see(heading(page, "Each option", 2), "option reasoning heading");
    questionStem = (await page.getByRole("region", { name: "Question", exact: true }).locator("p").first().innerText()).trim();
    assert(questionStem.length > 0, "could not read the question stem");
    // A re-run can meet a question that is already bookmarked: clear it first so the PUT path is exercised.
    const remove = page.getByRole("button", { name: "Remove bookmark", exact: true });
    if ((await remove.count()) > 0) {
      const del = respondsTo(page, "DELETE", /\/practice\/questions\/[^/]+\/bookmark$/);
      await remove.click();
      assert((await del).ok(), "remove bookmark failed");
      await see(page.getByRole("button", { name: "Bookmark question", exact: true }), "bookmark button reset");
    }
    const put = respondsTo(page, "PUT", /\/practice\/questions\/[^/]+\/bookmark$/);
    await page.getByRole("button", { name: "Bookmark question", exact: true }).click();
    assert((await put).ok(), "bookmark request failed");
    await see(page.getByRole("button", { name: "Remove bookmark", exact: true }), "bookmark toggled on");
  });

  s.step("/prelims?tab=bookmarks lists it", async ({ page }) => {
    await page.goto("/prelims?tab=bookmarks");
    await see(page.getByRole("tab", { name: "Bookmarks", selected: true }), "Bookmarks tab");
    await noErrorPanel(page);
    const probe = questionStem.split("\n")[0].slice(0, 60);
    await see(page.getByRole("tabpanel").getByText(probe), `bookmark for "${probe}"`);
  });
});

// =====================================================================================
// (c) student: seeded data
// =====================================================================================
scenario("c", "Student: Home, planner views, mistakes, profile", (s) => {
  s.step("log in as student", async ({ page }) => {
    await login(page, ACCOUNTS.student);
  }, { critical: true });

  s.step("Home shows plan, practice and week cards with seeded data", async ({ page }) => {
    await page.goto("/home");
    await see(heading(page, "Your preparation at a glance"), "Home heading");
    await noErrorPanel(page);
    for (const name of ["Today's plan", "Practice", "This week"]) await see(heading(page, name, 2), `${name} card`);
    const practice = page.getByRole("region", { name: "Practice", exact: true });
    await see(practice.getByText("Mistakes", { exact: true }), "Mistakes figure");
    assert((await practice.getByText("No practice sets yet").count()) === 0, "student has no recent practice sets (seed missing?)");
    await see(page.getByRole("region", { name: "This week", exact: true }).getByText(/tasks/), "week card task counts");
    const note = { planCard: (await page.getByRole("region", { name: "Today's plan", exact: true }).innerText()).replace(/\s+/g, " ").slice(0, 120) };
    const body = await page.locator("main").innerText();
    if (/(Prelims|Mains): (Today|\d+ days?)/.test(body)) {
      assert(/Illustrative/.test(body), 'countdown is shown but the word "Illustrative" is missing');
      note.countdown = "shown, labelled Illustrative";
    } else {
      note.countdown = "no exam dates in the seed (not checked)";
    }
    return note;
  });

  for (const [view, tab, probe] of [
    ["week", "Week", (page) => see(page.getByRole("link", { name: "Next week" }), "week navigation")],
    ["month", "Month", (page) => see(page.getByRole("table"), "month grid")],
    ["goals", "Goals", (page) => see(page.getByRole("form", { name: "Study goals" }), "goals form")],
  ]) {
    s.step(`planner ${view} view renders`, async ({ page }) => {
      await page.goto(`/planner?view=${view}`);
      await see(page.getByRole("tab", { name: tab, selected: true }), `${tab} tab selected`);
      await probe(page);
      await noErrorPanel(page);
    });
  }

  s.step("/prelims?tab=mistakes lists items", async ({ page }) => {
    await page.goto("/prelims?tab=mistakes");
    await see(page.getByRole("tab", { name: "Mistakes", selected: true }), "Mistakes tab");
    await noErrorPanel(page);
    const n = await page.getByRole("tabpanel").getByRole("listitem").count();
    assert(n >= 1, "mistake notebook is empty for the seeded student");
    return { items: n };
  });

  s.step("/settings/profile loads", async ({ page }) => {
    await page.goto("/settings/profile");
    await see(heading(page, "My profile"), "profile heading");
    await noErrorPanel(page);
  });
});

// =====================================================================================
// (d) admin question bank + RBAC
// =====================================================================================
scenario("d", "Admin question bank and access control", (s) => {
  const stem = `[E2E ${STAMP}] Which of the following is a sample automated-test question?`;
  let subjectId = "";
  let createdUrl = "";

  s.step("log in as admin", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
  }, { critical: true });

  s.step("/admin/questions lists questions", async ({ page }) => {
    await page.goto("/admin/questions");
    await see(heading(page, "Questions"), "Questions heading");
    await see(page.getByRole("table"), "questions table");
    const n = await page.getByRole("table").locator("tbody tr").count();
    assert(n >= 1, "question table is empty");
    await noErrorPanel(page);
    return { rows: n };
  });

  s.step("create a question (single, 4 options, explanation, per-option reasoning)", async ({ page }) => {
    await page.goto("/admin/questions/new");
    await see(heading(page, "New question"), "New question heading");
    await page.getByLabel("Stem", { exact: true }).fill(stem);
    for (const k of ["A", "B", "C", "D"]) {
      await page.getByLabel(`Option ${k} text`, { exact: true }).fill(`Sample option ${k} for the automated test`);
      await page.getByLabel(`Reasoning for option ${k}`, { exact: true }).fill(`Reasoning ${k}: written by the e2e script.`);
    }
    await page.getByLabel("Option B is correct", { exact: true }).check();
    await page.getByLabel("Explanation", { exact: true }).fill("Option B is the marked answer in this automated-test sample question.");
    const subject = page.getByLabel("Subject", { exact: true });
    subjectId = await subject.locator("option").nth(1).getAttribute("value"); // first real subject (Prelims level-3 nodes come first)
    assert(subjectId, "no subjects to choose from");
    await subject.selectOption(subjectId);
    const created = respondsTo(page, "POST", /\/admin\/questions$/);
    await page.getByRole("button", { name: "Create question", exact: true }).click();
    assert((await created).ok(), "create question request failed");
    await page.waitForURL(/\/admin\/questions\/[0-9a-f-]{36}$/);
    createdUrl = page.url();
    await see(page.getByText("Draft", { exact: true }), "Draft status badge");
  });

  s.step("publish it", async ({ page }) => {
    assert(createdUrl, "no question was created");
    await page.goto(createdUrl);
    const published = respondsTo(page, "POST", /\/admin\/questions\/[^/]+\/publish$/);
    await page.getByRole("region", { name: "Lifecycle actions" }).getByRole("button", { name: "Publish", exact: true }).click();
    assert((await published).ok(), "publish request failed");
    await see(page.getByText("Published.", { exact: true }), "published banner");
  });

  s.step("it appears in the list as Published", async ({ page }) => {
    await page.goto("/admin/questions");
    await page.getByLabel("Search stems", { exact: true }).fill(`[E2E ${STAMP}]`);
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    const row = page.getByRole("table").locator("tbody tr").filter({ hasText: `[E2E ${STAMP}]` });
    await see(row, "created question row");
    await see(row.getByText("Published", { exact: true }), "Published badge in the row");
  });

  s.step("retire the e2e question (keeps the live bank clean)", async ({ page }) => {
    assert(createdUrl, "no question was created");
    await page.goto(createdUrl);
    const retired = respondsTo(page, "POST", /\/admin\/questions\/[^/]+\/retire$/);
    await page.getByRole("region", { name: "Lifecycle actions" }).getByRole("button", { name: "Retire", exact: true }).click();
    assert((await retired).ok(), "retire request failed");
    await see(page.getByText("Retired.", { exact: true }), "retired banner");
  });

  s.step("import a 2-row JSON: created 2", async ({ page }) => {
    assert(subjectId, "no subject id (create step failed)");
    const row = (n) => ({
      format: "single",
      stem: `[E2E ${STAMP}] Imported automated-test question ${n}: which option is marked correct?`,
      options: ["A", "B", "C", "D"].map((key) => ({ key, text: `Imported option ${key}` })),
      correctOption: "A",
      explanation: "Imported by the e2e script; stays a draft.",
      optionReasoning: { A: "Marked correct.", B: "Not marked.", C: "Not marked.", D: "Not marked." },
      difficulty: "easy",
      subjectNodeId: subjectId,
      gsPaper: "GS1",
      sourceType: "platform",
    });
    await page.goto("/admin/questions/import");
    await see(heading(page, "Import questions"), "Import heading");
    await page.getByLabel("Questions JSON", { exact: true }).fill(JSON.stringify({ items: [row(1), row(2)] }));
    const done = respondsTo(page, "POST", /\/admin\/questions\/import$/);
    await page.getByRole("button", { name: "Validate and import", exact: true }).click();
    assert((await done).ok(), "import request failed");
    await see(page.getByText(/^2 questions created as drafts/), '"2 questions created as drafts" banner');
  });

  s.step("/admin/users loads", async ({ page }) => {
    await page.goto("/admin/users");
    await see(heading(page, "Users"), "Users heading");
    await see(page.getByText(ACCOUNTS.student).first(), "student row");
    await noErrorPanel(page);
  });
});

scenario("e", "Access control: a student cannot open the admin console", (s) => {
  s.step("log in as student in a fresh context", async ({ page }) => {
    await login(page, ACCOUNTS.student);
  }, { critical: true });
  s.step("/admin/questions redirects a student away", async ({ page }) => {
    await page.goto("/admin/questions");
    await page.waitForURL((u) => !u.pathname.startsWith("/admin"), { timeout: 20000 });
    assert(/\/home/.test(page.url()), `student ended on ${new URL(page.url()).pathname}, expected /home`);
    assert((await page.getByRole("heading", { name: "Questions", level: 1, exact: true }).count()) === 0, "admin Questions page rendered for a student");
  });
});

// =====================================================================================
// runner
// =====================================================================================
function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (dir) return createRequire(path.join(path.resolve(dir), "noop.js"))("playwright");
  return createRequire(import.meta.url)("playwright"); // works when `playwright` is resolvable (e.g. NODE_PATH or a local install)
}

async function warmUp() {
  if (flag("skip-warmup")) return;
  log(`Warming up ${BASE} (free-tier API may be asleep; waiting up to 120 s)...`);
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    try {
      const r = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(20000) });
      if (r.ok) return;
    } catch {
      /* keep trying */
    }
    await sleep(3000);
  }
  log("  health did not answer 200 within 120 s; continuing anyway");
}

function printPlan(list) {
  for (const sc of list) {
    console.log(`(${sc.id}) ${sc.title}`);
    for (const st of sc.steps) console.log(`    - ${st.name}${st.critical ? "  [critical: failure skips the rest of the scenario]" : ""}`);
  }
}

async function main() {
  const list = SCENARIOS.filter((sc) => !ONLY.length || ONLY.includes(sc.id));
  if (DRY) {
    console.log(`DRY RUN (nothing is executed). base-url=${BASE || "<required for a real run>"} out=${OUT} stamp=${STAMP}`);
    printPlan(list);
    return 0;
  }
  const problems = [];
  if (!BASE) problems.push("--base-url is required");
  if (!/^https?:\/\//.test(BASE)) problems.push("--base-url must start with http:// or https://");
  if (!PASSWORD) problems.push("DEMO_PASSWORD must be set in the environment");
  if (problems.length) {
    console.error(`usage: DEMO_PASSWORD=... [PLAYWRIGHT_DIR=...] node scripts/e2e/phase1.mjs --base-url <url> --out <dir>\n${problems.join("\n")}`);
    return 2;
  }
  let pw;
  try {
    pw = loadPlaywright();
  } catch (e) {
    console.error(`Cannot load Playwright (${e.message}). Set PLAYWRIGHT_DIR to a directory whose node_modules contains it; see scripts/e2e/README.md.`);
    return 2;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const origin = new URL(BASE).origin;
  await warmUp();
  const browser = await pw.chromium.launch({ headless: !HEADED });
  const summary = { baseUrl: BASE, stamp: STAMP, startedAt: new Date().toISOString(), finishedAt: null, passed: 0, failed: 0, skipped: 0, steps: [] };

  for (const sc of list) {
    log(`\n== (${sc.id}) ${sc.title}`);
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
    context.setDefaultTimeout(30000);
    context.setDefaultNavigationTimeout(60000);
    const page = await context.newPage();
    let issues = [];
    let expectList = [];
    const allowed = (status, url) => expectList.some((e) => e.status === status && (!e.url || e.url.test(url)));
    page.on("pageerror", (e) => issues.push(`uncaught page error: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const loc = m.location()?.url ?? "";
      // "Failed to load resource" lines for the app's own origin are judged by the response listener (so the expect list applies).
      if (/Failed to load resource/.test(m.text())) {
        if (loc.startsWith(origin) || !loc) return;
        return; // other origins (e.g. Supabase) are not the app's responses
      }
      issues.push(`console.error: ${m.text().slice(0, 300)}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().startsWith(origin) && !allowed(r.status(), r.url())) {
        issues.push(`HTTP ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
      }
    });

    let abort = false;
    for (const st of sc.steps) {
      const rec = { scenario: sc.id, name: st.name, status: "PASS", ms: 0 };
      if (abort) {
        rec.status = "SKIP";
        summary.skipped++;
        summary.steps.push(rec);
        log(`SKIP  (${sc.id}) ${st.name}`);
        continue;
      }
      issues = [];
      expectList = st.expect ?? [];
      const t0 = Date.now();
      try {
        const detail = await st.run({ page });
        await sleep(300); // let trailing responses/console lines land before judging the step
        if (issues.length) throw new Error(`unexpected browser/network problems:\n  - ${[...new Set(issues)].join("\n  - ")}`);
        if (detail) rec.detail = detail;
      } catch (e) {
        rec.status = "FAIL";
        rec.error = redact(e.message).split("\n").slice(0, 8).join("\n");
        const shot = path.join(OUT, `${sc.id}-${st.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}-FAIL.png`);
        try {
          await page.screenshot({ path: shot, fullPage: true });
          rec.screenshot = shot;
        } catch {
          /* page may be closed */
        }
        if (st.critical) abort = true;
      }
      rec.ms = Date.now() - t0;
      if (rec.status === "PASS") {
        summary.passed++;
        try {
          await page.screenshot({ path: path.join(OUT, `${sc.id}-${st.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}-pass.png`) });
        } catch {
          /* ignore */
        }
      } else summary.failed++;
      summary.steps.push(rec);
      log(`${rec.status.padEnd(5)} (${sc.id}) ${st.name} [${rec.ms} ms]${rec.error ? `\n        ${rec.error.replace(/\n/g, "\n        ")}` : ""}`);
    }
    await context.close();
  }
  await browser.close();
  summary.finishedAt = new Date().toISOString();
  const json = redact(JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT, "summary.json"), json);
  console.log(json);
  log(`\n${summary.failed === 0 ? "E2E OK" : "E2E FAILED"}: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped. Screenshots and summary.json in ${OUT}`);
  return summary.failed === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(redact(`E2E crashed: ${e?.stack ?? e}`));
    process.exit(1);
  },
);
