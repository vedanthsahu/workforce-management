"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/features/auth/context/AuthContext";

export default function RootPage() {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Block until /me has fully resolved
    if (isLoading || user === undefined) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Single hop — correct destination on first navigation, no flash
    router.replace("/dashboard");
  }, [isLoading, user, router]);

  // Shown only while /me is in flight — typically <500ms
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-[12px] text-gray-400">Loading…</span>
      </div>
    </div>
  );
}