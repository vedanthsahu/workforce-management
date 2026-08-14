import { create } from "zustand";

interface NavigationGuardState {
  isBlocked: boolean;
  message: string;
  // Set while a blocked navigation attempt is waiting on the shared confirm
  // dialog (see UnsavedChangesDialog). Non-null <=> the dialog is open.
  pendingNavigation: (() => void) | null;
  // Registered by whichever page is currently guarded — actually discards
  // its pending local edits. Run on "Discard & Leave" so that's the ONLY
  // place discard happens; there's no separate discard button on the page.
  onDiscard: (() => void) | null;
  setBlocked: (blocked: boolean, message?: string, onDiscard?: () => void) => void;
  // Any navigation trigger (sidebar link, back button, etc.) should call
  // this instead of navigating directly — it runs `navigate` immediately if
  // nothing is blocking, or queues it behind the confirm dialog otherwise.
  requestNavigation: (navigate: () => void) => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

const DEFAULT_MESSAGE = "You have unsaved changes. If you leave now, they will be lost.";

export const useNavigationGuardStore = create<NavigationGuardState>((set, get) => ({
  isBlocked: false,
  message: DEFAULT_MESSAGE,
  pendingNavigation: null,
  onDiscard: null,

  setBlocked: (blocked, message, onDiscard) =>
    set({
      isBlocked: blocked,
      message: message ?? DEFAULT_MESSAGE,
      onDiscard: blocked ? (onDiscard ?? null) : null,
    }),

  requestNavigation: (navigate) => {
    if (!get().isBlocked) {
      navigate();
      return;
    }
    set({ pendingNavigation: navigate });
  },

  confirmLeave: () => {
    const navigate = get().pendingNavigation;
    const discard = get().onDiscard;
    set({ pendingNavigation: null, isBlocked: false, onDiscard: null });
    discard?.();
    navigate?.();
  },

  cancelLeave: () => set({ pendingNavigation: null }),
}));
