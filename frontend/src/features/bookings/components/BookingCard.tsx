"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Hash, Clock, Pencil, X, ChevronDown, CalendarPlus, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_STYLES, BOOKING_TYPE_STYLES } from "../utils/constants";
import { formatDate } from "../utils/bookingHelpers";
import type { Booking } from "../types/bookings.types";

function BookingTagChip({ label, variant }: { label: string; variant: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
      TAG_STYLES[variant] ?? TAG_STYLES.zone,
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        variant === "confirmed" ? "bg-green-500" : variant === "sprint" ? "bg-amber-500" : "bg-current",
      )} />
      {label}
    </span>
  );
}

function BookingTypeBadge({ type }: { type: string }) {
  const style = BOOKING_TYPE_STYLES[type] ?? BOOKING_TYPE_STYLES.self;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Mini dropdown ──

function MiniDropdown({
  trigger,
  items,
}: {
  trigger: React.ReactNode;
  items: { label: string; icon: React.ReactNode; onClick: () => void; className?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {trigger}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[170px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium hover:bg-gray-50 transition-colors text-left",
                item.className ?? "text-gray-700",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BookingCard ──

export type BookingCardProps = {
  booking: Booking;
  onCancelClick: (booking: Booking) => void;
  onModifyClick: (booking: Booking) => void;
  onModifyVisit?: (booking: Booking) => void;
  onAddBooking?: (booking: Booking) => void;
  onCancelBooking?: (booking: Booking) => void;
  onCancelVisit?: (booking: Booking) => void;
  showActions?: boolean;
  variant?: "my" | "delegated";
};

export function BookingCard({
  booking,
  onCancelClick,
  onModifyClick,
  onModifyVisit,
  onAddBooking,
  onCancelBooking,
  onCancelVisit,
  showActions = true,
  variant = "my",
}: BookingCardProps) {
  const isCancelled = booking.status === "cancelled";
  const bType = booking.bookingType ?? "self";
  const isVisitOnly = bType === "visit";
  const isGuest = bType === "guest";

  const showPersonColumn = variant === "my"
    ? bType !== "self" && !!booking.bookedByName
    : !!booking.bookedForName;

  const personLabel = variant === "my" ? "Booked by" : "Booked for";
  const personName  = variant === "my" ? booking.bookedByName : booking.bookedForName;
  const personSub   = variant === "my"
    ? (booking.bookedByRole ?? "—")
    : bType === "guest"
      ? (booking.guestEmail ?? "Guest")
      : (booking.bookedForRole ?? "Employee");
  const personColor = variant === "my"
    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
    : bType === "guest"
      ? "bg-gradient-to-br from-amber-500 to-amber-600"
      : "bg-gradient-to-br from-blue-500 to-blue-600";

  const guestOrPersonName = isVisitOnly
    ? (booking.guestName ?? booking.bookedForName)
    : personName;

  const btnModify = "inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-lg px-3 py-1.5 transition-all cursor-pointer";
  const btnCancel = "inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-all cursor-pointer";

  const renderActions = () => {
    if (!showActions || isCancelled) return null;

    // SCHEDULED + No Booking
    if (isVisitOnly) {
      return (
        <div className="flex gap-2">
          <MiniDropdown
            trigger={
              <span className={btnModify}>
                <Pencil className="size-3" />
                Modify
                <ChevronDown className="size-3" />
              </span>
            }
            items={[
              { label: "Modify Visit", icon: <FileEdit className="size-3.5" />, onClick: () => onModifyVisit?.(booking) },
              { label: "Add Booking", icon: <CalendarPlus className="size-3.5" />, onClick: () => onAddBooking?.(booking) },
            ]}
          />
          <button type="button" onClick={() => onCancelVisit?.(booking)} className={btnCancel}>
            <X className="size-3" />
            Cancel
          </button>
        </div>
      );
    }

    // SCHEDULED + Active Booking
    if (isGuest) {
      return (
        <div className="flex gap-2">
          <MiniDropdown
            trigger={
              <span className={btnModify}>
                <Pencil className="size-3" />
                Modify
                <ChevronDown className="size-3" />
              </span>
            }
            items={[
              { label: "Edit Visit", icon: <FileEdit className="size-3.5" />, onClick: () => onModifyVisit?.(booking) },
              { label: "Edit Booking", icon: <Pencil className="size-3.5" />, onClick: () => onModifyClick(booking) },
            ]}
          />
          <MiniDropdown
            trigger={
              <span className={btnCancel}>
                <X className="size-3" />
                Cancel
                <ChevronDown className="size-3" />
              </span>
            }
            items={[
              { label: "Cancel Booking", icon: <X className="size-3.5" />, onClick: () => onCancelBooking?.(booking), className: "text-red-600" },
              { label: "Cancel Visit", icon: <X className="size-3.5" />, onClick: () => onCancelVisit?.(booking), className: "text-red-600" },
            ]}
          />
        </div>
      );
    }

    // self / employee
    return (
      <div className="flex gap-2">
        <button type="button" onClick={() => onModifyClick(booking)} className={btnModify}>
          <Pencil className="size-3" />
          Modify
        </button>
        <button type="button" onClick={() => onCancelClick(booking)} className={btnCancel}>
          <X className="size-3" />
          Cancel
        </button>
      </div>
    );
  };

  return (
    <div className={cn(
      "bg-white border border-[#EBEBF5] rounded-2xl transition-all duration-200",
      "hover:shadow-md hover:border-gray-200",
    )}>
      <div className={cn(
        "grid items-center gap-4 sm:gap-6 p-4 sm:px-5 sm:py-[18px]",
        showPersonColumn
          ? "grid-cols-[52px_1fr] sm:grid-cols-[52px_1.7fr_1.1fr_170px]"
          : "grid-cols-[52px_1fr] sm:grid-cols-[52px_1.7fr_170px]",
      )}>

        {/* Icon */}
        <div className={cn(
          "w-[52px] h-[52px] rounded-[13px] flex items-center justify-center shrink-0",
          isVisitOnly ? "bg-orange-50" : "bg-orange-100",
        )}>
          <span className="text-2xl leading-none" role="img" aria-label={isVisitOnly ? "Visit invite" : "Office building"}>
            {isVisitOnly ? "📨" : "🏢"}
          </span>
        </div>

        {/* Main info */}
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#0f172a] truncate">{booking.location}</p>

          {isVisitOnly ? (
            <p className="text-[12px] text-orange-500 mt-0.5">{booking.floor || "No seat reserved"}</p>
          ) : (
            <p className="text-[12px] text-gray-500 mt-0.5">{booking.floor} · Seat {booking.seat}</p>
          )}

          <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-gray-500">
            <Calendar className="size-3 text-gray-400 shrink-0" />
            <span>
              {formatDate(booking.date)}
              {" · "}
              {booking.isFullDay ? "Full day" : `${booking.startTime} – ${booking.endTime}`}
            </span>
          </div>

          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {!isCancelled && booking.tags.map((tag, i) => (
              <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
            ))}
            {isCancelled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Cancelled
              </span>
            )}
            <BookingTypeBadge type={bType} />
          </div>
        </div>

        {/* Person column */}
        {showPersonColumn && (guestOrPersonName ?? personName) && (
          <div className="hidden sm:block min-w-0">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2">
              {isVisitOnly ? "Guest" : personLabel}
            </p>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                isVisitOnly ? "bg-gradient-to-br from-orange-400 to-orange-500" : personColor,
              )}>
                {getInitials((guestOrPersonName ?? personName) as string)}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#1A1A2E] truncate">{guestOrPersonName ?? personName}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {isVisitOnly ? (booking.guestEmail ?? "Guest") : personSub}
                </p>
              </div>
            </div>

            {variant === "delegated" && (bType === "guest" || isVisitOnly) && booking.hostName && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600">
                  {getInitials(booking.hostName)}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1A1A2E] truncate">{booking.hostName}</p>
                  <p className="text-[11px] text-gray-400 truncate">Host</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meta + Actions */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="flex items-center gap-1.5 mb-1">
            <Hash className="size-3 text-blue-500" />
            <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">Booking ID</p>
          </div>
          <p className="text-[11.5px] text-gray-700 font-mono mb-2.5">{booking.guestVisitId ?? booking.id}</p>

          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="size-3 text-blue-500" />
            <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">Booked on</p>
          </div>
          <p className="text-[12px] text-gray-700">{booking.bookedOn}</p>

          <div className="mt-3">{renderActions()}</div>
        </div>
      </div>

      {/* Mobile meta + actions */}
      <div className="sm:hidden px-4 pb-4">
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <span className="font-mono">{booking.guestVisitId ?? booking.id}</span>
          <span>·</span>
          <span>{booking.bookedOn}</span>
        </div>
        <div className="mt-2.5">{renderActions()}</div>
      </div>
    </div>
  );
}
