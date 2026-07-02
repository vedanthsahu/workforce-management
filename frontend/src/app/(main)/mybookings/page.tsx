import { Suspense } from "react";
import MyBookingsPage from "@/features/bookings/components/MyBookingsPage";
import { MyBookingsStatsSkeleton, MyBookingsSkeleton } from "@/features/bookings/components/MyBookingsSkeleton";

function MyBookingsFallback() {
  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">
      <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">
        <MyBookingsStatsSkeleton />
      </div>
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <MyBookingsSkeleton />
      </div>
    </main>
  );
}

export default function MyBookings() {
  return (
    <Suspense fallback={<MyBookingsFallback />}>
      <MyBookingsPage />
    </Suspense>
  );
}
