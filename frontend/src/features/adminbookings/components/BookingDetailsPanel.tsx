"use client";

import {
  X,
  Armchair,
  MapPin,
  Building2,
  Layers,
  CalendarDays,
  Clock,
  UserRound,
  CalendarPlus,
  LogIn,
  Sparkles,
  FileText,
} from "lucide-react";
import { AdminBooking, BookingStatus } from "../types/adminBooking.types";

type Props = {
  booking: AdminBooking;
  onClose: () => void;
  onModify: (booking: AdminBooking) => void;
  onCancel: (booking: AdminBooking) => void;
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  Confirmed: "bg-blue-100 text-blue-700",
  "Checked In": "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Completed: "bg-gray-100 text-gray-600",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400">{label}</p>
        <div className="text-xs text-gray-900 font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

export default function BookingDetailsPanel({ booking, onClose, onModify, onCancel }: Props) {
  const isGuest = booking.person_type === "Guest";
  const shownAmenities = booking.amenities.slice(0, 3);
  const remainingAmenities = booking.amenities.length - shownAmenities.length;

  return (
    <div className="w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">Booking Details</h2>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition">
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="px-4 py-4 flex-1 overflow-y-auto">
        <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full font-medium ${STATUS_STYLES[booking.status]}`}>
          {booking.status}
        </span>

        {/* Person */}
        <div className="flex items-center gap-3 mt-3 pb-3 border-b">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
              isGuest ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
            }`}
          >
            {isGuest ? "GV" : initialsOf(booking.person_name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{booking.person_name}</p>
            <p className="text-[11px] text-gray-400 truncate">{booking.person_type}</p>
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-gray-50">
          <DetailRow icon={<Armchair size={14} />} label="Seat" value={`${booking.seat_code} (${booking.seat_type})`} />
          <DetailRow icon={<MapPin size={14} />} label="Site" value={booking.site_name} />
          <DetailRow icon={<Building2 size={14} />} label="Building" value={booking.building_name} />
          <DetailRow icon={<Layers size={14} />} label="Floor" value={booking.floor_name} />
          <DetailRow
            icon={<CalendarDays size={14} />}
            label="Date"
            value={`${booking.date_label} (${booking.date_relative})`}
          />
          <DetailRow icon={<Clock size={14} />} label="Time" value={booking.time_range} />
          <DetailRow icon={<UserRound size={14} />} label="Booked By" value={booking.booked_by} />
          <DetailRow icon={<CalendarPlus size={14} />} label="Booked On" value={booking.booked_on} />
          <DetailRow icon={<LogIn size={14} />} label="Check In Time" value={booking.check_in_time ?? "--"} />
          <DetailRow
            icon={<Sparkles size={14} />}
            label="Amenities"
            value={
              booking.amenities.length === 0 ? (
                "--"
              ) : (
                <span className="flex flex-wrap items-center gap-1">
                  {shownAmenities.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium"
                    >
                      {a.label}
                    </span>
                  ))}
                  {remainingAmenities > 0 && (
                    <span className="inline-flex px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-medium">
                      +{remainingAmenities}
                    </span>
                  )}
                </span>
              )
            }
          />
          <DetailRow icon={<FileText size={14} />} label="Notes" value={booking.notes ?? "--"} />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-4 border-t shrink-0">
        <button
          onClick={() => onModify(booking)}
          className="flex-1 h-9 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Modify Booking
        </button>
        <button
          onClick={() => onCancel(booking)}
          className="flex-1 h-9 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancel Booking
        </button>
      </div>
    </div>
  );
}
