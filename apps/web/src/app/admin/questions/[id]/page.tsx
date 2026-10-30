import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { PracticeSubject, QuestionAdminView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let question: QuestionAdminView;
  try {
    ({ question } = await serverApi<{ question: QuestionAdminView }>(`/admin/questions/${encodeURIComponent(id)}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const subjects = await serverApi<{ subjects: PracticeSubject[] }>("/practice/subjects").then((r) => r.subjects, () => [] as PracticeSubject[]);
  return (
    <div>
      <h1 className="text-2xl font-bold">Edit question</h1>
      <QuestionForm subjects={subjects} question={question} />
    </div>
  );
}
