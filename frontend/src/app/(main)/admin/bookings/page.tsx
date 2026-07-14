"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus, Download, MoreHorizontal, Settings2 } from "lucide-react";
import BookingManagementFilters from "@/features/adminbookings/components/BookingManagementFilters";
import BookingStatCards from "@/features/adminbookings/components/BookingStatCards";
import BookingsTable from "@/features/adminbookings/components/BookingsTable";
import BookingDetailsPanel from "@/features/adminbookings/components/BookingDetailsPanel";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { MOCK_ADMIN_BOOKINGS } from "@/features/adminbookings/data/mockAdminBookings";
import { AdminBooking, defaultAdminBookingFilters } from "@/features/adminbookings/types/adminBooking.types";

const ITEMS_PER_PAGE = 10;

export default function AdminBookingsPage() {
  const [filters, setFilters] = useState(defaultAdminBookingFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  // Employee/Guest & Seat Number only take effect once "Search" is clicked,
  // unlike the other filters which apply immediately on change.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedSeatNumber, setAppliedSeatNumber] = useState("");

  const stats = useMemo(
    () => ({
      todays_bookings: MOCK_ADMIN_BOOKINGS.filter((b) => b.date_relative === "Today").length + 180,
      checked_in: MOCK_ADMIN_BOOKINGS.filter((b) => b.status === "Checked In").length + 80,
      not_checked_in: MOCK_ADMIN_BOOKINGS.filter((b) => b.status === "Confirmed").length + 91,
      cancelled: MOCK_ADMIN_BOOKINGS.filter((b) => b.status === "Cancelled").length + 5,
      guests: MOCK_ADMIN_BOOKINGS.filter((b) => b.person_type === "Guest").length + 11,
    }),
    []
  );

  const bookings = useMemo(() => {
    const search = appliedSearch.trim().toLowerCase();
    const seatNumber = appliedSeatNumber.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

    return MOCK_ADMIN_BOOKINGS.filter((b) => {
      if (filters.site !== "All" && b.site_name !== filters.site) return false;
      if (filters.building !== "All" && b.building_name !== filters.building) return false;
      if (filters.floor !== "All" && !b.floor_name.toLowerCase().startsWith(filters.floor.toLowerCase())) return false;
      if (filters.bookingType !== "All" && b.person_type !== filters.bookingType) return false;
      if (filters.status !== "All" && b.status !== filters.status) return false;
      if (filters.bookedBy !== "All" && b.booked_by !== filters.bookedBy) return false;
      if (seatNumber && !b.seat_code.toLowerCase().includes(seatNumber)) return false;
      if (search && !b.person_name.toLowerCase().includes(search) && !b.person_email.toLowerCase().includes(search)) {
        return false;
      }
      const bookingDate = new Date(b.date_label);
      if (from && bookingDate < from) return false;
      if (to && bookingDate > to) return false;
      return true;
    });
  }, [
    filters.site,
    filters.building,
    filters.floor,
    filters.bookingType,
    filters.status,
    filters.bookedBy,
    filters.dateFrom,
    filters.dateTo,
    appliedSearch,
    appliedSeatNumber,
  ]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBookings = bookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.site,
    filters.building,
    filters.floor,
    filters.bookingType,
    filters.status,
    filters.bookedBy,
    filters.dateFrom,
    filters.dateTo,
    appliedSearch,
    appliedSeatNumber,
  ]);

  const handleUpdateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setFilters(defaultAdminBookingFilters());
    setAppliedSearch("");
    setAppliedSeatNumber("");
  };

  const handleSearch = () => {
    setAppliedSearch(filters.search);
    setAppliedSeatNumber(filters.seatNumber);
    setCurrentPage(1);
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

      {/* STATS */}
      <BookingStatCards stats={stats} />

      {/* FILTERS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <BookingManagementFilters
          filters={filters}
          onUpdate={handleUpdateFilter}
          onClear={handleClear}
          onSearch={handleSearch}
        />
      </div>

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
          <BookingsTable
            data={paginatedBookings}
            selectedBookingId={selectedBooking?.booking_id}
            onView={setSelectedBooking}
          />

          {/* FOOTER */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
            <span>
              {bookings.length > 0 &&
                `Showing ${startIndex + 1} to ${Math.min(startIndex + ITEMS_PER_PAGE, bookings.length)} of ${bookings.length} entries`}
            </span>
            <div className="self-center sm:self-auto">
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
    </div>
  );
}
