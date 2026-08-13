"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Generic "are you sure?" dialog on the same AlertDialog primitives/styling
// used across the app (see CancelBookingDialog) — for simple confirm/cancel
// flows with no extra form fields.
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
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A1A2E]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 text-[13px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="py-2">{children}</div>}
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <AlertDialogCancel onClick={onClose} className="text-[12.5px] w-full sm:w-auto">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={`text-[12.5px] disabled:opacity-50 w-full sm:w-auto ${
              destructive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
