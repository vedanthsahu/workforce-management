"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus, Download, MoreHorizontal, Settings2 } from "lucide-react";
import BookingManagementFilters from "@/features/adminbookings/components/BookingManagementFilters";
import BookingStatCards from "@/features/adminbookings/components/BookingStatCards";
import BookingsTable from "@/features/adminbookings/components/BookingsTable";
import BookingDetailsPanel from "@/features/adminbookings/components/BookingDetailsPanel";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { AdminBooking, AdminActivityItem, defaultAdminBookingFilters } from "@/features/adminbookings/types/adminBooking.types";
import { useAdminBookingLocations } from "@/features/adminbookings/hooks/useAdminBookingLocations";
import { adminActivitiesService } from "@/features/adminbookings/services/adminActivities.service";
import { mapActivityToAdminBooking } from "@/features/adminbookings/utils/mapAdminActivity";

const PAGE_SIZES = [10, 25, 50, 75, 100];

export default function AdminBookingsPage() {
  // `filters` is the draft state the filter form is bound to — editing it
  // (typing, picking a dropdown) never fetches or refilters anything.
  // `appliedFilters` is only replaced on an explicit Search click (or Clear),
  // and it alone drives the data fetch + table/card filtering below.
  const [filters, setFilters] = useState(defaultAdminBookingFilters());
  const [appliedFilters, setAppliedFilters] = useState(defaultAdminBookingFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZES[0]);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  // Cards & table stay empty until the user clicks Search — no data
  // fetch/display happens on initial page load or on individual filter edits.
  const [hasApplied, setHasApplied] = useState(false);

  // Search is blocked until Employee/Guest is picked — surfaced as a
  // centered message in the body instead of inline under the field.
  const [searchError, setSearchError] = useState(false);

  const { sites, buildings, floors, loadBuildings, loadFloors, setBuildings, setFloors } =
    useAdminBookingLocations();

  // GET /admin/activities only supports a single exact `date`, not a range —
  // when the picked range collapses to one day we can push it server-side,
  // otherwise we fetch unfiltered by date and apply the range client-side.
  const exactDate =
    appliedFilters.dateFrom && appliedFilters.dateFrom === appliedFilters.dateTo
      ? appliedFilters.dateFrom
      : undefined;

  const [activities, setActivities] = useState<AdminActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    if (!hasApplied) {
      setActivities([]);
      setActivitiesLoading(false);
      return;
    }

    let cancelled = false;
    setActivitiesLoading(true);

    adminActivitiesService
      .list({
        siteId: appliedFilters.site && appliedFilters.site !== "All" ? appliedFilters.site : undefined,
        buildingId: appliedFilters.building && appliedFilters.building !== "All" ? appliedFilters.building : undefined,
        floorId: appliedFilters.floor && appliedFilters.floor !== "All" ? appliedFilters.floor : undefined,
        date: exactDate,
      })
      .then((res) => {
        if (!cancelled) setActivities(res.items);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasApplied, appliedFilters.site, appliedFilters.building, appliedFilters.floor, exactDate]);

  const mappedBookings = useMemo(() => activities.map(mapActivityToAdminBooking), [activities]);

  const stats = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return {
      todays_bookings: mappedBookings.filter((b) => b.activity_date === todayIso).length,
      checked_in: mappedBookings.filter((b) => b.status === "Checked In").length,
      not_checked_in: mappedBookings.filter((b) => b.status === "Confirmed").length,
      cancelled: mappedBookings.filter((b) => b.status === "Cancelled").length,
      guests: mappedBookings.filter((b) => b.person_type === "Guest").length,
    };
  }, [mappedBookings]);

  const bookings = useMemo(() => {
    const search = appliedFilters.search.trim().toLowerCase();
    const seatNumber = appliedFilters.seatNumber.trim().toLowerCase();
    // Only apply the range client-side when it wasn't already pushed server-side as `exactDate`.
    const from = !exactDate && appliedFilters.dateFrom ? new Date(`${appliedFilters.dateFrom}T00:00:00`) : null;
    const to = !exactDate && appliedFilters.dateTo ? new Date(`${appliedFilters.dateTo}T23:59:59`) : null;

    return mappedBookings.filter((b) => {
      if (
        appliedFilters.bookingType &&
        appliedFilters.bookingType !== "All" &&
        b.person_type !== appliedFilters.bookingType
      ) {
        return false;
      }
      if (appliedFilters.status !== "All" && b.status !== appliedFilters.status) return false;
      if (appliedFilters.bookedBy !== "All" && b.booked_by !== appliedFilters.bookedBy) return false;
      if (seatNumber && !b.seat_code.toLowerCase().includes(seatNumber)) return false;
      if (search && !b.person_name.toLowerCase().includes(search) && !b.person_email.toLowerCase().includes(search)) {
        return false;
      }
      if (from || to) {
        const activityDate = new Date(`${b.activity_date}T00:00:00`);
        if (from && activityDate < from) return false;
        if (to && activityDate > to) return false;
      }
      return true;
    });
  }, [
    mappedBookings,
    appliedFilters.bookingType,
    appliedFilters.status,
    appliedFilters.bookedBy,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
    exactDate,
    appliedFilters.search,
    appliedFilters.seatNumber,
  ]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = bookings.slice(startIndex, startIndex + itemsPerPage);

  const handleUpdateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if ((key === "bookingType" || key === "seatNumber" || key === "floor") && value) setSearchError(false);
  };

  const handleClear = () => {
    const defaults = defaultAdminBookingFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setHasApplied(false);
    setSearchError(false);
  };

  const handleSearch = () => {
    // Office/Building/Floor start on an unselected placeholder ("") — picking
    // any of them (even explicitly choosing "All Office") counts as a filter,
    // same as Employee/Guest or Seat Number. Block only when nothing at all is set.
    const hasAnyFilter =
      filters.bookingType ||
      filters.seatNumber.trim() ||
      filters.site ||
      filters.building ||
      filters.floor;
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
          <button className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm">
            <Plus size={15} />
            Book for Employee
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-4 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-medium">
            <UserPlus size={15} />
            Book Guest
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
          bookings={mappedBookings}
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

          {/* TABLE + DETAILS */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
            <div className="flex-1 min-w-0 w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
              {/* TABLE HEADER */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">Bookings ({bookings.length})</h2>
                <button className="inline-flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <Settings2 size={13} />
                  Columns
                </button>
              </div>

              {/* TABLE BODY */}
              {activitiesLoading ? (
                <p className="px-6 py-12 text-center text-gray-400 text-sm">Loading bookings…</p>
              ) : (
                <BookingsTable
                  data={paginatedBookings}
                  selectedBookingId={selectedBooking?.booking_id}
                  onView={setSelectedBooking}
                />
              )}

              {/* FOOTER */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
                <span>
                  {bookings.length > 0 &&
                    `Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, bookings.length)} of ${bookings.length} entries`}
                </span>
                <div className="flex items-center gap-3 self-center sm:self-auto">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Rows</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <AmenitiesPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              </div>
            </div>

            {/* DETAILS PANEL — only rendered once a row action opens it */}
            {selectedBooking && (
              <BookingDetailsPanel
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onModify={setSelectedBooking}
                onCancel={setSelectedBooking}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
