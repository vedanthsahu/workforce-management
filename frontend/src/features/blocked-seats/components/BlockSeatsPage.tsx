"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  cancelBooking,
  cancelGuestBooking,
} from "@/features/bookings/services/bookings.service";
import {
  modifyBooking,
  modifyGuestBooking,
} from "@/features/book/services/Bookingform.service";
import { blockedSeatsService } from "../services/blockedSeatsService";
import { useBlockedSeatLocations } from "../hooks/useBlockedSeatLocations";
import type {
  BlockType,
  BlockedSeatConflict,
  BlockableFloorLayout,
  SeatOption,
} from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";
import BlockableFloorMap from "./BlockableFloorMap";

const today = () => new Date().toLocaleDateString("en-CA");
const inclusiveLayoutEndDate = (effectiveTill: string | null) => {
  if (!effectiveTill) return "";
  const [year, month, day] = effectiveTill.slice(0, 10).split("-").map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day));
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  return endDate.toISOString().slice(0, 10);
};
const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
const CONFLICT_PAGE_SIZE = 10;
const inputClass =
  "mt-1.5 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-[12.5px] text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 sm:h-10 sm:text-[13px]";
const apiErrorMessage = (error: unknown, fallback: string) => {
  const data = (
    error as {
      response?: {
        data?: { detail?: { message?: string }; error?: { message?: string } };
      };
    }
  ).response?.data;
  return data?.detail?.message ?? data?.error?.message ??
    (error instanceof Error && error.message.startsWith("The blocked-seat API is outdated.")
      ? error.message
      : fallback);
};
const isActiveConflictBooking = (booking: BlockedSeatConflict) =>
  ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(
    booking.booking_status ?? "",
  );

export default function BlockSeatsPage() {
  const router = useRouter();
  const {
    sites,
    buildings,
    floors,
    loadingSites,
    loadingBuildings,
    loadingFloors,
    loadBuildings,
    loadFloors,
    setBuildings,
    setFloors,
  } = useBlockedSeatLocations();
  const [siteId, setSiteId] = useState(""),
    [buildingId, setBuildingId] = useState(""),
    [floorId, setFloorId] = useState("");
  const [from, setFrom] = useState(today()),
    [to, setTo] = useState(today()),
    [reason, setReason] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("MAINTENANCE"),
    [seats, setSeats] = useState<SeatOption[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [bookings, setBookings] = useState<BlockedSeatConflict[]>([]);
  const [layout, setLayout] = useState<BlockableFloorLayout | null>(null);
  const [effectiveLayoutName, setEffectiveLayoutName] = useState("");
  const [layoutEndDate, setLayoutEndDate] = useState("");
  const [layoutDateError, setLayoutDateError] = useState("");
  const [checkingLayoutDates, setCheckingLayoutDates] = useState(false);
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [conflictPage, setConflictPage] = useState(1);
  const loadVersion = useRef(0);
  useEffect(() => {
    loadVersion.current += 1;
    setLoading(false);
    setBookings([]);
    return () => {
      loadVersion.current += 1;
    };
  }, [floorId, from, to]);
  useEffect(() => {
    router.prefetch("/admin/blocked-seats");
  }, [router]);
  useEffect(() => {
    if (siteId && !buildingId && !loadingBuildings && buildings.length === 1) {
      const onlyBuildingId = buildings[0].id;
      setBuildingId(onlyBuildingId);
      setFloorId("");
      setLayout(null);
      setSeats([]);
      setSelected([]);
      setFloors([]);
      void loadFloors(onlyBuildingId);
    }
  }, [buildingId, buildings, loadFloors, loadingBuildings, setFloors, siteId]);
  useEffect(() => {
    if (buildingId && !floorId && !loadingFloors && floors.length === 1) {
      setFloorId(floors[0].id);
      setLayout(null);
      setSeats([]);
      setSelected([]);
    }
  }, [buildingId, floorId, floors, loadingFloors]);
  useEffect(() => {
    if (!floorId || !from) {
      setEffectiveLayoutName("");
      setLayoutEndDate("");
      setLayoutDateError("");
      setCheckingLayoutDates(false);
      return;
    }

    let cancelled = false;
    setCheckingLayoutDates(true);
    setLayoutDateError("");
    void blockedSeatsService
      .getBlockableLayout(floorId, from, from, false, "metadata")
      .then((effectiveLayout) => {
        if (cancelled) return;
        void fetch(effectiveLayout.layout_file_url).catch(() => undefined);
        const maximumDate = inclusiveLayoutEndDate(
          effectiveLayout.effective_till,
        );
        setEffectiveLayoutName(effectiveLayout.layout_name);
        setLayoutEndDate(maximumDate);
        setTo((current) =>
          current < from || (maximumDate && current > maximumDate)
            ? from
            : current,
        );
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setEffectiveLayoutName("");
        setLayoutEndDate("");
        setLayoutDateError(
          apiErrorMessage(
            requestError,
            "No effective floor layout is available for the selected Block From date.",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setCheckingLayoutDates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [floorId, from]);
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
  const conflictingRows = [
    ...conflicts.map((booking) => ({ kind: "booking" as const, booking })),
    ...missingConflictSeats.map((seat) => ({ kind: "missing" as const, seat })),
  ];
  const conflictTotalPages = Math.max(
    1,
    Math.ceil(conflictingRows.length / CONFLICT_PAGE_SIZE),
  );
  const visibleConflictRows = conflictingRows.slice(
    (conflictPage - 1) * CONFLICT_PAGE_SIZE,
    conflictPage * CONFLICT_PAGE_SIZE,
  );
  useEffect(() => {
    if (conflictPage > conflictTotalPages) {
      setConflictPage(conflictTotalPages);
    }
  }, [conflictPage, conflictTotalPages]);
  const resolveBooking = (booking: BlockedSeatConflict) => {
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
    const version = ++loadVersion.current;
    setLayout(null);
    setSeats([]);
    setSelected([]);
    setBookings([]);
    setLoading(true);
    setError("");
    try {
      const [, bookingPages] = await Promise.all([
        blockedSeatsService
          .getBlockableLayout(floorId, from, to, true)
          .then((floorLayout) => {
            if (version !== loadVersion.current) return;
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
                  resource.is_active &&
                  resource.is_bookable &&
                  !resource.has_block,
              })),
            );
          }),
        (async () => {
          const conflicts: BlockedSeatConflict[] = [];
          let page = 1;
          // SQL pagination and sequential pages keep database load bounded.
          while (version === loadVersion.current) {
            const result = await blockedSeatsService.getConflicts(floorId, from, to, page);
            conflicts.push(...result.conflicts);
            if (!result.has_more_conflicts) break;
            page += 1;
          }
          return conflicts;
        })(),
      ]);
      if (version !== loadVersion.current) return;
      setBookings(bookingPages);
      setConflictPage(1);
    } catch (requestError: unknown) {
      if (version !== loadVersion.current) return;
      // Invalidate the other parallel request if one request failed.
      loadVersion.current += 1;
      setLoading(false);
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
      if (version === loadVersion.current) setLoading(false);
    }
  };
  const cancel = async (b: BlockedSeatConflict) => {
    if (
      !b.booking_id ||
      !confirm(`Cancel booking for ${b.seat_code} on ${b.booking_date}?`)
    )
      return;
    try {
      const action =
        b.booking_type === "GUEST" ? cancelGuestBooking : cancelBooking;
      await action(b.booking_id, "Space required for an administrative block");
      resolveBooking(b);
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, "Unable to cancel this booking."));
    }
  };
  const move = async (b: BlockedSeatConflict, seat: SeatOption) => {
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
    if (loading || unresolvedConflictCount || !selected.length || !reason.trim()) return;
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
          "Unable to block spaces; reload to check for new conflicts.",
      );
    } finally {
      setSaving(false);
    }
  };
  const alternatives = (b: BlockedSeatConflict) => {
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
    <main className="flex-1 overflow-y-auto bg-[#F7F8FC] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1680px] space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-bold leading-tight text-[#1A1A2E] sm:text-[20px]">Block Spaces</h1>
            <p className="mt-0.5 text-[11.5px] text-gray-400 sm:text-[12.5px]">
              Select location, view available and booked spaces, resolve
              conflicts and block spaces.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/blocked-seats")}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-[12.5px] font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            <ArrowLeft size={16} />
            Back to Blocked Spaces
          </button>
        </header>
        <section className="rounded-xl border border-[#EBEBF5] bg-white p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {[
              {
                label: "Office",
                value: siteId,
                items: sites,
                disabled: loadingSites,
                placeholder: loadingSites ? "Loading Offices…" : "Select Office",
                onChange: async (id: string) => {
                  setSiteId(id);
                  setBuildingId("");
                  setFloorId("");
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                  setBuildings([]);
                  setFloors([]);
                  await loadBuildings(id);
                },
              },
              {
                label: "Building",
                value: buildingId,
                items: buildings,
                disabled: !siteId || loadingBuildings,
                placeholder: loadingBuildings
                  ? "Loading Buildings…"
                  : "Select Building",
                onChange: async (id: string) => {
                  setBuildingId(id);
                  setFloorId("");
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                  setFloors([]);
                  await loadFloors(id);
                },
              },
              {
                label: "Floor",
                value: floorId,
                items: floors,
                disabled: !buildingId || loadingFloors,
                placeholder: loadingFloors ? "Loading Floors…" : "Select Floor",
                onChange: async (id: string) => {
                  setFloorId(id);
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                },
              },
            ].map((f) => (
              <label key={f.label} className="text-[11px] font-medium text-gray-500">
                {f.label} *
                <select
                  className={inputClass}
                  value={f.value}
                  disabled={f.disabled}
                  onChange={(e) => void f.onChange(e.target.value)}
                >
                  <option value="">{f.placeholder}</option>
                  {f.items.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-[11px] font-medium text-gray-500">
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
            <label className="text-[11px] font-medium text-gray-500">
              Block From *
              <input
                className={inputClass}
                type="date"
                value={from}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  setFrom(selectedDate);
                  setTo(selectedDate);
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                }}
              />
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              Block To *
              <input
                className={inputClass}
                type="date"
                value={to}
                min={from}
                max={layoutEndDate || undefined}
                disabled={checkingLayoutDates || Boolean(layoutDateError)}
                onChange={(e) => {
                  setTo(e.target.value);
                  setLayout(null);
                  setSeats([]);
                  setSelected([]);
                }}
              />
            </label>
            <button
              disabled={
                !floorId ||
                invalid ||
                loading ||
                checkingLayoutDates ||
                Boolean(layoutDateError)
              }
              onClick={() => void load()}
              className="mt-5 h-9 rounded-lg bg-indigo-600 px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:text-[13px]"
            >
              {loading ? (
                <Loader2 className="mx-auto animate-spin" size={18} />
              ) : (
                "Load Layout"
              )}
            </button>
          </div>
          <label className="mt-4 block text-[11px] font-medium text-gray-500">
            Reason *
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-lg border border-gray-200 bg-white p-3 text-[12.5px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 sm:text-[13px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {invalid && (
            <p className="text-xs text-red-600">
              Block To must be on or after Block From.
            </p>
          )}
          {checkingLayoutDates && (
            <p className="mt-2 text-[11.5px] text-gray-400 sm:text-[12px]">
              Checking the effective floor-layout period…
            </p>
          )}
          {!checkingLayoutDates && effectiveLayoutName && (
            <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11.5px] text-indigo-700 sm:text-[12px]">
              {layoutEndDate
                ? `${effectiveLayoutName} is effective through ${displayDate(layoutEndDate)}. Block To is limited to this date.`
                : `${effectiveLayoutName} has no scheduled end date.`}
            </p>
          )}
          {layoutDateError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-600 sm:text-[12px]">
              {layoutDateError}
            </p>
          )}
        </section>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {layout && loading && (
          <p role="status" className="text-sm text-gray-500">Loading booking conflicts...</p>
        )}
        {layout && (
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_250px] xl:grid-cols-[minmax(0,1fr)_270px]">
            <section className="min-w-0 rounded-xl border border-[#EBEBF5] bg-white p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-[14px] font-bold text-[#1A1A2E] sm:text-[15px]">Floor Layout</h2>
                  <p className="text-[11.5px] text-gray-400 sm:text-[12px]">{layout.layout_name}</p>
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
            <section className="rounded-xl border border-[#EBEBF5] bg-white p-3 lg:sticky lg:top-4">
              <div className="flex justify-between">
                <h2 className="text-[14px] font-bold text-[#1A1A2E] sm:text-[15px]">
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
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_30px] items-center gap-1.5 bg-muted/50 px-2.5 py-2 text-[10px] font-semibold text-muted-foreground">
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
                            className="grid grid-cols-[minmax(0,1fr)_auto_30px] items-center gap-1.5 px-2.5 py-3 text-[10px]"
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
        {!loading && !!unresolvedConflictCount && (
          <section className="overflow-hidden rounded-xl border border-[#EBEBF5] bg-white">
            <h2 className="p-4 text-[14px] font-bold text-[#1A1A2E] sm:text-[15px]">
              Conflicting Bookings ({unresolvedConflictCount} spaces,{" "}
              {conflicts.length} bookings)
            </h2>
            <div className="divide-y divide-[#EBEBF5] md:hidden">
              {visibleConflictRows.map((row) => {
                if (row.kind === "missing") {
                  return (
                    <article key={`mobile-missing-${row.seat.seat_id}`} className="space-y-3 bg-amber-50/50 p-4 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-gray-900">{row.seat.seat_code}</p>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">
                          Resolution required
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">User</dt>
                          <dd className="mt-1 text-gray-600">Details unavailable</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Period</dt>
                          <dd className="mt-1 text-gray-600">{from} – {to}</dd>
                        </div>
                      </dl>
                      <p className="break-words text-gray-500 [overflow-wrap:anywhere]">
                        Reload spaces to retrieve the conflicting booking details.
                      </p>
                    </article>
                  );
                }
                const booking = row.booking;
                const mutable = Boolean(
                  booking.booking_date && booking.booking_date > today(),
                );
                const suggestedSeats = alternatives(booking);
                return (
                  <article key={`mobile-${booking.booking_id}`} className="space-y-3 p-4 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{booking.seat_code}</p>
                        <p className="mt-1 break-words text-gray-600 [overflow-wrap:anywhere]">
                          {booking.booked_for_name}
                        </p>
                      </div>
                      <span className="shrink-0 text-gray-500">{booking.booking_date}</span>
                    </div>
                    {mutable ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50"
                          onClick={() => void cancel(booking)}
                        >
                          Cancel booking
                        </button>
                        {suggestedSeats.map((seat) => (
                          <button
                            key={seat.seat_id}
                            className="rounded-lg border border-border px-3 py-2 font-medium text-primary hover:bg-primary/10"
                            onClick={() => void move(booking, seat)}
                          >
                            Move to {seat.seat_code}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">
                        Existing booking rules allow changes only for future dates.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] table-fixed text-left text-[12px] sm:text-[12.5px]">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[21%]" />
                <col className="w-[17%]" />
                <col className="w-[19%]" />
                <col className="w-[31%]" />
              </colgroup>
              <thead className="bg-[#F7F8FC] text-[11px] font-semibold text-gray-500">
                <tr>
                  {[
                    "Space",
                    "User",
                    "Booking Period",
                    "Action",
                    "Suggested Spaces",
                  ].map((x) => (
                    <th key={x} className="p-3">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleConflictRows.map((row) => {
                  if (row.kind === "missing") {
                    const seat = row.seat;
                    return (
                      <tr key={`missing-${seat.seat_id}`} className="border-t bg-amber-50/50">
                        <td className="break-words p-3 align-top font-semibold [overflow-wrap:anywhere]">{seat.seat_code}</td>
                        <td className="break-words p-3 align-top text-muted-foreground [overflow-wrap:anywhere]">Booking details unavailable</td>
                        <td className="break-words p-3 align-top [overflow-wrap:anywhere]">{from} – {to}</td>
                        <td className="break-words p-3 align-top text-amber-700 [overflow-wrap:anywhere]">Resolution required</td>
                        <td className="break-words p-3 align-top text-muted-foreground [overflow-wrap:anywhere]">
                          Reload spaces to retrieve the conflicting booking details.
                        </td>
                      </tr>
                    );
                  }
                  const booking = row.booking;
                  const mutable = Boolean(
                    booking.booking_date && booking.booking_date > today(),
                  );
                  return (
                    <tr key={booking.booking_id} className="border-t">
                      <td className="break-words p-3 align-top font-semibold [overflow-wrap:anywhere]">{booking.seat_code}</td>
                      <td className="break-words p-3 align-top [overflow-wrap:anywhere]">{booking.booked_for_name}</td>
                      <td className="break-words p-3 align-top [overflow-wrap:anywhere]">{booking.booking_date}</td>
                      <td className="break-words p-3 align-top [overflow-wrap:anywhere]">
                        {mutable ? (
                          <button className="text-red-600" onClick={() => void cancel(booking)}>
                            Cancel
                          </button>
                        ) : (
                          <span className="text-muted-foreground">Not mutable today</span>
                        )}
                      </td>
                      <td className="break-words p-3 align-top [overflow-wrap:anywhere]">
                        {mutable ? (
                          alternatives(booking).map((seat) => (
                            <button
                              key={seat.seat_id}
                              className="mr-2 rounded-md border border-border px-2 py-1 text-primary hover:bg-primary/10"
                              onClick={() => void move(booking, seat)}
                            >
                              Move to {seat.seat_code}
                            </button>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            Existing booking rules allow changes only for future dates.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {conflictingRows.length > CONFLICT_PAGE_SIZE && (
              <footer className="flex flex-col gap-3 border-t border-[#EBEBF5] px-4 py-3 text-[12px] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {(conflictPage - 1) * CONFLICT_PAGE_SIZE + 1} to{" "}
                  {Math.min(conflictPage * CONFLICT_PAGE_SIZE, conflictingRows.length)} of{" "}
                  {conflictingRows.length} entries
                </span>
                <div className="flex items-center gap-2 self-center sm:self-auto">
                  <button
                    type="button"
                    aria-label="Previous conflict page"
                    disabled={conflictPage <= 1}
                    onClick={() => setConflictPage((page) => page - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600">
                    {conflictPage}
                  </span>
                  <button
                    type="button"
                    aria-label="Next conflict page"
                    disabled={conflictPage >= conflictTotalPages}
                    onClick={() => setConflictPage((page) => page + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </footer>
            )}
          </section>
        )}
        {!!selected.length && (
          <footer className="sticky bottom-0 flex flex-col gap-3 rounded-xl border border-[#EBEBF5] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p
              className={
                unresolvedConflictCount
                  ? "text-sm text-amber-700"
                  : "text-sm text-emerald-700"
              }
            >
              {loading
                ? "Checking booking conflicts..."
                : unresolvedConflictCount
                ? `${unresolvedConflictCount} space conflict(s) must be resolved.`
                : `All conflicts resolved. ${selected.length} spaces are ready to block.`}
            </p>
            <button
              disabled={
                loading || !!unresolvedConflictCount || !reason.trim() || saving
              }
              onClick={() => void submit()}
              className="h-10 w-full rounded-lg bg-indigo-600 px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:text-[13px]"
            >
              Block {selected.length}{" "}
              {selected.length === 1 ? "Space" : "Spaces"}
            </button>
          </footer>
        )}
      </div>
    </main>
  );
}
