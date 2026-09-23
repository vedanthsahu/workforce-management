"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  // Extra content (form fields, etc.) rendered below the description, OUTSIDE
  // it — AlertDialogDescription renders as a <p>, so block-level elements
  // (div/label/input/another <p>) must never go in `description` itself, or
  // React logs an invalid-DOM-nesting/hydration error.
  children?: ReactNode;
}

// Generic "are you sure?" dialog on the same Dialog primitives/styling used
// across the app (see CancelBookingDialog) — for simple confirm/cancel flows
// with no extra form fields. Built on Dialog rather than AlertDialog
// specifically so it closes on an outside click like every other dialog in
// the app, instead of requiring an explicit Cancel/Confirm press —
// AlertDialog hardcodes `disablePointerDismissal`, with no prop to turn it
// off (see @base-ui/react/alert-dialog's AlertDialogRoot.js).
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  destructive = false,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  const handleOpenChange = (val: boolean) => {
    if (!val) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-[#1A1A2E]">{title}</DialogTitle>
          <DialogDescription className="text-gray-500 text-[13px]">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children && <div className="py-2">{children}</div>}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <Button variant="outline" onClick={onClose} className="text-[12.5px] w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`text-[12.5px] disabled:opacity-50 w-full sm:w-auto ${
              destructive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
