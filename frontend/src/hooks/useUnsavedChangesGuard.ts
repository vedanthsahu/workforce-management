"use client";

import { useEffect } from "react";
import { useNavigationGuardStore } from "@/store/useNavigationGuardStore";

// Warns the user before losing unsaved changes: registers the given
// `active` flag with the shared navigation-guard store (consumed by
// AppSidebar and any other in-app navigation trigger, plus the shared
// UnsavedChangesDialog), and additionally guards the two things only the
// browser itself can intercept — tab close/refresh and the back/forward
// buttons.
export function useUnsavedChangesGuard(active: boolean, message?: string, onDiscard?: () => void) {
  const setBlocked = useNavigationGuardStore((s) => s.setBlocked);

  useEffect(() => {
    setBlocked(active, message, onDiscard);
    return () => setBlocked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, message, onDiscard]);

  // Native browser dialog for tab close/refresh/typed-URL navigation/
  // external links — the browser doesn't allow custom text here by spec,
  // but this is the only hook available for that class of navigation.
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  // Traps the browser back/forward buttons. Next.js App Router has no
  // built-in route-blocking API, so this uses the standard SPA trick: push
  // one extra history entry while the guard is active, and on every
  // popstate while still active, immediately re-push it (keeping a stable
  // depth-1 trap no matter how many times the user presses back) and queue
  // the real navigation behind the shared confirm dialog. This is a
  // best-effort browser technique, not a true block — verify the common
  // single-back-press case manually rather than assuming it from review.
  useEffect(() => {
    if (!active) return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      useNavigationGuardStore.getState().requestNavigation(() => {
        window.history.go(-2);
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [active]);
}
