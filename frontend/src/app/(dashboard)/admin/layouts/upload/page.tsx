

// app/admin/layouts/upload/page.tsx
// Thin Server Component wrapper — same pattern as the layouts page.
// Required because UploadLayoutPage uses useSearchParams().

import { Suspense } from "react";
import UploadLayoutPage from "./UploadLayoutPage";
import { Toaster } from "sonner";

function PageSkeleton() {
  return (
    <main className="flex-1 p-6 bg-gray-50 space-y-6 overflow-y-auto animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-gray-200 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-md" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-96 bg-gray-100 rounded-xl" />
        <div className="space-y-4">
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <>
      <Suspense fallback={<PageSkeleton />}>
        <UploadLayoutPage />
      </Suspense>
      <Toaster richColors position="top-right" />
    </>
  );
}