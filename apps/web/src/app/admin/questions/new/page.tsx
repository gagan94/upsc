import { QuestionForm } from "@/components/admin/QuestionForm";
import { loadNodes } from "@/lib/admin-nodes";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const nodes = await loadNodes();
  return (
    <div>
      <h1 className="text-2xl font-bold">New question</h1>
      <p className="mt-1 text-sm text-muted">Saved as a draft. Add the explanation and all four option reasonings before publishing.</p>
      <QuestionForm nodes={nodes} />
    </div>
  );
}
