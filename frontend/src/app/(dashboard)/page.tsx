// app/(dashboard)/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/features/auth/context/AuthContext";

export default function RoleRouter() {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    if (user.role === "TENANT_ADMIN") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  // Shown briefly while /me resolves
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}