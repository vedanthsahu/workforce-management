"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useNavigationGuardStore } from "@/store/useNavigationGuardStore";

// Mounted once in the authenticated shell — shows whenever any navigation
// trigger (sidebar link, back/forward, a page's own back button) is
// attempted while useNavigationGuardStore.isBlocked is true.
export function UnsavedChangesDialog() {
  const { pendingNavigation, message, confirmLeave, cancelLeave } = useNavigationGuardStore();

  return (
    <ConfirmDialog
      open={pendingNavigation !== null}
      title="Leave this page?"
      description={message}
      confirmLabel="Discard & Leave"
      cancelLabel="Stay on page"
      destructive
      onConfirm={confirmLeave}
      onClose={cancelLeave}
    />
  );
}
