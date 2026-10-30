"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, connectionError, retry } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isLoading, router, user]);

  // Server unreachable on the first check: say so instead of a blank page.
  if (connectionError) {
    return (
      <ErrorScreen
        title={
          connectionError === "unreachable"
            ? "We can't connect right now."
            : "Sorry, something went wrong on our end."
        }
        description={
          connectionError === "unreachable"
            ? "We can't reach the service. Please check your internet connection and try again."
            : "We're having trouble loading the app right now. Please try again in a moment."
        }
        onRetry={retry}
        showHome={false}
      />
    );
  }

  return null;
}
