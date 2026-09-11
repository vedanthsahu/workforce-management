"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { adminBookingsService } from "@/features/adminbookings/services/adminBookings.service";
import type { AdminBookingRaw } from "@/features/adminbookings/types/adminBooking.types";
import {
  cancelBooking,
  cancelGuestBooking,
} from "@/features/bookings/services/bookings.service";
import {
  modifyBooking,
  modifyGuestBooking,
} from "@/features/book/services/Bookingform.service";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type {
  BlockType,
  LocationOption,
  SeatOption,
} from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";

const today = () => new Date().toLocaleDateString("en-CA");
const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 disabled:bg-slate-50";
const apiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as {
    response?: { data?: { detail?: { message?: string }; error?: { message?: string } } };
  }).response?.data;
  return data?.detail?.message ?? data?.error?.message ?? fallback;
};
const isActiveConflictBooking = (booking: AdminBookingRaw) =>
  ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(
    booking.booking_status ?? "",
  ) || (booking.booking_status === "MODIFIED" && booking.is_modified === true);

export default function BlockSeatsPage() {
  const router = useRouter();
  const [sites, setSites] = useState<LocationOption[]>([]),
    [buildings, setBuildings] = useState<LocationOption[]>([]),
    [floors, setFloors] = useState<LocationOption[]>([]);
  const [siteId, setSiteId] = useState(""),
    [buildingId, setBuildingId] = useState(""),
    [floorId, setFloorId] = useState("");
  const [from, setFrom] = useState(today()),
    [to, setTo] = useState(today()),
    [reason, setReason] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("MAINTENANCE"),
    [seats, setSeats] = useState<SeatOption[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [bookings, setBookings] = useState<AdminBookingRaw[]>([]);
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    router.prefetch("/admin/blocked-seats");
    void blockedSeatsService.getSites().then(setSites);
  }, [router]);
  const invalid = to < from;
  const conflicts = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.seat_id &&
          selected.includes(String(b.seat_id)) &&
          isActiveConflictBooking(b),
      ),
    [bookings, selected],
  );
  const conflictSeats = new Set(conflicts.map((b) => String(b.seat_id)));
  const selectedBookedSeats = seats.filter(
    (seat) => selected.includes(seat.seat_id) && seat.hasBooking,
  );
  const unresolvedConflictCount = new Set([
    ...conflictSeats,
    ...selectedBookedSeats.map((seat) => seat.seat_id),
  ]).size;
  const missingConflictSeats = selectedBookedSeats.filter(
    (seat) => !conflictSeats.has(seat.seat_id),
  );
  const resolveBooking = (booking: AdminBookingRaw) => {
    const remaining = bookings.filter(
      (row) => row.booking_id !== booking.booking_id,
    );
    setBookings(remaining);
    const stillBooked = remaining.some(
      (row) =>
        String(row.seat_id) === String(booking.seat_id) &&
        isActiveConflictBooking(row),
    );
    if (!stillBooked) {
      setSeats((rows) =>
        rows.map((seat) =>
          seat.seat_id === String(booking.seat_id)
            ? { ...seat, hasBooking: false }
            : seat,
        ),
      );
    }
  };
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [seatRows, firstBookingPage] = await Promise.all([
        blockedSeatsService.getSeats(floorId, from, to),
        adminBookingsService.list({
          floorId,
          startDate: from,
          endDate: to,
          limit: 100,
        }),
      ]);
      const remainingBookingPages = await Promise.all(
        Array.from(
          { length: Math.max(0, firstBookingPage.pagination.total_pages - 1) },
          (_, index) =>
            adminBookingsService.list({
              floorId,
              startDate: from,
              endDate: to,
              page: index + 2,
              limit: 100,
            }),
        ),
      );
      setSeats(seatRows);
      setBookings([
        ...firstBookingPage.items,
        ...remainingBookingPages.flatMap((page) => page.items),
      ]);
      setSelected([]);
    } catch {
      setError("Unable to load seats and bookings for this period.");
    } finally {
      setLoading(false);
    }
  };
  const cancel = async (b: AdminBookingRaw) => {
    if (
      !b.booking_id ||
      !confirm(`Cancel booking for ${b.seat_code} on ${b.booking_date}?`)
    )
      return;
    try {
      const action =
        b.booking_type === "GUEST" ? cancelGuestBooking : cancelBooking;
      await action(b.booking_id, "Seat required for an administrative block");
      resolveBooking(b);
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, "Unable to cancel this booking."));
    }
  };
  const move = async (b: AdminBookingRaw, seat: SeatOption) => {
    if (
      !b.booking_id ||
      !b.site_id ||
      !b.building_id ||
      !b.floor_id ||
      !b.booking_date
    )
      return;
    try {
      const action =
        b.booking_type === "GUEST" ? modifyGuestBooking : modifyBooking;
      await action(b.booking_id, {
        site_id: +b.site_id,
        building_id: +b.building_id,
        floor_id: +b.floor_id,
        seat_id: +seat.seat_id,
        booking_date: b.booking_date,
      });
      resolveBooking(b);
    } catch (requestError: unknown) {
      setError(
        apiErrorMessage(
          requestError,
          "Unable to modify this booking; reload availability and try again.",
        ),
      );
    }
  };
  const submit = async () => {
    if (unresolvedConflictCount || !selected.length || !reason.trim()) return;
    setSaving(true);
    try {
      await blockedSeatsService.create({
        seat_ids: selected.map(Number),
        block_type: blockType,
        blocked_from: from,
        blocked_to: to,
        reason: reason.trim(),
      });
      router.push("/admin/blocked-seats");
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { detail?: { message?: string } } } })
          .response?.data?.detail?.message ??
          "Unable to block seats; reload to check for new conflicts.",
      );
    } finally {
      setSaving(false);
    }
  };
  const alternatives = (b: AdminBookingRaw) =>
    seats
      .filter(
        (s) =>
          s.selectable &&
          !s.hasBooking &&
          !selected.includes(s.seat_id) &&
          s.seat_id !== b.seat_id,
      )
      .slice(0, 3);
  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              Dashboard / Blocked Seats / <b>Block Seats</b>
            </p>
            <h1 className="mt-2 text-2xl font-bold">Block Seats</h1>
            <p className="text-sm text-slate-500">
              Select location, view available and booked seats, resolve
              conflicts and block seats.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/blocked-seats")}
            className="flex h-10 items-center gap-2 rounded-md border bg-white px-4 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Back to Blocked Seats
          </button>
        </header>
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {[
              {
                label: "Site",
                value: siteId,
                items: sites,
                disabled: false,
                onChange: async (id: string) => {
                  setSiteId(id);
                  setBuildingId("");
                  setFloorId("");
                  setBuildings(
                    id ? await blockedSeatsService.getBuildings(id) : [],
                  );
                },
              },
              {
                label: "Building",
                value: buildingId,
                items: buildings,
                disabled: !siteId,
                onChange: async (id: string) => {
                  setBuildingId(id);
                  setFloorId("");
                  setFloors(id ? await blockedSeatsService.getFloors(id) : []);
                },
              },
              {
                label: "Floor",
                value: floorId,
                items: floors,
                disabled: !buildingId,
                onChange: async (id: string) => setFloorId(id),
              },
            ].map((f) => (
              <label key={f.label} className="text-xs font-semibold">
                {f.label} *
                <select
                  className={inputClass}
                  value={f.value}
                  disabled={f.disabled}
                  onChange={(e) => void f.onChange(e.target.value)}
                >
                  <option value="">Select</option>
                  {f.items.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-xs font-semibold">
              Block Type *
              <select
                className={inputClass}
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as BlockType)}
              >
                {BLOCK_TYPE_OPTIONS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Block From *
              <input
                className={inputClass}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Block To *
              <input
                className={inputClass}
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              disabled={!floorId || invalid || loading}
              onClick={() => void load()}
              className="mt-5 h-10 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white disabled:bg-violet-300"
            >
              {loading ? (
                <Loader2 className="mx-auto animate-spin" size={18} />
              ) : (
                "Load Seats"
              )}
            </button>
          </div>
          <label className="mt-3 block text-xs font-semibold">
            Reason *
            <textarea
              className="mt-1 min-h-16 w-full rounded-md border p-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {invalid && (
            <p className="text-xs text-red-600">
              Block To must be on or after Block From.
            </p>
          )}
        </section>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!!seats.length && (
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <section className="rounded-xl border bg-white p-4">
              <h2 className="font-semibold">Floor Seats</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {seats.map((s) => {
                  const chosen = selected.includes(s.seat_id);
                  return (
                    <button
                      key={s.seat_id}
                      disabled={!s.selectable}
                      onClick={() =>
                        setSelected((ids) =>
                          chosen
                            ? ids.filter((id) => id !== s.seat_id)
                            : [...ids, s.seat_id],
                        )
                      }
                      className={`min-w-28 rounded-lg border p-3 text-xs font-semibold ${chosen ? "bg-violet-600 text-white" : s.hasBooking ? "bg-amber-50 text-amber-800" : s.selectable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                    >
                      {s.seat_code}
                      <small className="block">
                        {s.hasBlock
                          ? "Blocked"
                          : s.hasBooking
                            ? "Booked"
                            : s.isUnavailable
                              ? "Unavailable"
                              : "Available"}
                      </small>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="rounded-xl border bg-white p-4">
              <div className="flex justify-between">
                <h2 className="font-semibold">
                  Selected Seats ({selected.length})
                </h2>
                <button
                  onClick={() => setSelected([])}
                  className="text-xs text-violet-600"
                >
                  Clear All
                </button>
              </div>
              {!!selected.length && (
                <div className="mt-3 overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_44px] items-center gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                    <span>Seat</span>
                    <span>Status</span>
                    <span className="text-center">Action</span>
                  </div>
                  <div className="divide-y">
                    {seats
                      .filter((s) => selected.includes(s.seat_id))
                      .map((s) => {
                        const hasConflict =
                          s.hasBooking || conflictSeats.has(s.seat_id);
                        return (
                          <div
                            key={s.seat_id}
                            className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_44px] items-center gap-2 px-3 py-3 text-xs"
                          >
                            <span className="truncate font-semibold text-slate-900">
                              {s.seat_code}
                            </span>
                            <span
                              className={
                                hasConflict
                                  ? "font-medium text-amber-700"
                                  : "font-medium text-emerald-700"
                              }
                            >
                              {hasConflict
                                ? "Booking Conflict"
                                : "Ready to Block"}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove seat ${s.seat_code}`}
                              onClick={() =>
                                setSelected((ids) =>
                                  ids.filter((id) => id !== s.seat_id),
                                )
                              }
                              className="mx-auto rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        {!!unresolvedConflictCount && (
          <section className="overflow-x-auto rounded-xl border bg-white">
            <h2 className="p-4 font-semibold">
              Conflicting Bookings ({unresolvedConflictCount} seats,{" "}
              {conflicts.length} bookings)
            </h2>
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Seat",
                    "User",
                    "Booking Period",
                    "Action",
                    "Suggested Seats",
                  ].map((x) => (
                    <th key={x} className="p-3">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conflicts.map((b) => (
                  <tr key={b.booking_id} className="border-t">
                    <td className="p-3 font-semibold">{b.seat_code}</td>
                    <td className="p-3">{b.booked_for_name}</td>
                    <td className="p-3">{b.booking_date}</td>
                    <td className="p-3">
                      {b.booking_date && b.booking_date > today() ? (
                        <button
                          className="text-red-600"
                          onClick={() => void cancel(b)}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-slate-400">Not mutable today</span>
                      )}
                    </td>
                    <td className="p-3">
                      {b.booking_date && b.booking_date > today() ? (
                        alternatives(b).map((s) => (
                          <button
                            key={s.seat_id}
                            className="mr-2 rounded border px-2 py-1 text-violet-700"
                            onClick={() => void move(b, s)}
                          >
                            Move to {s.seat_code}
                          </button>
                        ))
                      ) : (
                        <span className="text-slate-500">
                          Existing booking rules allow changes only for future dates.
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {missingConflictSeats.map((seat) => (
                  <tr key={`missing-${seat.seat_id}`} className="border-t bg-amber-50/50">
                    <td className="p-3 font-semibold">{seat.seat_code}</td>
                    <td className="p-3 text-slate-500">Booking details unavailable</td>
                    <td className="p-3">{from} – {to}</td>
                    <td className="p-3 text-amber-700">Resolution required</td>
                    <td className="p-3 text-slate-500">
                      Reload seats to retrieve the conflicting booking details.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <footer className="sticky bottom-0 flex items-center justify-between rounded-xl border bg-white p-4 shadow">
          <p
            className={
              unresolvedConflictCount
                ? "text-sm text-amber-700"
                : "text-sm text-emerald-700"
            }
          >
            {unresolvedConflictCount
              ? `${unresolvedConflictCount} seat conflict(s) must be resolved.`
              : `All conflicts resolved. ${selected.length} seats are ready to block.`}
          </p>
          <button
            disabled={
              !selected.length ||
              !!unresolvedConflictCount ||
              !reason.trim() ||
              saving
            }
            onClick={() => void submit()}
            className="h-10 rounded-md bg-violet-600 px-5 text-sm font-semibold text-white disabled:bg-violet-300"
          >
            Block {selected.length} Seats
          </button>
        </footer>
      </div>
    </main>
  );
}
