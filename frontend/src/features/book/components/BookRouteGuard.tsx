"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/features/auth/context/AuthContext";

// /book is also the seat picker for book-for-someone, add-booking-to-visit and
// modify flows. Those are gated by their own permissions/backend checks, so only
// a plain self-booking visit (none of these params) requires seat:book_self.
const OTHER_FLOW_PARAMS = [
  "bookedForUserId",
  "guestId",
  "visitId",
  "modifyBookingId",
  "adminFlow",
  "isGuestModify",
];

export function BookRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuthContext();

  const isSelfBooking = !OTHER_FLOW_PARAMS.some((key) => searchParams.get(key));
  // Admin / front-office menus have no "Book a space" entry (role-based in
  // AppSidebar), and admins hold seat:book_self anyway, so check the role too.
  const canBookSelf =
    user?.role !== "TENANT_ADMIN" &&
    user?.role !== "FRONT_OFFICE" &&
    !!user?.permissions?.includes("seat:book_self");
  const allowed = !isSelfBooking || canBookSelf;

  useEffect(() => {
    if (!isLoading && !allowed) router.replace("/dashboard");
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) return null;
  return <>{children}</>;
}
