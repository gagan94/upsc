import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "./user-shim";
import { describe, expect, it, vi } from "vitest";
import { TaskDialog } from "./TaskDialog";
import { subjects, task } from "./fixtures";

const setup = (props: Partial<React.ComponentProps<typeof TaskDialog>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  render(<TaskDialog open onClose={onClose} onSubmit={onSubmit} subjects={subjects} tz="Asia/Kolkata" {...props} />);
  return { onSubmit, onClose };
};

const settled = () => waitFor(() => expect(screen.getByRole("button", { name: /Add task|Save task/ })).not.toHaveAttribute("aria-busy"));

describe("TaskDialog", () => {
  it("blocks submit with an empty title and shows the backlog hint", async () => {
    const { onSubmit } = setup();
    expect(screen.getByText("Leave the date blank to save in your backlog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
  });

  it("sends only the provided fields", async () => {
    const { onSubmit, onClose } = setup();
    await userEvent.type(screen.getByLabelText("Title"), "  Revise polity ");
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: "Revise polity" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    await settled();
  });

  it("builds scheduledStart in the user's zone", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Title"), "Mock");
    await userEvent.type(screen.getByLabelText("Date"), "2026-10-14");
    await userEvent.type(screen.getByLabelText("Time"), "23:30");
    await userEvent.selectOptions(screen.getByLabelText("Subject"), "Polity");
    await userEvent.click(screen.getByRole("radio", { name: "45 min" }));
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Mock",
        subjectNodeId: subjects[0].syllabusNodeId,
        durationMin: 45,
        scheduledStart: "2026-10-14T18:00:00.000Z",
      }),
    );
    await settled();
  });

  it("submits the subject's syllabus node id, never the catalog subject id, as subjectNodeId", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText("Title"), "Read polity");
    await userEvent.selectOptions(screen.getByLabelText("Subject"), "Polity");
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const sent = onSubmit.mock.calls[0][0] as { subjectNodeId?: string };
    expect(sent.subjectNodeId).toBe("11111111-1111-4111-8111-111111111111");
    expect(sent.subjectNodeId).not.toBe(subjects[0].id);
    await settled();
  });

  it("editing a task preselects its subject by syllabus node id", async () => {
    const { onSubmit } = setup({ task: task({ subjectNodeId: subjects[0].syllabusNodeId, subjectTitle: "Polity" }) });
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe(subjects[0].syllabusNodeId);
    await userEvent.click(screen.getByRole("button", { name: "Save task" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("edit sends only changed fields and stays open with an error when save fails", async () => {
    const { onSubmit, onClose } = setup({ task: task() });
    onSubmit.mockResolvedValue(false);
    const title = screen.getByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "New title");
    await userEvent.click(screen.getByRole("button", { name: "Save task" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: "New title" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByText("Task save failed")).toBeInTheDocument();
  });
});
