"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

// Shown when a page throws while rendering, in place of Next.js's default
// error screen. `reset` re-renders the page without a full reload.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorScreen onRetry={reset} />;
}
