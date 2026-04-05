"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function isFocusableElement(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function getTabbable(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter(isFocusableElement);
}

export type UseModalFocusTrapOptions = {
  open: boolean;
  /** Element with `role="dialog"` (receives focus if no tabbables). */
  rootRef: RefObject<HTMLElement | null>;
  /** Trigger that opened the modal — focus returns here on close. */
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/**
 * Phase 4 — Modal accessibility template: Escape to close, Tab cycles inside the dialog,
 * focus restores to the trigger when the dialog closes.
 */
export function useModalFocusTrap({ open, rootRef, triggerRef, onClose }: UseModalFocusTrapOptions) {
  useEffect(() => {
    if (!open) return;

    let raf = 0;
    raf = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const tabbables = getTabbable(root);
      if (tabbables.length > 0) {
        tabbables[0]!.focus();
      } else {
        if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
        root.focus();
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const root = rootRef.current;
      if (!root) return;

      const tabbables = getTabbable(root);
      if (tabbables.length === 0) {
        e.preventDefault();
        return;
      }

      if (tabbables.length === 1) {
        e.preventDefault();
        tabbables[0]!.focus();
        return;
      }

      const first = tabbables[0]!;
      const last = tabbables[tabbables.length - 1]!;
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      queueMicrotask(() => {
        if (triggerRef.current && document.contains(triggerRef.current)) {
          triggerRef.current.focus();
        }
      });
    };
  }, [open, onClose, rootRef, triggerRef]);
}
