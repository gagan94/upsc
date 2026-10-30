import { serverApi } from "@/lib/server-api";
import type { SyllabusNode } from "@/lib/types";

/** Syllabus nodes for admin pickers; null when the call fails (callers show an error with retry). */
export async function loadNodes(): Promise<SyllabusNode[] | null> {
  try {
    return (await serverApi<{ nodes: SyllabusNode[] }>("/admin/syllabus-nodes")).nodes;
  } catch {
    return null;
  }
}
