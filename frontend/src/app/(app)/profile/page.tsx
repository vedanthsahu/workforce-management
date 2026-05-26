"use client";
import ProfilePage from "@/features/userProfile/components/ProfilePage";
import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { useAuthContext } from "@/features/auth/context/AuthContext";

export default function Page() {
  const { user } = useAuthContext();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar user={user} />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#F7F8FC]">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          }>
            <ProfilePage />
          </Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
}