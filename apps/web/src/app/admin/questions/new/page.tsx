import { QuestionForm } from "@/components/admin/QuestionForm";
import { serverApi } from "@/lib/server-api";
import type { PracticeSubject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const subjects = await serverApi<{ subjects: PracticeSubject[] }>("/practice/subjects").then((r) => r.subjects, () => [] as PracticeSubject[]);
  return (
    <div>
      <h1 className="text-2xl font-bold">New question</h1>
      <p className="mt-1 text-sm text-muted">Saved as a draft. Add the explanation and all four option reasonings before publishing.</p>
      <QuestionForm subjects={subjects} />
    </div>
  );
}
