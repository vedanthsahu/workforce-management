
import { Suspense } from "react";
import FloorLayoutsPage from "./FloorLayoutsPage";
import { Toaster } from "sonner";

function PageSkeleton() {
  return (
    <main className="flex-1 bg-[#f8fafc] p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-3 self-start sm:self-auto shrink-0">
          <div className="h-9 w-24 bg-gray-200 rounded-xl" />
          <div className="h-9 w-40 bg-indigo-200 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 h-96 bg-gray-100 rounded-2xl" />
        <div className="col-span-9 h-96 bg-gray-100 rounded-2xl" />
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Suspense fallback={<PageSkeleton />}>
        <FloorLayoutsPage />
      </Suspense>
    </>
  );
}