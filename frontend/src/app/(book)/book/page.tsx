
"use client";

import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import BookASeatPage from "@/features/book/components/Bookaseatpage";

export default function Book() {
  return (
    <SidebarProvider>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-[#F7F8FC]">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }>
        <BookASeatPage />
      </Suspense>
    </SidebarProvider>
  );
}