"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, MoreHorizontal } from "lucide-react";
import BookingManagementFilters from "./BookingManagementFilters";
import BookingStatCards from "./BookingStatCards";
import BookingsTable from "./BookingsTable";
import BookingDetailsPanel from "./BookingDetailsPanel";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { CancelBookingDialog } from "@/features/bookings/components/CancelBookingDialog";
import { AdminBooking, AdminBookingListResponse, defaultAdminBookingFilters } from "../types/adminBooking.types";
import { useAdminBookingLocations } from "../hooks/useAdminBookingLocations";
import { useAdminBookingActions } from "../hooks/useAdminBookingActions";
import { adminBookingsService } from "../services/adminBookings.service";
import { mapAdminBookingRawToUiBooking, mapAdminBookingToDialogBooking } from "../utils/mapAdminBooking";
import { BOOKING_STATUS_PARAM, BOOKING_PAGE_SIZES } from "../utils/constants";

export default function AdminBookingsPage() {
  const router = useRouter();

  // `filters` is the draft state the filter form is bound to — editing it
  // (typing, picking a dropdown) never fetches or refilters anything.
  // `appliedFilters` is only replaced on an explicit Search click (or Clear),
  // and it alone drives the data fetch + table/card filtering below.
  const [filters, setFilters] = useState(defaultAdminBookingFilters());
  const [appliedFilters, setAppliedFilters] = useState(defaultAdminBookingFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(BOOKING_PAGE_SIZES[0]);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  // Date Range defaults to today (see defaultAdminBookingFilters) so it's
  // pre-selected in the field, but that's still just a draft value — cards &
  // table stay empty until the user clicks Search.
  const [hasApplied, setHasApplied] = useState(false);

  // Search is blocked until Employee/Guest is picked — surfaced as a
  // centered message in the body instead of inline under the field.
  const [searchError, setSearchError] = useState(false);

  const { sites, buildings, floors, loadBuildings, loadFloors, setBuildings, setFloors } =
    useAdminBookingLocations();

  // The backend now owns every filter (date range, hierarchy, type, status,
  // search, seat code) plus pagination and the summary counts — this page
  // just forwards appliedFilters as query params and renders what comes back.
  const [bookingsResponse, setBookingsResponse] = useState<AdminBookingListResponse | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Bumped after a successful cancel to force the list to refetch, since the
  // applied filters/page/pageSize otherwise wouldn't have changed.
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    cancelTarget,
    cancelMode,
    openCancelSeat,
    openCancelVisit,
    closeCancel,
    confirmCancel,
    modifySeat,
    modifyVisit,
  } = useAdminBookingActions({
    onCancelled: () => {
      setSelectedBooking(null);
      setRefreshKey((k) => k + 1);
    },
  });

  useEffect(() => {
    if (!hasApplied) {
      setBookingsResponse(null);
      setActivitiesLoading(false);
      return;
    }

    let cancelled = false;
    setActivitiesLoading(true);

    adminBookingsService
      .list({
        startDate: appliedFilters.dateFrom || undefined,
        endDate: appliedFilters.dateTo || undefined,
        siteId: appliedFilters.site && appliedFilters.site !== "All" ? appliedFilters.site : undefined,
        buildingId: appliedFilters.building && appliedFilters.building !== "All" ? appliedFilters.building : undefined,
        floorId: appliedFilters.floor && appliedFilters.floor !== "All" ? appliedFilters.floor : undefined,
        bookingType:
          appliedFilters.bookingType === "Employee"
            ? "EMPLOYEE"
            : appliedFilters.bookingType === "Guest"
              ? "GUEST"
              : undefined,
        bookingStatus: BOOKING_STATUS_PARAM[appliedFilters.status],
        search: appliedFilters.search.trim() || undefined,
        seatCode: appliedFilters.seatNumber.trim() || undefined,
        page: currentPage,
        limit: itemsPerPage,
      })
      .then((res) => {
        if (!cancelled) setBookingsResponse(res);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setBookingsResponse(null);
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasApplied,
    appliedFilters.site,
    appliedFilters.building,
    appliedFilters.floor,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
    appliedFilters.bookingType,
    appliedFilters.status,
    appliedFilters.search,
    appliedFilters.seatNumber,
    currentPage,
    itemsPerPage,
    refreshKey,
  ]);

  const mappedBookings = useMemo(
    () => (bookingsResponse?.items ?? []).map(mapAdminBookingRawToUiBooking),
    [bookingsResponse],
  );

  const stats = useMemo(() => {
    const summary = bookingsResponse?.summary;
    return {
      todays_bookings: summary?.total_bookings ?? 0,
      checked_in: summary?.checked_in_bookings ?? 0,
      not_checked_in: summary?.confirmed_bookings ?? 0,
      cancelled: summary?.cancelled_bookings ?? 0,
      guests: summary?.guest_bookings ?? 0,
    };
  }, [bookingsResponse]);

  const pagination = bookingsResponse?.pagination;
  const totalBookings = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const handleUpdateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if ((key === "bookingType" || key === "seatNumber" || key === "floor") && value) setSearchError(false);
  };

  const handleClear = () => {
    // Resets the Date Range field back to today, but that's still just a
    // draft — Clear doesn't re-run the search on its own either.
    const defaults = defaultAdminBookingFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setHasApplied(false);
    setSearchError(false);
  };

  const handleSearch = () => {
    // Office/Building/Floor start on an unselected placeholder ("") — picking
    // any of them (even explicitly choosing "All Office") counts as a filter,
    // same as Employee/Guest, Seat Number, Date Range or a non-default Status.
    // Block only when nothing at all is set.
    const hasAnyFilter =
      filters.bookingType ||
      filters.seatNumber.trim() ||
      filters.site ||
      filters.building ||
      filters.floor ||
      filters.dateFrom ||
      filters.dateTo ||
      (filters.status && filters.status !== "All");
    if (!hasAnyFilter) {
      setSearchError(true);
      return;
    }
    setSearchError(false);
    setAppliedFilters(filters);
    setCurrentPage(1);
    setHasApplied(true);
  };

  const handleSiteChange = (siteId: string) => {
    setFilters((prev) => ({ ...prev, site: siteId, building: "", floor: "" }));
    setFloors([]);
    if (siteId) setSearchError(false);
    if (siteId === "All") {
      setBuildings([]);
      return;
    }
    loadBuildings(siteId);
  };

  const handleBuildingChange = (buildingId: string) => {
    setFilters((prev) => ({ ...prev, building: buildingId, floor: "" }));
    if (buildingId) setSearchError(false);
    if (buildingId === "All") {
      setFloors([]);
      return;
    }
    loadFloors(buildingId);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">
      {/* HEADER */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Booking Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, manage and track all seat &amp; guest bookings across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => router.push("/book-for-someone")}
            className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={15} />
            Book for Someone
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium">
            <Download size={15} />
            Export
          </button>
          <button className="h-9 w-9 flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* FILTERS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <BookingManagementFilters
          filters={filters}
          onUpdate={handleUpdateFilter}
          onClear={handleClear}
          onSearch={handleSearch}
          sites={sites}
          buildings={buildings}
          floors={floors}
          onSiteChange={handleSiteChange}
          onBuildingChange={handleBuildingChange}
        />
      </div>

      {!hasApplied && searchError && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm font-medium text-red-500">Select at least one filter</p>
        </div>
      )}

      {hasApplied && (
        <>
          {/* STATS */}
          <BookingStatCards stats={stats} />

          {/* TABLE */}
          <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
            {/* TABLE HEADER */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0">
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">Bookings ({totalBookings})</h2>
            </div>

            {/* TABLE BODY */}
            {activitiesLoading ? (
              <p className="px-6 py-12 text-center text-gray-400 text-sm">Loading bookings…</p>
            ) : (
              <BookingsTable
                data={mappedBookings}
                selectedBookingId={selectedBooking?.booking_id}
                onView={setSelectedBooking}
              />
            )}

            {/* FOOTER */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
              <span>
                {totalBookings > 0 &&
                  `Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, totalBookings)} of ${totalBookings} entries`}
              </span>
              <div className="flex items-center gap-3 self-center sm:self-auto">
                {/* Rows-per-page only makes sense once there's more than a
                   single (minimum-size) page of results to choose from. */}
                {totalBookings >= BOOKING_PAGE_SIZES[0] && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Rows</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {BOOKING_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <AmenitiesPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </div>
          </div>

          {/* DETAILS MODAL — only rendered once a row action opens it */}
          {selectedBooking && (
            <BookingDetailsPanel
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
              onModifySeat={modifySeat}
              onModifyVisit={modifyVisit}
              onCancelSeat={(booking) => {
                setSelectedBooking(null);
                openCancelSeat(booking);
              }}
              onCancelVisit={(booking) => {
                setSelectedBooking(null);
                openCancelVisit(booking);
              }}
            />
          )}

          {/* CANCEL DIALOG — same component + copy "My Bookings" and
             "Book for Someone" use, branching by guest vs employee and by
             cancelMode ("booking" = seat only, "visit" = the whole visit). */}
          <CancelBookingDialog
            open={!!cancelTarget}
            booking={cancelTarget ? mapAdminBookingToDialogBooking(cancelTarget) : null}
            cancelMode={cancelMode}
            onConfirm={confirmCancel}
            onClose={closeCancel}
          />
        </>
      )}
    </div>
  );
}
