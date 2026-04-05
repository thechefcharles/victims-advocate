/**
 * Phase 4 — first focusable control in document order (before TopNav).
 * Targets #main-content (wrapper in root layout).
 */
export function SkipToMainLink() {
  return (
    <a href="#main-content" className="nxt-skip-link">
      Skip to main content
    </a>
  );
}
