import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Chips } from "./Chips";
import { Field } from "./Field";
import { Modal } from "./Modal";
import { Select } from "./Select";
import { Skeleton } from "./Skeleton";
import { Tabs } from "./Tabs";

const opts = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("Button", () => {
  it("renders variants and calls onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
  it("loading disables and sets aria-busy", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const b = screen.getByRole("button", { name: /Save/ });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
  it("danger variant uses danger tokens", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button").className).toContain("danger");
  });
});

describe("Field", () => {
  it("associates label and hint", () => {
    render(<Field label="Name" hint="As on your ID" />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-describedby");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)).toHaveTextContent("As on your ID");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
  it("error sets aria-invalid and describedby with role alert", () => {
    render(<Field label="Name" error="Required" hint="hint" />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    const err = screen.getByRole("alert");
    expect(ids).toContain(err.id);
    expect(err).toHaveTextContent("Required");
  });
  it("renders a textarea when multiline", () => {
    render(<Field label="Bio" multiline />);
    expect(screen.getByLabelText("Bio").tagName).toBe("TEXTAREA");
  });
});

describe("Select", () => {
  it("is labelled and fires onChange", () => {
    const onChange = vi.fn();
    render(<Select label="Year" options={opts} value="a" onChange={(e) => onChange(e.target.value)} />);
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });
  it("shows error", () => {
    render(<Select label="Year" options={opts} value="a" onChange={() => {}} error="Pick one" />);
    expect(screen.getByLabelText("Year")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Chips", () => {
  it("single select uses radios and arrow keys move selection", () => {
    const onChange = vi.fn();
    render(<Chips label="Stage" options={opts} value="a" onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Stage" })).toBeInTheDocument();
    const alpha = screen.getByRole("radio", { name: "Alpha" });
    expect(alpha).toHaveAttribute("aria-checked", "true");
    expect(alpha).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("b");
    fireEvent.keyDown(alpha, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("c");
    fireEvent.click(screen.getByRole("radio", { name: "Gamma" }));
    expect(onChange).toHaveBeenLastCalledWith("c");
  });
  it("single select with no value keeps the first chip tabbable", () => {
    render(<Chips label="Stage" options={opts} value={null} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("tabindex", "0");
  });
  it("multi select toggles with aria-pressed", () => {
    const onChange = vi.fn();
    render(<Chips label="Windows" multiple options={opts} value={["a"]} onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Windows" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
  it("multi select is keyboard operable via native buttons (Enter/Space click)", () => {
    render(<Chips label="W" multiple options={opts} value={[]} onChange={() => {}} />);
    screen.getAllByRole("button").forEach((b) => expect(b.tagName).toBe("BUTTON"));
  });
});

describe("Tabs", () => {
  function Harness({ onChange }: { onChange?: (v: string) => void }) {
    const [v, setV] = useState("a");
    return (
      <Tabs
        label="View"
        tabs={opts.map((o) => ({ id: o.value, label: o.label }))}
        value={v}
        onChange={(x) => {
          setV(x);
          onChange?.(x);
        }}
      />
    );
  }
  it("sets aria-selected and roving tabindex", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist", { name: "View" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("tabindex", "-1");
  });
  it("arrow keys, Home and End change tabs and wrap", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Beta" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Gamma" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Gamma" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
  });
  it("click selects", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Gamma" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });
});

describe("Banner", () => {
  it("error and warning use alert, info uses status", () => {
    const { rerender } = render(<Banner tone="error">Bad</Banner>);
    expect(screen.getByRole("alert")).toHaveTextContent("Bad");
    rerender(<Banner tone="info">FYI</Banner>);
    expect(screen.getByRole("status")).toHaveTextContent("FYI");
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive tech", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("is a labelled modal dialog and focuses inside", () => {
    render(
      <Modal open onClose={() => {}} title="Edit task">
        <button>First</button>
        <button>Last</button>
      </Modal>,
    );
    const d = screen.getByRole("dialog", { name: "Edit task" });
    expect(d).toHaveAttribute("aria-modal", "true");
    expect(d.contains(document.activeElement)).toBe(true);
  });
  it("Escape closes", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T"><button>a</button></Modal>);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
  it("traps Tab and Shift+Tab", () => {
    render(
      <>
        <button>Outside</button>
        <Modal open onClose={() => {}} title="T">
          <button>First</button>
          <button>Last</button>
        </Modal>
      </>,
    );
    const close = screen.getByRole("button", { name: "Close" });
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
  it("restores focus to the opener on close", () => {
    function H() {
      const [o, setO] = useState(false);
      return (
        <>
          <button onClick={() => setO(true)}>Open</button>
          <Modal open={o} onClose={() => setO(false)} title="T">body</Modal>
        </>
      );
    }
    render(<H />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });
  it("backdrop click closes", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T">x</Modal>);
    fireEvent.mouseDown(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
