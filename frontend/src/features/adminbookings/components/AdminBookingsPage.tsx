"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, MoreHorizontal } from "lucide-react";
import BookingManagementFilters from "./BookingManagementFilters";
import BookingStatCards from "./BookingStatCards";
import BookingsTable from "./BookingsTable";
import BookingDetailsPanel from "./BookingDetailsPanel";
import { AdminBookingsSkeleton } from "./AdminBookingsSkeleton";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { CancelBookingDialog } from "@/features/bookings/components/CancelBookingDialog";
import { AdminBooking, AdminBookingListResponse, defaultAdminBookingFilters } from "../types/adminBooking.types";
import { useAdminBookingLocations } from "../hooks/useAdminBookingLocations";
import { useAdminBookingActions } from "../hooks/useAdminBookingActions";
import { adminBookingsService } from "../services/adminBookings.service";
import { getBookingRowKey, mapAdminBookingRawToUiBooking, mapAdminBookingToDialogBooking, resolveStatus } from "../utils/mapAdminBooking";
import {
  BOOKING_STATUS_PARAM,
  BOOKING_PAGE_SIZES,
  ADMIN_BOOKINGS_SEARCH_STATE_KEY,
  ADMIN_BOOKINGS_EXPECT_RETURN_KEY,
} from "../utils/constants";


type PersistedSearchState = {
  filters: ReturnType<typeof defaultAdminBookingFilters>;
  appliedFilters: ReturnType<typeof defaultAdminBookingFilters>;
  currentPage: number;
  itemsPerPage: number;
  hasApplied: boolean;
};

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

  // Date Range defaults to today (see defaultAdminBookingFilters) and, since
  // appliedFilters starts out equal to filters, the page auto-searches with
  // those defaults (today, Employee) on first load instead of waiting for an
  // explicit Search click.
  const [hasApplied, setHasApplied] = useState(true);

  // Search is blocked until Employee/Guest is picked — surfaced as a
  // centered message in the body instead of inline under the field.
  const [searchError, setSearchError] = useState(false);

  const { sites, buildings, floors, loadBuildings, loadFloors, setBuildings, setFloors } =
    useAdminBookingLocations();

  // Restore the previous search on a browser Back from the Modify flow — but
  // not on a fresh nav-bar visit or an actual page reload, both of which
  // should start clean. Next.js App Router doesn't create a new Performance
  // "navigation" entry for client-side back/forward, so that API can't tell
  // a Back from a fresh visit here; instead, useAdminBookingActions.ts's
  // modifySeat/modifyVisit set ADMIN_BOOKINGS_EXPECT_RETURN_KEY right before
  // navigating away, and this is the one-shot consumer of that flag. Runs
  // before paint, so there's no flash of the empty/default state first.
  useLayoutEffect(() => {
    const expectingReturn = sessionStorage.getItem(ADMIN_BOOKINGS_EXPECT_RETURN_KEY);
    sessionStorage.removeItem(ADMIN_BOOKINGS_EXPECT_RETURN_KEY);

    if (!expectingReturn) {
      sessionStorage.removeItem(ADMIN_BOOKINGS_SEARCH_STATE_KEY);
      return;
    }

    const raw = sessionStorage.getItem(ADMIN_BOOKINGS_SEARCH_STATE_KEY);
    if (!raw) return;

    try {
      const saved: PersistedSearchState = JSON.parse(raw);
      setFilters(saved.filters);
      setAppliedFilters(saved.appliedFilters);
      setCurrentPage(saved.currentPage);
      setItemsPerPage(saved.itemsPerPage);
      setHasApplied(saved.hasApplied);

      // Re-populate the Building/Floor option lists the restored filters
      // depend on — they're loaded on demand (see handleSiteChange/
      // handleBuildingChange) and wouldn't otherwise exist on a fresh mount.
      if (saved.filters.site && saved.filters.site !== "All") loadBuildings(saved.filters.site);
      if (saved.filters.building && saved.filters.building !== "All") loadFloors(saved.filters.building);
    } catch {
      sessionStorage.removeItem(ADMIN_BOOKINGS_SEARCH_STATE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the persisted snapshot in sync so it's there if the user navigates
  // away (e.g. Modify) and comes back via browser Back.
  useEffect(() => {
    const state: PersistedSearchState = { filters, appliedFilters, currentPage, itemsPerPage, hasApplied };
    sessionStorage.setItem(ADMIN_BOOKINGS_SEARCH_STATE_KEY, JSON.stringify(state));
  }, [filters, appliedFilters, currentPage, itemsPerPage, hasApplied]);

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

    const baseParams = {
      startDate: appliedFilters.dateFrom || undefined,
      endDate: appliedFilters.dateTo || undefined,
      siteId: appliedFilters.site && appliedFilters.site !== "All" ? appliedFilters.site : undefined,
      buildingId: appliedFilters.building && appliedFilters.building !== "All" ? appliedFilters.building : undefined,
      floorId: appliedFilters.floor && appliedFilters.floor !== "All" ? appliedFilters.floor : undefined,
      bookingType:
        appliedFilters.bookingType === "Employee"
          ? ("EMPLOYEE" as const)
          : appliedFilters.bookingType === "Guest"
            ? ("GUEST" as const)
            : undefined,
      search: appliedFilters.search.trim() || undefined,
      seatCode: appliedFilters.seatNumber.trim() || undefined,
    };

    if (appliedFilters.status !== "All") {
      // The backend can't filter by status in a single dimension for every
      // case: Guest rows are split across bookings.booking_status
      // (guest-with-seat bookings) and guest_visits.visit_status (the visit
      // itself, including guest visits with no seat at all — which the
      // backend only returns when bookingStatus is omitted entirely). And
      // "Modified" specifically can never be matched server-side at all for
      // Employee/Guest bookings either way: the currently-active successor
      // booking is still stored as booking_status='CONFIRMED' (flagged via
      // is_modified) — literal booking_status='MODIFIED' rows are superseded
      // history that fetch_admin_bookings unconditionally excludes.
      //
      // So for any specific status (Employee or Guest tab, or the combined
      // "All" tab): pull every row, status-unfiltered, across all backend
      // pages (booking_status='MODIFIED'/visit_status='MODIFIED' superseded-
      // history rows are still excluded server-side same as always — see
      // fetch_admin_bookings/fetch_admin_guest_visits_without_booking),
      // de-duplicate a guest visit that appears both as its BOOKING row and
      // again as a bare GUEST_VISIT row (happens once that booking is
      // cancelled — the visit then has no *active* booking anymore, so both
      // queries return it), then filter and paginate using the exact same
      // resolveStatus the table renders with — so what's on screen always
      // matches the selected filter regardless of which backend field the
      // status actually lives in.
      const FETCH_LIMIT = 100;
      (async () => {
        try {
          const first = await adminBookingsService.list({
            ...baseParams,
            page: 1,
            limit: FETCH_LIMIT,
          });
          if (cancelled) return;

          let allItems = first.items;
          const totalPages = first.pagination.total_pages;
          for (let p = 2; p <= totalPages; p += 1) {
            if (cancelled) return;
            const next = await adminBookingsService.list({
              ...baseParams,
              page: p,
              limit: FETCH_LIMIT,
            });
            if (cancelled) return;
            allItems = allItems.concat(next.items);
          }

          // Prefer the BOOKING row over a same-visit GUEST_VISIT row so a
          // cancelled/modified booking's guest visit doesn't get counted twice.
          const byKey = new Map<string, (typeof allItems)[number]>();
          allItems.forEach((item, index) => {
            const key = item.guest_visit_id ?? item.booking_id ?? `${item.activity_source}-${index}`;
            const existing = byKey.get(key);
            if (!existing || (item.activity_source === "BOOKING" && existing.activity_source !== "BOOKING")) {
              byKey.set(key, item);
            }
          });
          const dedupedItems = [...byKey.values()];

          // "Confirmed" stays a superset that includes Modified rows too — same as
          // the Employee tab's plain bookingStatus=CONFIRMED fetch below, which
          // never excludes is_modified rows either (only the "Modified" filter
          // itself drills down to just those). Every other status is an exact match.
          const matchingItems = dedupedItems.filter((item) => {
            const status = resolveStatus(item);
            if (appliedFilters.status === "Confirmed") {
              return status === "Confirmed" || status === "Modified";
            }
            return status === appliedFilters.status;
          });
          const total = matchingItems.length;
          const start = (currentPage - 1) * itemsPerPage;
          const pageItems = matchingItems.slice(start, start + itemsPerPage);

          // Derive every stat card number from the filtered set itself — the
          // backend's own summary is computed over the unfiltered dataset and
          // would misreport Checked In/Not Checked In/Guests otherwise.
          const checkedInCount = matchingItems.filter((item) => !!item.check_in_at).length;
          const checkedOutCount = matchingItems.filter((item) => !!item.checked_out_at).length;
          const guestCount = matchingItems.filter((item) => item.booking_type === "GUEST").length;

          setBookingsResponse({
            items: pageItems,
            summary: {
              total_bookings: total,
              confirmed_bookings: total - checkedInCount,
              cancelled_bookings: appliedFilters.status === "Cancelled" ? total : 0,
              modified_bookings: appliedFilters.status === "Modified" ? total : 0,
              completed_bookings: appliedFilters.status === "Completed" ? total : 0,
              no_show_bookings: appliedFilters.status === "No Show" ? total : 0,
              employee_bookings: total - guestCount,
              guest_bookings: guestCount,
              checked_in_bookings: checkedInCount,
              checked_out_bookings: checkedOutCount,
            },
            pagination: {
              total,
              page: currentPage,
              limit: itemsPerPage,
              total_pages: total ? Math.ceil(total / itemsPerPage) : 0,
            },
          });
        } catch (error) {
          console.error(error);
          if (!cancelled) setBookingsResponse(null);
        } finally {
          if (!cancelled) setActivitiesLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    adminBookingsService
      .list({
        ...baseParams,
        bookingStatus: BOOKING_STATUS_PARAM[appliedFilters.status],
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
    // Resets back to the same default (today, Employee) the page opens
    // with, and — unlike a plain field reset — applies it immediately, so
    // the stats/table reappear right away instead of vanishing behind the
    // "Select at least one filter" message until the admin clicks Search
    // again. Today's defaults always count as a real filter (bookingType
    // is non-empty), so this never hits that message; an empty result for
    // today still renders the (zeroed) stat cards and the table's own "No
    // bookings found" state rather than disappearing.
    const defaults = defaultAdminBookingFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setSearchError(false);
    setCurrentPage(1);
    setHasApplied(true);
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

  // Clicking a stat card is a shortcut for "pick this Status and Search" --
  // applies immediately instead of just populating the dropdown, so the
  // table always lands on the same rows the clicked count summarizes.
  const handleStatCardFilter = (status: string) => {
    const nextFilters = { ...filters, status };
    setFilters(nextFilters);
    setSearchError(false);
    setAppliedFilters(nextFilters);
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

  // Full-page skeleton only for the very first fetch (auto-search on mount
  // with today's default filters) — later re-fetches (page change, new
  // search) keep the filters bar interactive and just show the lighter
  // inline loading state in the table body below.
  if (activitiesLoading && !bookingsResponse) {
    return <AdminBookingsSkeleton />;
  }

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
          <BookingStatCards stats={stats} onFilterClick={handleStatCardFilter} />

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
                  selectedRowKey={selectedBooking ? getBookingRowKey(selectedBooking) : undefined}
                  onView={setSelectedBooking}
                  onModifySeat={modifySeat}
                  onModifyVisit={modifyVisit}
                  onCancelSeat={(b) => openCancelSeat(b)}
                  onCancelVisit={(b) => openCancelVisit(b)}
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
