"use client";

import { ChevronLeft, ChevronRight, Eye, MoreVertical, Pencil, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AdminBooking } from "../types/adminBooking.types";
import { BOOKING_STATUS_STYLES } from "../utils/constants";
import { getBookingRowKey } from "../utils/mapAdminBooking";

type Props = {
  data: AdminBooking[];
  selectedRowKey?: string | null;
  onView: (booking: AdminBooking) => void;
  onModifySeat: (booking: AdminBooking) => void;
  onModifyVisit: (booking: AdminBooking) => void;
  onCancelSeat: (booking: AdminBooking) => void;
  onCancelVisit: (booking: AdminBooking) => void;
};

function RowMenu({
  booking,
  onView,
  onModifySeat,
  onModifyVisit,
  onCancelSeat,
  onCancelVisit,
}: {
  booking: AdminBooking;
  onView: (b: AdminBooking) => void;
  onModifySeat: (b: AdminBooking) => void;
  onModifyVisit: (b: AdminBooking) => void;
  onCancelSeat: (b: AdminBooking) => void;
  onCancelVisit: (b: AdminBooking) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<"root" | "modify" | "cancel">("root");
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isGuest = booking.person_type === "Guest";
  const hasVisit = isGuest && !!booking.guest_visit_id;
  const hasBooking = !!booking.booking_id;
  const canMutate = booking.status !== "Cancelled" && booking.activity_date > new Date().toISOString().slice(0, 10);
  const hasBothActions = canMutate && hasVisit && hasBooking;

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
    setSubmenu("root");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  type MenuItem = {
    label: string;
    onClick: () => void;
    icon: LucideIcon;
    variant?: "default" | "danger";
    trailingIcon?: LucideIcon;
  };

  let items: MenuItem[] = [];

  if (submenu === "modify") {
    items = [
      { label: "Back", onClick: () => setSubmenu("root"), icon: ChevronLeft },
      { label: "Modify Visit", onClick: () => onModifyVisit(booking), icon: Pencil },
      { label: "Modify Booking", onClick: () => onModifySeat(booking), icon: Pencil },
    ];
  } else if (submenu === "cancel") {
    items = [
      { label: "Back", onClick: () => setSubmenu("root"), icon: ChevronLeft },
      { label: "Cancel Visit", onClick: () => onCancelVisit(booking), icon: XCircle, variant: "danger" },
      { label: "Cancel Booking", onClick: () => onCancelSeat(booking), icon: XCircle, variant: "danger" },
    ];
  } else {
    items.push({ label: "View Details", onClick: () => onView(booking), icon: Eye });
    if (canMutate) {
      if (hasBothActions) {
        items.push({ label: "Modify", onClick: () => setSubmenu("modify"), icon: Pencil, trailingIcon: ChevronRight });
        items.push({
          label: "Cancel",
          onClick: () => setSubmenu("cancel"),
          icon: XCircle,
          variant: "danger",
          trailingIcon: ChevronRight,
        });
      } else if (hasVisit) {
        items.push({ label: "Edit Visit", onClick: () => onModifyVisit(booking), icon: Pencil });
        items.push({ label: "Cancel Visit", onClick: () => onCancelVisit(booking), icon: XCircle, variant: "danger" });
      } else if (hasBooking) {
        items.push({ label: "Modify Booking", onClick: () => onModifySeat(booking), icon: Pencil });
        items.push({ label: "Cancel Booking", onClick: () => onCancelSeat(booking), icon: XCircle, variant: "danger" });
      }
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`p-1.5 rounded-lg border transition ${
          open ? "bg-gray-100 border-gray-300" : "border-gray-200 hover:bg-gray-100 hover:border-gray-300"
        }`}
        title="More actions"
      >
        <MoreVertical size={14} className="text-gray-500" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", bottom: position.bottom, right: position.right }}
            className="z-50 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
          >
            {items.map((it, idx) => {
              const isDanger = it.variant === "danger";
              const isNav = it.label === "Back" || !!it.trailingIcon;
              const startsDangerGroup = isDanger && items[idx - 1]?.variant !== "danger";
              const Icon = it.icon;
              const Trailing = it.trailingIcon;
              return (
                <div key={it.label}>
                  {startsDangerGroup && <div className="my-1 border-t border-gray-100" />}
                  {it.label === "Back" && <div className="mb-1 border-b border-gray-100" />}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isNav) setOpen(false);
                      it.onClick();
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-left text-xs w-full transition-colors ${
                      it.label === "Back"
                        ? "text-gray-400 hover:bg-gray-50"
                        : isDanger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={13} className={isDanger ? "text-red-500" : "text-gray-400"} strokeWidth={2} />
                    <span className={`flex-1 ${isDanger ? "font-medium" : ""}`}>{it.label}</span>
                    {Trailing && <Trailing size={13} className="text-gray-300" strokeWidth={2} />}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

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
        {initialsOf(booking.person_name)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-900 line-clamp-2 wrap-break-word">{booking.person_name}</p>
        <p className="text-[11px] text-gray-400 truncate">{booking.person_type}</p>
      </div>
    </div>
  );
}

export default function BookingsTable({ data, selectedRowKey, onView, onModifySeat, onModifyVisit, onCancelSeat, onCancelVisit }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No bookings found.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth: "980px" }}>
        <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
          <tr>
            <th className="pl-10 pr-2 py-3 text-left font-bold max-w-45">Employee / Guest</th>
            <th className="pl-8 pr-3 py-3 text-left font-bold">Seat</th>
            <th className="pl-3 pr-3 py-3 text-left font-bold">Office</th>
            <th className="pl-3 pr-1 py-3 text-left font-bold">Building</th>
            <th className="pl-5 pr-1 py-3 text-left font-bold">Floor</th>
            <th className="pl-8 px-3 py-3 text-left font-bold">Date</th>
            <th className="pl-10 px-3 py-3 text-left font-bold">Status</th>
            <th className="px-3 py-3 text-center font-bold">Booked By</th>
            <th className="px-3 py-3 text-center font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((booking) => {
            const rowKey = getBookingRowKey(booking);
            const isSelected = rowKey === selectedRowKey;
            return (
              <tr key={rowKey} className={isSelected ? "bg-indigo-50/60" : "hover:bg-gray-50"}>
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
                    <p className="pl-1 pr-10 text-gray-900 font-medium text-center">Visit only</p>
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
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${BOOKING_STATUS_STYLES[booking.status]}`}
                  >
                    {booking.status}
                  </span>
                  {booking.cancelled_by && (
                    <p className="mt-1 text-xs font-bold text-gray-500 whitespace-nowrap">by {booking.cancelled_by}</p>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-700 text-center">{booking.booked_by}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <RowMenu
                      booking={booking}
                      onView={onView}
                      onModifySeat={onModifySeat}
                      onModifyVisit={onModifyVisit}
                      onCancelSeat={onCancelSeat}
                      onCancelVisit={onCancelVisit}
                    />
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
