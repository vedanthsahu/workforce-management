import { Suspense } from "react";
import AdminBookingsPage from "@/features/adminbookings/components/AdminBookingsPage";
import { AdminBookingsSkeleton } from "@/features/adminbookings/components/AdminBookingsSkeleton";

export default function Page() {
  return (
    <Suspense fallback={<AdminBookingsSkeleton />}>
      <AdminBookingsPage />
    </Suspense>
  );
}
