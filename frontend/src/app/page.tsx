// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

// export default async function RootPage() {
//   const cookieStore = await cookies();
  
//   // Check if access_token cookie exists (set by your backend after SSO)
//   const accessToken = cookieStore.get("access_token");

//   if (accessToken) {
//     redirect("/dashboard"); //  logged in → dashboard
//   } else {
//     redirect("/login");     //  not logged in → login
//   }
// }

// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

// export default async function RootPage() {
//   const cookieStore = await cookies();
//   const accessToken = cookieStore.get("access_token")?.value;

//   if (!accessToken) {
//     redirect("/login");
//   }

//   // Don't guess the role here — send to client router which calls /me
//   redirect("/redirect");
// }

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
    const home = user.role === "TENANT_ADMIN" ? "/admin" : "/dashboard";
    router.replace(home);
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