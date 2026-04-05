import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { useModalFocusTrap } from "@/lib/client/a11y/useModalFocusTrap";

function DemoModal() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useModalFocusTrap({
    open,
    rootRef: dialogRef,
    triggerRef,
    onClose: close,
  });

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open ? (
        <div ref={dialogRef} role="dialog" aria-label="Demo" data-testid="dialog">
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      ) : null}
    </>
  );
}

describe("useModalFocusTrap (Phase 4 template)", () => {
  it("moves focus inside the dialog, traps Tab, closes on Escape, restores focus to trigger", async () => {
    const user = userEvent.setup();
    render(<DemoModal />);

    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    expect(screen.getByTestId("dialog")).toBeTruthy();

    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });

    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });

    await user.tab();
    expect(document.activeElement).toBe(last);

    await user.tab();
    expect(document.activeElement).toBe(first);

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(last);

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByTestId("dialog")).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
