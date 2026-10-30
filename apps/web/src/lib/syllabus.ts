import type { SyllabusNode } from "./types";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

/** "GS1" -> "GS Paper I"; anything else is shown as stored. */
export function paperLabel(paper: string): string {
  const m = /^GS\s*(\d)$/i.exec(paper.trim());
  return m && ROMAN[Number(m[1])] ? `GS Paper ${ROMAN[Number(m[1])]}` : paper;
}

export function nodeLabel(n: Pick<SyllabusNode, "title" | "paper">): string {
  return `${n.title} \u00b7 ${paperLabel(n.paper)}`;
}

/** Prelims level-3 nodes first (the subjects questions are written against), then the rest; API order is kept inside each group. */
export function orderNodes(nodes: SyllabusNode[]): SyllabusNode[] {
  const first = (n: SyllabusNode) => n.level === 3 && n.examStage === "prelims";
  return [...nodes.filter(first), ...nodes.filter((n) => !first(n))];
}
