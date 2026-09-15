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
  BlockableFloorLayout,
  LocationOption,
  SeatOption,
} from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";
import BlockableFloorMap from "./BlockableFloorMap";

const today = () => new Date().toLocaleDateString("en-CA");
const inputClass =
  "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-muted disabled:text-muted-foreground";
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
  const [layout, setLayout] = useState<BlockableFloorLayout | null>(null);
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
      const [floorLayout, firstBookingPage] = await Promise.all([
        blockedSeatsService.getBlockableLayout(floorId, from, to),
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
      setLayout(floorLayout);
      setSeats(
        floorLayout.resources.map((resource) => ({
          seat_id: String(resource.resource_id),
          seat_code: resource.resource_code,
          resource_name: resource.resource_name,
          resource_type: resource.resource_type,
          svg_element_id: resource.svg_element_id,
          capacity: resource.capacity,
          hasBooking: resource.has_booking,
          hasBlock: resource.has_block,
          isUnavailable: !resource.is_active || !resource.is_bookable,
          selectable:
            resource.is_active && resource.is_bookable && !resource.has_block,
        })),
      );
      setBookings([
        ...firstBookingPage.items,
        ...remainingBookingPages.flatMap((page) => page.items),
      ]);
      setSelected([]);
    } catch (requestError: unknown) {
      setLayout(null);
      setSeats([]);
      setBookings([]);
      setSelected([]);
      setError(
        apiErrorMessage(
          requestError,
          "Unable to load the floor layout and bookings for this period.",
        ),
      );
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
  const alternatives = (b: AdminBookingRaw) => {
    const blockedResource = seats.find(
      (resource) => resource.seat_id === String(b.seat_id),
    );
    return seats
      .filter(
        (s) =>
          s.selectable &&
          !s.hasBooking &&
          !selected.includes(s.seat_id) &&
          s.seat_id !== String(b.seat_id) &&
          s.resource_type === blockedResource?.resource_type,
      )
      .slice(0, 3);
  };
  return (
    <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Dashboard / Blocked Seats / <b>Block Seats</b>
            </p>
            <h1 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">Block Seats</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Select location, view available and booked seats, resolve
              conflicts and block seats.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/blocked-seats")}
            className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <ArrowLeft size={16} />
            Back to Blocked Seats
          </button>
        </header>
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
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
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
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
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                  setFloors(id ? await blockedSeatsService.getFloors(id) : []);
                },
              },
              {
                label: "Floor",
                value: floorId,
                items: floors,
                disabled: !buildingId,
                onChange: async (id: string) => {
                  setFloorId(id);
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                },
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
                onChange={(e) => {
                  setFrom(e.target.value);
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                }}
              />
            </label>
            <label className="text-xs font-semibold">
              Block To *
              <input
                className={inputClass}
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                }}
              />
            </label>
            <button
              disabled={!floorId || invalid || loading}
              onClick={() => void load()}
              className="mt-5 h-10 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="mx-auto animate-spin" size={18} />
              ) : (
                "Load Layout"
              )}
            </button>
          </div>
          <label className="mt-3 block text-xs font-semibold">
            Reason *
            <textarea
              className="mt-1 min-h-16 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
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
        {layout && (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">Floor Layout</h2>
                  <p className="text-xs text-muted-foreground">{layout.layout_name}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {seats.length} spaces
                </span>
              </div>
              <BlockableFloorMap
                layoutUrl={layout.layout_file_url}
                resources={seats}
                selectedIds={selected}
                onToggle={(resourceId) =>
                  setSelected((ids) =>
                    ids.includes(resourceId)
                      ? ids.filter((id) => id !== resourceId)
                      : [...ids, resourceId],
                  )
                }
              />
            </section>
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
              <div className="flex justify-between">
                <h2 className="font-semibold">
                  Selected Spaces ({selected.length})
                </h2>
                <button
                  onClick={() => setSelected([])}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Clear All
                </button>
              </div>
              {!!selected.length && (
                <div className="mt-3 overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_36px] items-center gap-2 bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                    <span>Space</span>
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
                            className="grid grid-cols-[minmax(0,1fr)_auto_36px] items-center gap-2 px-3 py-3 text-[11px]"
                          >
                            <span className="truncate font-semibold text-foreground">
                              {s.seat_code}
                              <small className="block truncate font-normal text-muted-foreground">
                                {(s.resource_type ?? "STANDARD").replaceAll("_", " ")}
                                {s.capacity ? ` · Capacity ${s.capacity}` : ""}
                              </small>
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
                              aria-label={`Remove space ${s.seat_code}`}
                              onClick={() =>
                                setSelected((ids) =>
                                  ids.filter((id) => id !== s.seat_id),
                                )
                              }
                              className="mx-auto rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
          <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="p-4 font-semibold">
              Conflicting Bookings ({unresolvedConflictCount} seats,{" "}
              {conflicts.length} bookings)
            </h2>
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-muted/50">
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
                        <span className="text-muted-foreground">Not mutable today</span>
                      )}
                    </td>
                    <td className="p-3">
                      {b.booking_date && b.booking_date > today() ? (
                        alternatives(b).map((s) => (
                          <button
                            key={s.seat_id}
                            className="mr-2 rounded-md border border-border px-2 py-1 text-primary hover:bg-primary/10"
                            onClick={() => void move(b, s)}
                          >
                            Move to {s.seat_code}
                          </button>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          Existing booking rules allow changes only for future dates.
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {missingConflictSeats.map((seat) => (
                  <tr key={`missing-${seat.seat_id}`} className="border-t bg-amber-50/50">
                    <td className="p-3 font-semibold">{seat.seat_code}</td>
                    <td className="p-3 text-muted-foreground">Booking details unavailable</td>
                    <td className="p-3">{from} – {to}</td>
                    <td className="p-3 text-amber-700">Resolution required</td>
                    <td className="p-3 text-muted-foreground">
                      Reload seats to retrieve the conflicting booking details.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <footer className="sticky bottom-0 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p
            className={
              unresolvedConflictCount
                ? "text-sm text-amber-700"
                : "text-sm text-emerald-700"
            }
          >
            {unresolvedConflictCount
              ? `${unresolvedConflictCount} space conflict(s) must be resolved.`
              : `All conflicts resolved. ${selected.length} spaces are ready to block.`}
          </p>
          <button
            disabled={
              !selected.length ||
              !!unresolvedConflictCount ||
              !reason.trim() ||
              saving
            }
            onClick={() => void submit()}
            className="h-10 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Block {selected.length} {selected.length === 1 ? "Space" : "Spaces"}
          </button>
        </footer>
      </div>
    </main>
  );
}
