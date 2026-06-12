"use client";

import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { usePermissions } from "../hooks/usePermissions";
import { useDashboardActions } from "../hooks/useDashboardActions";
import { FatalErrorScreen } from "./dashboarderror";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { HeroBanner } from "./HeroBanner";
import { WeekStrip } from "./WeekStrip";
import { StatCards } from "./StatCards";
import { UpcomingBookings } from "./UpcomingBookings";
import { TeamInOffice } from "./TeamInOffice";
import { FavouriteSeatCard } from "./FavouriteSeatCard";
import { CancelBookingDialog } from "./CancelBookingDialog";

export default function DashboardPage() {
  const {
    data, isLoading, isFatal, fatalError, refetch,
    visibleBookings, totalBookingsCount, handleCancelBooking,
  } = useDashboard();

  const { user } = useAuthContext();
  const currentUser = user ?? data?.user ?? null;

  const { can } = usePermissions();
  const canBookSelf = can("seat:book_self");
  const canCancelOwn = can("booking:cancel_own");
  const canViewOwn = can("booking:view_own");
  const canViewTeammates = can("teammate:view");

  const {
    cancelTarget, setCancelTarget,
    handleCancelClick, handleConfirmCancel, handleModifyBooking,
  } = useDashboardActions({ canBookSelf, canCancelOwn, handleCancelBooking });

  if (isLoading) return <DashboardSkeleton />;
  if (isFatal && fatalError) return <FatalErrorScreen error={fatalError} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <HeroBanner
        userName={currentUser?.name ?? currentUser?.display_name ?? "there"}
        todayBooking={data.todayBooking}
        teamInOfficeCount={data.stats.teamInOffice}
        nextBookingDate={data.nextBookingDate}
        canBookSelf={canBookSelf}
      />

      <WeekStrip days={data.weekDays} />

      <StatCards
        daysInOffice={data.daysInOffice}
        trend={data.stats.trend}
        teamInOffice={data.stats.teamInOffice}
        officeVisitsThisYear={data.stats.officeVisitsThisYear}
        teamRank={data.stats.teamRank}
      />

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start animate-fade-in-up" style={{ animationDelay: "240ms" }}>
        <div className="flex-1 min-w-0 w-full space-y-4">
          {canViewOwn && (
            <UpcomingBookings
              bookings={visibleBookings}
              onCancel={handleCancelClick}
              onModify={handleModifyBooking}
              totalCount={totalBookingsCount}
              canCancelOwn={canCancelOwn}
              canBookSelf={canBookSelf}
            />
          )}
          <TeamInOffice
            members={data.teamInOfficeToday}
            inOfficeCount={data.stats.teamInOffice}
            remoteCount={data.stats.teamRemoteCount}
            canViewTeammates={canViewTeammates}
            canBookSelf={canBookSelf}
          />
        </div>

        {canBookSelf && (
          <div className="w-full lg:w-[258px] lg:shrink-0 space-y-4">
            <FavouriteSeatCard seat={data.favouriteSeat} canBookSelf={canBookSelf} />
          </div>
        )}
      </div>

      <CancelBookingDialog
        open={cancelTarget !== null}
        booking={cancelTarget}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
