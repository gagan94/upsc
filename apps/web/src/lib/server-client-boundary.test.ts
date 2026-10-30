// @vitest-environment node
/**
 * Regression guard for the React Server Components "client boundary" bug class.
 *
 * In a Next.js production build, every export of a `"use client"` module, when
 * imported into a Server Component / route handler, is a *client reference
 * proxy* — not the real value. Rendering an imported client COMPONENT as JSX is
 * fine, but reading a plain value (`PLANNER_VIEWS.includes(...)`, calling a
 * helper like `formatDate()`) throws at request time, e.g.
 *   TypeError: g.PLANNER_VIEWS.includes is not a function
 * Vitest does not enforce the boundary, so ordinary unit tests cannot catch it.
 *
 * This test statically walks the import graph:
 *   1. Server entries = src/app/** page / layout / template / loading /
 *      not-found / default / route files, src/middleware.ts, and any
 *      `"use server"` module — unless they themselves start with "use client".
 *   2. From each entry it follows imports into modules that are NOT
 *      `"use client"` (those also run on the server).
 *   3. Any import from such a server module into a `"use client"` module is
 *      checked. Heuristic (deliberately simple):
 *        - type-only imports (`import type`, `{ type X }`) are allowed;
 *        - default imports are allowed (by convention, a component);
 *        - named imports whose name starts with an uppercase letter AND is not
 *          ALL_CAPS (PascalCase → a React component, or a type) are allowed;
 *        - everything else (camelCase helpers, ALL_CAPS constants, namespace
 *          imports `* as X`, value re-exports) is flagged.
 *      Fix a violation by moving the value into a neutral module (no
 *      directive) that both the server and client sides import.
 *   4. Reverse trap: any `"use client"` module that imports a module which
 *      contains `import "server-only"` is flagged.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const ENTRY_BASENAMES = new Set([
  "page",
  "layout",
  "template",
  "loading",
  "not-found",
  "default",
  "route",
]);

type ImportEdge = {
  spec: string;
  /** names imported as values (local view of the imported binding names) */
  valueNames: string[];
  hasDefault: boolean;
  namespace: boolean;
  /** `export * from` or `export { x } from` (value re-export) */
  reexport: string[];
  sideEffectOnly: boolean;
};

type ModuleInfo = {
  file: string;
  directive: "use client" | "use server" | null;
  serverOnly: boolean;
  imports: ImportEdge[];
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(p, out);
    } else if (EXTS.includes(path.extname(entry.name)) && !/\.(test|spec)\.[jt]sx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

function parseModule(file: string): ModuleInfo {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let directive: ModuleInfo["directive"] = null;
  // Directives must be the first statements (string-literal expression statements).
  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) {
      const v = st.expression.text;
      if (v === "use client" || v === "use server") directive = v;
      continue;
    }
    break;
  }
  let serverOnly = false;
  const imports: ImportEdge[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const spec = st.moduleSpecifier.text;
      if (spec === "server-only") serverOnly = true;
      const clause = st.importClause;
      const edge: ImportEdge = { spec, valueNames: [], hasDefault: false, namespace: false, reexport: [], sideEffectOnly: !clause };
      if (clause && !clause.isTypeOnly) {
        if (clause.name) edge.hasDefault = true;
        const nb = clause.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) edge.namespace = true;
        if (nb && ts.isNamedImports(nb)) {
          for (const el of nb.elements) {
            if (el.isTypeOnly) continue;
            edge.valueNames.push((el.propertyName ?? el.name).text);
          }
        }
      }
      imports.push(edge);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      const spec = st.moduleSpecifier.text;
      const edge: ImportEdge = { spec, valueNames: [], hasDefault: false, namespace: false, reexport: [], sideEffectOnly: false };
      if (!st.isTypeOnly) {
        if (!st.exportClause) edge.reexport.push("*");
        else if (ts.isNamedExports(st.exportClause)) {
          for (const el of st.exportClause.elements) {
            if (el.isTypeOnly) continue;
            edge.reexport.push((el.propertyName ?? el.name).text);
          }
        } else edge.reexport.push("*");
      }
      imports.push(edge);
    }
  }
  return { file, directive, serverOnly, imports };
}

function resolveSpec(fromFile: string, spec: string, srcDir: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(srcDir, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package — out of scope
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, "index" + e))];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** PascalCase (has a lowercase letter) → presumed component or type: allowed. */
function isAllowedName(name: string): boolean {
  if (!/^[A-Z]/.test(name)) return false;
  return /[a-z]/.test(name);
}

export type Violation = { from: string; to: string; names: string[]; kind: "server→client value" | "client→server-only" };

export function findBoundaryViolations(srcDir: string): Violation[] {
  const files = walk(srcDir);
  const mods = new Map<string, ModuleInfo>();
  for (const f of files) mods.set(f, parseModule(f));
  const rel = (f: string) => path.relative(srcDir, f);

  const entries = files.filter((f) => {
    const m = mods.get(f)!;
    if (m.directive === "use client") return false;
    const r = rel(f);
    const base = path.basename(f).replace(/\.[^.]+$/, "");
    if (r.startsWith("app" + path.sep) && ENTRY_BASENAMES.has(base)) return true;
    if (/^middleware\.[jt]s$/.test(r)) return true;
    return m.directive === "use server";
  });

  const violations: Violation[] = [];
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const m = mods.get(f)!;
    for (const imp of m.imports) {
      const target = resolveSpec(f, imp.spec, srcDir);
      if (!target) continue;
      const tm = mods.get(target);
      if (!tm) continue;
      if (tm.directive === "use client") {
        const bad = [
          ...imp.valueNames.filter((n) => !isAllowedName(n)),
          ...(imp.namespace ? ["* (namespace import)"] : []),
          ...imp.reexport.filter((n) => n === "*" || !isAllowedName(n)).map((n) => `${n} (re-export)`),
        ];
        if (bad.length) violations.push({ from: rel(f), to: rel(target), names: bad, kind: "server→client value" });
      } else {
        queue.push(target);
      }
    }
  }

  // Reverse trap: a client module importing a server-only module.
  for (const [f, m] of mods) {
    if (m.directive !== "use client") continue;
    for (const imp of m.imports) {
      if (imp.sideEffectOnly && imp.spec === "server-only") {
        violations.push({ from: rel(f), to: "server-only", names: ["(side-effect)"], kind: "client→server-only" });
        continue;
      }
      const target = resolveSpec(f, imp.spec, srcDir);
      if (!target) continue;
      const tm = mods.get(target);
      if (!tm?.serverOnly) continue;
      // Type-only imports are erased and therefore safe.
      if (!imp.hasDefault && !imp.namespace && imp.valueNames.length === 0 && imp.reexport.length === 0) continue;
      violations.push({
        from: rel(f),
        to: rel(target),
        names: [...(imp.hasDefault ? ["default"] : []), ...imp.valueNames, ...imp.reexport],
        kind: "client→server-only",
      });
    }
  }
  return violations.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
}

function formatViolations(vs: Violation[]): string {
  return vs.map((v) => `  [${v.kind}] ${v.from} → ${v.to} (${v.names.join(", ")})`).join("\n");
}

const SRC = path.resolve(import.meta.dirname, "..");

describe("server/client module boundary", () => {
  it("no server module imports a non-component value from a \"use client\" module (and no client module imports server-only code)", () => {
    const vs = findBoundaryViolations(SRC);
    if (vs.length) {
      throw new Error(
        `${vs.length} server/client boundary violation(s). In a Next.js production build these imports are client-reference proxies, not real values. ` +
          `Move the value into a neutral module (no "use client") imported by both sides:\n${formatViolations(vs)}`,
      );
    }
    expect(vs).toEqual([]);
  });

  it("detects the bug class on a fixture (self-test of the analyser)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundary-"));
    try {
      const w = (p: string, s: string) => {
        fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
        fs.writeFileSync(path.join(dir, p), s);
      };
      w("components/Tabs.tsx", `"use client";\nexport const TABS = ["a"] as const;\nexport type Tab = "a";\nexport function helper() {}\nexport function Tabs() { return null; }\nexport default function X() { return null; }\n`);
      w("lib/secret.ts", `import "server-only";\nexport const SECRET = 1;\n`);
      w("lib/neutral.ts", `import { helper } from "@/components/Tabs";\nexport const n = helper;\n`);
      w("components/Bad.tsx", `"use client";\nimport { SECRET } from "@/lib/secret";\nimport type { SECRET as S } from "@/lib/secret";\nexport function Bad() { return SECRET; }\n`);
      w("app/x/page.tsx", `import X, { Tabs, TABS, type Tab } from "../../components/Tabs";\nimport type { helper } from "@/components/Tabs";\nimport { n } from "@/lib/neutral";\nexport default function P() { return [X, Tabs, TABS, n]; }\n`);
      const vs = findBoundaryViolations(dir);
      expect(formatViolations(vs)).toBe(
        [
          `  [server→client value] ${path.join("app", "x", "page.tsx")} → ${path.join("components", "Tabs.tsx")} (TABS)`,
          `  [client→server-only] ${path.join("components", "Bad.tsx")} → ${path.join("lib", "secret.ts")} (SECRET)`,
          `  [server→client value] ${path.join("lib", "neutral.ts")} → ${path.join("components", "Tabs.tsx")} (helper)`,
        ].join("\n"),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
