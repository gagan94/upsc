import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { loadNodes } from "@/lib/admin-nodes";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { QuestionAdminView } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let question: QuestionAdminView;
  try {
    ({ question } = await serverApi<{ question: QuestionAdminView }>(`/admin/questions/${id}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const nodes = await loadNodes();
  return (
    <div>
      <h1 className="text-2xl font-bold">Edit question</h1>
      <QuestionForm nodes={nodes} question={question} />
    </div>
  );
}
