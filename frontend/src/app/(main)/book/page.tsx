import { Suspense } from "react";
import BookASeatPage from "@/features/book/components/Bookaseatpage";
import { BookaSeatSkeleton } from "@/features/book/components/BookaSeatSkeleton";

export default function Book() {
  return (
    <Suspense fallback={
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 flex flex-col gap-4 sm:gap-5">
          <BookaSeatSkeleton />
        </div>
      </main>
    }>
      <BookASeatPage />
    </Suspense>
  );
}
