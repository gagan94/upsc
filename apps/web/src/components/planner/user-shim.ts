import { act, fireEvent } from "@testing-library/react";

/** Minimal stand-in for @testing-library/user-event (not installed; dependencies must not change). */
const userEvent = {
  async click(el: Element) {
    if (el instanceof HTMLElement) el.focus();
    await act(async () => {
      fireEvent.click(el);
    });
  },
  async type(el: Element, text: string) {
    const input = el as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: input.value + text } });
  },
  async clear(el: Element) {
    fireEvent.change(el, { target: { value: "" } });
  },
  async selectOptions(el: Element, label: string) {
    const sel = el as HTMLSelectElement;
    const opt = Array.from(sel.options).find((o) => o.textContent === label || o.value === label)!;
    fireEvent.change(sel, { target: { value: opt.value } });
  },
  async keyboard(keys: string) {
    for (const m of keys.matchAll(/\{(\w+)\}/g)) {
      const key = m[1];
      const el = (document.activeElement ?? document.body) as HTMLElement;
      await act(async () => {
        const notPrevented = fireEvent.keyDown(el, { key });
        if (notPrevented && (key === "Enter" || key === " ") && el instanceof HTMLButtonElement) fireEvent.click(el);
      });
    }
  },
};
export default userEvent;
