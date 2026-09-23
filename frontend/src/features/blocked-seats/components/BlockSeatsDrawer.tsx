"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Info, Search, X } from "lucide-react";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type {
  BlockType,
  LocationOption,
  SeatOption,
} from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";

interface Props {
  open: boolean;
  sites: LocationOption[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}
const today = () => new Date().toLocaleDateString("en-CA");
export default function BlockSeatsDrawer({
  open,
  sites,
  onOpenChange,
  onCreated,
}: Props) {
  const [siteId, setSiteId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [buildings, setBuildings] = useState<LocationOption[]>([]);
  const [floors, setFloors] = useState<LocationOption[]>([]);
  const [availableSeats, setAvailableSeats] = useState<SeatOption[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SeatOption[]>([]);
  const [seatSearch, setSeatSearch] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("MAINTENANCE");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [reason, setReason] = useState("");
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const invalidDates = Boolean(from && to && to < from);
  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open]);
  useEffect(() => {
    setAvailableSeats([]);
    setSelectedSeats([]);
    if (!floorId || !from || !to || invalidDates) return;
    setLoadingSeats(true);
    blockedSeatsService
      .getSeats(floorId, from, to)
      .then(setAvailableSeats)
      .catch(() => setError("Unable to load spaces."))
      .finally(() => setLoadingSeats(false));
  }, [floorId, from, to, invalidDates]);
  const matchingSeats = useMemo(
    () =>
      availableSeats
        .filter(
          (seat) =>
            !selectedSeats.some(
              (selected) => selected.seat_id === seat.seat_id,
            ) &&
            seat.seat_code
              .toLowerCase()
              .includes(seatSearch.toLowerCase().trim()),
        )
        .slice(0, 8),
    [availableSeats, selectedSeats, seatSearch],
  );
  const bookedSeats = selectedSeats.filter((seat) => seat.hasBooking);
  const hasBookingConflict = bookedSeats.length > 0;
  const fieldClass =
    "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50";
  const selectSite = async (value: string) => {
    setSiteId(value);
    setBuildingId("");
    setFloorId("");
    setFloors([]);
    setSelectedSeats([]);
    setBuildings(value ? await blockedSeatsService.getBuildings(value) : []);
  };
  const selectBuilding = async (value: string) => {
    setBuildingId(value);
    setFloorId("");
    setSelectedSeats([]);
    setFloors(value ? await blockedSeatsService.getFloors(value) : []);
  };
  const submit = async () => {
    if (hasBookingConflict) {
      setError(
        `Space${bookedSeats.length === 1 ? "" : "s"} ${bookedSeats.map((seat) => seat.seat_code).join(", ")} ${bookedSeats.length === 1 ? "is" : "are"} already booked for the selected period. Modify or cancel the existing booking before blocking.`,
      );
      return;
    }
    if (
      !siteId ||
      !buildingId ||
      !floorId ||
      !selectedSeats.length ||
      !reason.trim() ||
      invalidDates
    ) {
      setError("Complete all required fields before blocking spaces.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await blockedSeatsService.create({
        seat_ids: selectedSeats.map((seat) => Number(seat.seat_id)),
        block_type: blockType,
        blocked_from: from,
        blocked_to: to,
        reason: reason.trim(),
      });
      onCreated();
      onOpenChange(false);
      setSelectedSeats([]);
      setReason("");
    } catch (requestError: unknown) {
      const responseData = (
        requestError as {
          response?: {
            data?: {
              error?: { message?: string };
              detail?: { message?: string };
            };
          };
        }
      )?.response?.data;
      setError(
        responseData?.error?.message ??
          responseData?.detail?.message ??
          "Unable to block the selected spaces.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  if (!open) return null;
  return (
    <>
      <button
        aria-label="Close drawer overlay"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-50 cursor-default bg-black/20 backdrop-blur-[1px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-seats-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full animate-in slide-in-from-right flex-col bg-white shadow-xl sm:max-w-[390px]"
      >
        <header className="border-b px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="block-seats-title"
                className="text-lg font-bold text-slate-900"
              >
                Block Spaces
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Block spaces that will be unavailable for booking.
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close drawer"
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-xs font-semibold text-slate-800">
            Office <span className="text-red-500">*</span>
            <select
              className={`${fieldClass} mt-1.5`}
              value={siteId}
              onChange={(e) => void selectSite(e.target.value)}
            >
              <option value="">Select office</option>
              {sites.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-800">
            Building <span className="text-red-500">*</span>
            <select
              className={`${fieldClass} mt-1.5`}
              value={buildingId}
              disabled={!siteId}
              onChange={(e) => void selectBuilding(e.target.value)}
            >
              <option value="">Select building</option>
              {buildings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-800">
            Floor <span className="text-red-500">*</span>
            <select
              className={`${fieldClass} mt-1.5`}
              value={floorId}
              disabled={!buildingId}
              onChange={(e) => setFloorId(e.target.value)}
            >
              <option value="">Select floor</option>
              {floors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-800">
            Select spaces <span className="text-red-500">*</span>
            <div className="relative mt-1.5">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                className={`${fieldClass} pl-9`}
                value={seatSearch}
                disabled={!floorId || invalidDates}
                onChange={(e) => setSeatSearch(e.target.value)}
                placeholder={loadingSeats ? "Loading spaces…" : "Search space ID"}
              />
            </div>
          </label>
          {seatSearch && matchingSeats.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-white p-1">
              {matchingSeats.map((seat) => (
                <button
                  type="button"
                  key={seat.seat_id}
                  disabled={!seat.selectable}
                  onClick={() => {
                    setSelectedSeats((current) => [...current, seat]);
                    setSeatSearch("");
                    setError("");
                  }}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-violet-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <span>{seat.seat_code}</span>
                  {seat.hasBooking ? (
                    <span className="font-medium text-amber-600">Booked</span>
                  ) : seat.hasBlock ? (
                    <span>Already blocked</span>
                  ) : seat.isUnavailable ? (
                    <span>Unavailable</span>
                  ) : (
                    <span className="text-emerald-600">Available</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map((seat) => (
              <button
                key={seat.seat_id}
                onClick={() =>
                  setSelectedSeats(
                    selectedSeats.filter(
                      (value) => value.seat_id !== seat.seat_id,
                    ),
                  )
                }
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700"
              >
                {seat.seat_code}
                <X size={12} />
              </button>
            ))}
          </div>
          <label className="block text-xs font-semibold text-slate-800">
            Block type <span className="text-red-500">*</span>
            <select
              className={`${fieldClass} mt-1.5`}
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as BlockType)}
            >
              {BLOCK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Blocked from", from, setFrom],
              ["Blocked to", to, setTo],
            ].map(([label, value, setter]) => (
              <label
                key={label as string}
                className="block text-xs font-semibold text-slate-800"
              >
                {label as string} <span className="text-red-500">*</span>
                <div className="relative mt-1.5">
                  <CalendarDays
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={15}
                  />
                  <input
                    type="date"
                    value={value as string}
                    onChange={(e) =>
                      (setter as React.Dispatch<React.SetStateAction<string>>)(
                        e.target.value,
                      )
                    }
                    className={`${fieldClass} pl-9 text-xs`}
                  />
                </div>
              </label>
            ))}
          </div>
          {invalidDates && (
            <p className="text-xs font-medium text-red-500">
              Blocked To must be on or after Blocked From.
            </p>
          )}
          <label className="block text-xs font-semibold text-slate-800">
            Reason <span className="text-red-500">*</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 min-h-20 w-full resize-none rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          {hasBookingConflict && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              Space{bookedSeats.length === 1 ? "" : "s"}{" "}
              {bookedSeats.map((seat) => seat.seat_code).join(", ")}{" "}
              {bookedSeats.length === 1 ? "has" : "have"} an existing booking
              during this period. Modify or cancel the booking before blocking.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-700">
            <Info size={16} className="shrink-0" />
            <span>Selected spaces cannot be booked during this period.</span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-3 border-t p-5">
          <button
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-md border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={
              submitting ||
              !selectedSeats.length ||
              invalidDates ||
              hasBookingConflict
            }
            className="h-10 rounded-md bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
          >
            {submitting
              ? "Blocking…"
              : `Block ${selectedSeats.length} ${selectedSeats.length === 1 ? "Space" : "Spaces"}`}
          </button>
        </div>
      </aside>
    </>
  );
}
