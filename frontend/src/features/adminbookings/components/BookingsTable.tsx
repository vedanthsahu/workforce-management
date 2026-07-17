"use client";

import { Eye, MoreVertical } from "lucide-react";
import { AdminBooking, BookingStatus } from "../types/adminBooking.types";

type Props = {
  data: AdminBooking[];
  selectedBookingId?: string | null;
  onView: (booking: AdminBooking) => void;
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  Scheduled: "bg-indigo-100 text-indigo-700",
  Confirmed: "bg-blue-100 text-blue-700",
  "Checked In": "bg-green-100 text-green-700",
  "Checked Out": "bg-teal-100 text-teal-700",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-700",
  Modified: "bg-amber-100 text-amber-700",
  "No Show": "bg-orange-100 text-orange-700",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function PersonCell({ booking }: { booking: AdminBooking }) {
  const isGuest = booking.person_type === "Guest";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
          isGuest ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {isGuest ? "GV" : initialsOf(booking.person_name)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-900 line-clamp-2 wrap-break-word">{booking.person_name}</p>
        <p className="text-[11px] text-gray-400 truncate">{booking.person_type}</p>
      </div>
    </div>
  );
}

export default function BookingsTable({ data, selectedBookingId, onView }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No bookings found.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth: "980px" }}>
        <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
          <tr>
            <th className="pl-14 pr-2 py-3 text-left font-bold max-w-45">Employee / Guest</th>
            <th className="pl-8 pr-3 py-3 text-left font-bold">Seat</th>
            <th className="pl-2 pr-3 py-3 text-left font-bold">Office</th>
            <th className="pl-2 pr-1 py-3 text-left font-bold">Building</th>
            <th className="pl-5 pr-1 py-3 text-left font-bold">Floor</th>
            <th className="pl-8 px-3 py-3 text-left font-bold">Date</th>
            <th className="pl-10 px-3 py-3 text-left font-bold">Status</th>
            <th className="pl-12 px-3 py-3 text-left font-bold">Booked By</th>
            <th className="px-3 py-3 text-center font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((booking) => {
            const isSelected = booking.booking_id === selectedBookingId;
            return (
              <tr key={booking.booking_id} className={isSelected ? "bg-indigo-50/60" : "hover:bg-gray-50"}>
                <td className="pl-5 pr-3 py-3 max-w-46">
                  <PersonCell booking={booking} />
                </td>
                <td className="pl-1 pr-3 py-3">
                  {booking.seat_code ? (
                    <>
                      <p className="text-gray-900 font-medium">{booking.seat_code}</p>
                      <p className="text-[11px] text-gray-400">{booking.seat_type}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">Visit only</p>
                  )}
                </td>
                <td className="pr-3 py-3 text-gray-700 max-w-[80px] break-words">{booking.site_name}</td>
                <td className="pl-3 pr-1 py-3 text-gray-700 max-w-20">
                  <p className="line-clamp-2 wrap-break-word">{booking.building_name}</p>
                </td>
                <td className="pl-3 pr-1 py-3 text-gray-700">{booking.floor_name}</td>
                <td className="pl-4 pr-3 py-3">
                  <p className="text-gray-900">{booking.date_label}</p>
                  <p className="text-[11px] text-gray-400">{booking.date_relative}</p>
                </td>
                <td className="pl-5 pr-3 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[booking.status]}`}
                  >
                    {booking.status}
                  </span>
                </td>
                <td className="pl-10 px-3 py-3 text-gray-700">{booking.booked_by}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Eye opens the Booking Details panel; the "…" button is inert for now */}
                    <button
                      onClick={() => onView(booking)}
                      className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
                      title="View booking details"
                    >
                      <Eye size={13} className="text-gray-500" />
                    </button>

                    <button
                      className="p-1.5 border rounded-lg hover:bg-gray-100 transition cursor-default"
                      title="More actions"
                    >
                      <MoreVertical size={13} className="text-gray-400" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
