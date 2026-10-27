/** Accept only same-origin absolute paths: one leading "/" then a char that is not "/" or "\". */
export function safeReturnTo(raw: string | null | undefined, fallback = "/home"): string {
  if (typeof raw !== "string" || raw.length < 2) return fallback;
  if (raw[0] !== "/" || raw[1] === "/" || raw[1] === "\\") return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith("//")) return fallback;
  return raw;
}
