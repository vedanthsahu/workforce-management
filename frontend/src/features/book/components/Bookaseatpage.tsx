"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  DoorClosed,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useBookingForm } from "../hooks/Usebookingform";
import { SvgFloorMapPage, SeatWithSvgId } from "./SvgFloorMapPage";
import { fmtDate } from "../utils/bookingFormHelpers";
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";
import { BookaSeatSkeleton } from "./BookaSeatSkeleton";
import { BookingSidebar } from "./BookingSidebar";
import {
  BOOKING_SPACE_TYPES,
  BOOKING_SPACE_TYPE_COLORS,
  BOOKING_SPACE_TYPE_LABELS,
  BOOKING_SPACE_TYPE_SUBLABELS,
  type BookingSpaceType,
} from "../utils/spaceType";

const BOOKING_SPACE_TYPE_ICONS: Record<BookingSpaceType, React.ElementType> = {
  SEAT: Armchair,
  CABIN: DoorClosed,
  CONFERENCE_ROOM: Users,
};

// ── Step indicator ────────────────────────────────────────────────────────────

interface StepDotProps {
  number: number;
  label: string;
  sublabel: string;
  active: boolean;
  done: boolean;
}

const StepDot: React.FC<StepDotProps> = ({ number, label, sublabel, active, done }) => (
  <div className="flex items-center gap-2 sm:gap-3">
    <div
      className={cn(
        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 transition-colors",
        done || active
          ? "bg-indigo-600 text-white"
          : "border-2 border-gray-300 text-gray-400 bg-white"
      )}
    >
      {done ? <CheckCircle2 size={14} /> : number}
    </div>
    <div className="hidden sm:block">
      <p className={cn("text-[12px] sm:text-[13px] font-semibold leading-tight", active ? "text-[#1A1A2E]" : "text-gray-400")}>
        {label}
      </p>
      <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight mt-0.5 hidden md:block">{sublabel}</p>
    </div>
  </div>
);

const StepArrow = () => <ChevronRight size={14} className="text-gray-300 shrink-0" />;

// ── Card header ───────────────────────────────────────────────────────────────

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
      <span className="text-indigo-600">{icon}</span>
    </div>
    <div>
      <p className="text-[14px] sm:text-[15px] font-bold text-[#1A1A2E]">{title}</p>
      <p className="text-[11.5px] sm:text-[12px] text-gray-400">{subtitle}</p>
    </div>
  </div>
);

// ── Date input ────────────────────────────────────────────────────────────────

const DateInput: React.FC<{
  label: string;
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, min, max, disabled, onChange }) => (
  <div className="flex-1 min-w-0">
    <p className="text-[11px] font-medium text-gray-500 mb-1.5">{label}</p>
    <div className="relative">
      <CalendarDays
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.preventDefault()}
        className={cn(
          "w-full h-9 sm:h-10 pl-8 pr-2 sm:pr-3 rounded-lg border border-[#EBEBF5] bg-white",
          "text-[12px] sm:text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
          disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "cursor-pointer"
        )}
      />
    </div>
  </div>
);

// ── Preferences grouping ─────────────────────────────────────────────────────

// Groups preferences by category, preserving the order categories first
// appear in (the API already returns them sorted by category name, so this
// just clusters consecutive same-category items rather than re-sorting).
// Un-categorized preferences fall under "Other".
function groupPreferencesByCategory<T extends { category?: string | null }>(
  preferences: T[]
): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const pref of preferences) {
    const category = pref.category?.trim() || "Other";
    const existing = groups.get(category);
    if (existing) {
      existing.push(pref);
    } else {
      groups.set(category, [pref]);
    }
  }
  return Array.from(groups.entries());
}

// ── Page ──────────────────────────────────────────────────────────────────────

const BookASeatPage: React.FC = () => {
  const {
    step,
    form,
    sites,
    inactiveSiteId,
    buildings,
    floors,
    seats,
    confirmation,
    error,
    setError,
    loadingSites,
    loadingBuildings,
    loadingFloors,
    loadingSeats,
    submitting,
    selectedSite,
    selectedBuilding,
    selectedFloor,
    selectedSeat,
    dayCount,
    step1Valid,
    hasBookingChanges,
    maxBookableDate,
    isModifyMode,
    isAdminFlow,
    isBookingForSomeone,
    isGuestBooking,
    bookingForName,
    prefillSeatLabel,
    floorLayoutUrl,
    setSiteId,
    setBuildingId,
    setFloorId,
    setFromDate,
    setToDate,
    togglePreference,
    clearAll,
    setSpaceType,
    findAvailableSeats,
    selectSeat,
    goToReview,
    confirmBooking,
    goBack,
    resetForm,
    availablePreferences,
    visiblePreferences,
    loadingPreferences,
  } = useBookingForm();

  // Preferences stays hidden until the admin/user actually picks a space
  // type -- except in modify mode, where form.spaceType already reflects
  // the existing booking's real type, so there's nothing to wait on.
  const [spaceTypeChosen, setSpaceTypeChosen] = useState(isModifyMode);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesSearch, setPreferencesSearch] = useState("");

  const filteredPreferences = useMemo(() => {
    const query = preferencesSearch.trim().toLowerCase();
    if (!query) return visiblePreferences;
    return visiblePreferences.filter((p) => p.name.toLowerCase().includes(query));
  }, [visiblePreferences, preferencesSearch]);

  const selectedPreferences = useMemo(
    () => visiblePreferences.filter((p) => form.preferences.includes(p.key)),
    [visiblePreferences, form.preferences]
  );

  const errorBannerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error) {
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error]);

  const todayIso = new Date().toISOString().slice(0, 10);

  // A native <select> falls back to displaying its FIRST option whenever
  // the bound `value` doesn't match any <option> currently rendered. When a
  // saved preference/prefill sets `form.siteId` to an office not yet in
  // `sites` (fetchSites only returns ACTIVE ones), there's an unavoidable
  // gap before the hook can inject either a synthetic placeholder or the
  // inactive-office entry for it — usually just a render or two, but the
  // hook's own inactive-status check is a real network round-trip, making
  // that gap long enough to visibly flash an unrelated office (whatever
  // happened to be sites[0]) before settling on the real one. Deriving the
  // rendered option list here guarantees a matching (neutral, unnamed)
  // option exists the *instant* form.siteId changes, closing that gap
  // regardless of how long the hook's own resolution takes.
  const officeOptions = React.useMemo(() => {
    if (!form.siteId || sites.some((s) => s.id === form.siteId)) return sites;
    return [...sites, { id: form.siteId, name: "…", city: "", country: "", timezone: "" }];
  }, [sites, form.siteId]);

  const seatsWithSvgId = seats as unknown as SeatWithSvgId[];

  const showHeaderAction = step !== 3;

  // The "Tomorrow" / "Quick picks" sidebar is all self-booking data (the
  // logged-in user's own favourites and future bookings) — hidden for
  // modify, book-for-someone and guest flows, where it wouldn't be meaningful.
  const showSidebar = !isModifyMode && !isBookingForSomeone;

  if (loadingSites && sites.length === 0) {
    return (
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 flex flex-col gap-4 sm:gap-5">
          <BookaSeatSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 flex flex-col gap-4 sm:gap-5">

        <div className="flex justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-[17px] sm:text-[20px] font-bold text-[#1A1A2E] leading-tight">
              {isModifyMode
                ? (isBookingForSomeone && bookingForName ? `Modify Booking for ${bookingForName}` : "Modify Booking")
                : isBookingForSomeone ? `Book a Space for ${bookingForName}` : "Book a Space"}
            </h1>
            <p className="text-[11.5px] sm:text-[12.5px] text-gray-400 mt-0.5">
              {isModifyMode
                ? "Select a new space to replace your existing booking"
                : isBookingForSomeone
                  ? `Selecting a workspace for ${isGuestBooking ? "guest" : "employee"} — ${bookingForName}`
                  : "Reserve your workspace in a few steps"}
            </p>
          </div>

          {showHeaderAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="h-8 gap-1.5 text-[12px] sm:text-[12.5px] text-gray-600 shrink-0"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">
                {isModifyMode ? "Cancel modify" : "Start over"}
              </span>
              <span className="sm:hidden">
                {isModifyMode ? "Cancel" : "Reset"}
              </span>
            </Button>
          )}
        </div>


      </div>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4">

        {/* ── Step indicator ── */}
        {step === 1 && (
          <div className="flex items-center justify-between sm:justify-start sm:gap-3 bg-white border border-[#EBEBF5] rounded-xl px-4 sm:px-6 py-3 sm:py-4">
            <StepDot number={1} label="Workspace & Preferences" sublabel="Select your workspace, dates and preferences" active={step === 1} done={false} />
            <StepArrow />
            <StepDot number={2} label="Select a Space" sublabel="Choose your preferred space on the floor map" active={false} done={false} />
            <StepArrow />
            <StepDot number={3} label="Review & Confirm" sublabel="Review your booking and confirm" active={false} done={false} />
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div
            ref={errorBannerRef}
            className="bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-3 text-red-500 text-[12.5px] sm:text-[13px] flex items-center justify-between gap-3"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 1 – Workspace & Preferences
        ════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className={cn("grid grid-cols-1 gap-3 sm:gap-4", showSidebar && "lg:grid-cols-[1fr_336px] lg:items-start")}>
          <div className="flex flex-col gap-3 sm:gap-4 min-w-0">

          <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
            <CardHeader
              icon={<MapPin size={18} />}
              title="Where & when"
              subtitle="Choose your workplace and booking dates"
            />

            {/* Select Workspace */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Office</p>
                  <select
                    value={form.siteId ?? ""}
                    onChange={(e) => setSiteId(e.target.value || null)}
                    disabled={loadingSites}
                    className="w-full h-9 sm:h-10 px-4 border border-gray-200 rounded-lg text-[12.5px] sm:text-[13px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {/* No `hidden` here (just `disabled`) — with `value=""`
                        this is what the select is actually supposed to
                        match and display while nothing real is chosen yet
                        (still loading, or a saved preference hasn't
                        resolved). Some browsers mishandle a *hidden*
                        selected option when it's the first child of the
                        select, falling back to silently displaying whatever
                        real office happens to be first in the fetched list
                        instead — which is exactly what made the field
                        flash an unrelated, wrong office name before
                        settling on the real (possibly inactive) one. */}
                    <option value="" disabled>{loadingSites ? "Loading…" : "Select office"}</option>
                    {officeOptions.map((s) => (
                      // An inactive office stays as the current value (so the
                      // field still shows its name, matching the "this
                      // office is inactive" message above it) but is hidden
                      // from the dropdown's own list of choices — `hidden`
                      // on the currently-selected <option> keeps it out of
                      // the opened list while a <select> still displays a
                      // hidden option's label as its current value.
                      <option
                        key={s.id}
                        value={s.id}
                        hidden={s.id === inactiveSiteId}
                        style={{ color: '#111827' }}
                      >
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Building</p>
                  <select
                    value={form.buildingId ?? ""}
                    onChange={(e) => setBuildingId(e.target.value || null)}
                    disabled={!form.siteId || loadingBuildings}
                    className="w-full h-9 sm:h-10 px-4 border border-gray-200 rounded-lg text-[12.5px] sm:text-[13px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled hidden>{loadingBuildings ? "Loading…" : "Select building"}</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id} style={{ color: '#111827' }}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Floor</p>
                  <select
                    value={form.floorId ?? ""}
                    onChange={(e) => setFloorId(e.target.value || null)}
                    disabled={!form.buildingId || loadingFloors}
                    className="w-full h-9 sm:h-10 px-4 border border-gray-200 rounded-lg text-[12.5px] sm:text-[13px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled hidden>{loadingFloors ? "Loading…" : "Select floor"}</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id} style={{ color: '#111827' }}>{f.name}</option>
                    ))}
                  </select>
                </div>

              </div>
            </section>

            {/* Select Dates */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12.5px] font-semibold text-[#1A1A2E]">Dates</p>
                {isModifyMode && (
                  <p className="text-[11px] text-gray-400">Pre-filled from your original booking</p>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-end">

                <div className="flex gap-2 sm:gap-3 flex-1 items-center">
                  <DateInput label="From" value={form.fromDate} min={todayIso} max={maxBookableDate} onChange={setFromDate} />
                  <ChevronRight size={14} className="text-gray-300 shrink-0 mt-5" />
                  <DateInput label="To" value={form.toDate} min={form.fromDate} max={maxBookableDate} onChange={setToDate} />
                </div>

                {dayCount > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 sm:px-5 py-3 md:min-w-[200px] lg:min-w-[220px]">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays size={13} className="text-indigo-500" />
                      <span className="text-[12.5px] sm:text-[13px] font-semibold text-indigo-700">
                        {isModifyMode ? fmtDate(form.fromDate) : `${dayCount} ${dayCount === 1 ? "day" : "days"} selected`}
                      </span>
                    </div>
                    {!isModifyMode && (
                      <>
                        <p className="text-[11px] sm:text-[11.5px] text-indigo-500">
                          {fmtDate(form.fromDate)} – {fmtDate(form.toDate)}
                        </p>
                        <p className="text-[10.5px] sm:text-[11px] text-indigo-400 mt-1">
                          You will be able to select a space for all days in the next step.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
            <CardHeader
              icon={<Settings2 size={18} />}
              title="Your space, your preferences"
              subtitle="Choose a space type, then add the amenities you prefer"
            />

            <section>
              {/* Space type — narrows both the amenity list below and the
                  actual search. Preferences stays hidden (see
                  spaceTypeChosen) until one of these is picked. */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                {BOOKING_SPACE_TYPES.map((t) => {
                  const active = spaceTypeChosen && form.spaceType === t;
                  const Icon = BOOKING_SPACE_TYPE_ICONS[t];
                  const { color, tint } = BOOKING_SPACE_TYPE_COLORS[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSpaceType(t);
                        setSpaceTypeChosen(true);
                      }}
                      className="flex-1 min-w-[130px] flex flex-col items-center gap-2 px-4 py-4 sm:py-5 rounded-xl border-2 transition-colors hover:shadow-sm"
                      style={{
                        borderColor: active ? color : "#EBEBF5",
                        backgroundColor: active ? tint : "#fff",
                      }}
                    >
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: tint, color }}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        className="text-[13px] sm:text-[14px] font-semibold"
                        style={{ color: active ? color : "#1A1A2E" }}
                      >
                        {BOOKING_SPACE_TYPE_LABELS[t]}
                      </span>
                      <span className="text-[11px] text-gray-400">{BOOKING_SPACE_TYPE_SUBLABELS[t]}</span>
                    </button>
                  );
                })}
              </div>

              {spaceTypeChosen && (
              <>
              <Popover
                open={preferencesOpen}
                onOpenChange={(next) => {
                  setPreferencesOpen(next);
                  if (!next) setPreferencesSearch("");
                }}
              >
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <div className="w-full h-11 px-3.5 flex items-center justify-between gap-2 bg-white border border-[#EBEBF5] rounded-xl text-[12.5px] cursor-pointer hover:border-gray-300 transition-colors">
                      <span className="flex items-center gap-2 text-[#1A1A2E] font-medium">
                        <Settings2 size={14} className="text-gray-400" />
                        Preferences
                        <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <ChevronDown
                        size={15}
                        className={cn("text-gray-400 transition-transform", preferencesOpen && "rotate-180")}
                      />
                    </div>
                  }
                />

                {selectedPreferences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5">
                    {selectedPreferences.map(({ key, name }) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-[11.5px] sm:text-[12px] font-medium"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => togglePreference(key)}
                          aria-label={`Remove ${name}`}
                          className="p-0.5 rounded-full hover:bg-indigo-100"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <PopoverContent
                  align="start"
                  side="bottom"
                  collisionAvoidance={{ side: "none" }}
                  className="w-(--anchor-width) p-0 gap-0 rounded-xl border border-[#EBEBF5] bg-white shadow-md ring-0 overflow-hidden flex flex-col"
                >
                  <div className="px-3 py-2.5 border-b border-[#EBEBF5] shrink-0">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        autoFocus
                        value={preferencesSearch}
                        onChange={(e) => setPreferencesSearch(e.target.value)}
                        placeholder="Search amenities"
                        className="w-full h-9 pl-8 pr-3 rounded-lg bg-gray-50 border-0 text-[12.5px] text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  <div className="max-h-64 min-h-0 overflow-y-auto scrollbar-thin px-2 py-2">
                    {loadingPreferences ? (
                      <p className="text-[12.5px] text-gray-400 px-2 py-3">Loading preferences…</p>
                    ) : filteredPreferences.length === 0 ? (
                      <p className="text-[12.5px] text-gray-400 px-2 py-3">
                        {visiblePreferences.length === 0
                          ? "No preferences available for this space type."
                          : "No amenities match your search."}
                      </p>
                    ) : (
                      groupPreferencesByCategory(filteredPreferences).map(([category, prefs]) => (
                        <div key={category} className="mb-1 last:mb-0">
                          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {category}
                          </p>
                          {prefs.map(({ key, name, category: prefCategory }) => {
                            const checked = form.preferences.includes(key);
                            const color = getAmenityColor(name, prefCategory);
                            return (
                              <label
                                key={key}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12.5px] text-[#1A1A2E] cursor-pointer hover:bg-gray-50"
                              >
                                <Checkbox checked={checked} onCheckedChange={() => togglePreference(key)} />
                                <color.icon size={14} className="text-gray-400 shrink-0" />
                                {name}
                              </label>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#EBEBF5] shrink-0">
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={form.preferences.length === 0}
                      className="text-[12px] font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferencesOpen(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700"
                    >
                      Done{form.preferences.length > 0 ? ` · ${form.preferences.length} selected` : ""}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="mt-2.5 sm:mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 sm:px-4 py-3 flex items-start gap-1.5">
                <span className="text-base">💡</span>
                <div>
                  <span className="text-[11.5px] sm:text-[12px] font-semibold text-amber-700">Tip </span>
                  <span className="text-[11px] sm:text-[11.5px] text-amber-600 leading-relaxed">
                    Selecting more preferences helps us show spaces that match your needs better.
                  </span>
                </div>
              </div>
              </>
              )}
            </section>
          </div>

            {/* Actions */}
            <div className="flex justify-end items-center">
              <Button
                onClick={findAvailableSeats}
                disabled={!step1Valid || loadingSeats}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 gap-2 text-[12.5px] sm:text-[13px] font-semibold"
              >
                {loadingSeats ? "Finding spaces…" : "Find Available Spaces"}
                {!loadingSeats && <ChevronRight size={14} />}
              </Button>
            </div>

            <div className="bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl px-4 sm:px-5 py-3 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-indigo-600 text-[10px] font-bold">i</span>
              </div>
              <div>
                <p className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E]">What happens next?</p>
                <p className="text-[11.5px] sm:text-[12px] text-gray-400 mt-0.5">
                  {isModifyMode
                    ? "You'll see the floor map to pick your new space. Once you confirm, your original booking will be cancelled and the new one created."
                    : "You'll be taken to the floor map to view and select your preferred space based on availability and your preferences."}
                </p>
              </div>
            </div>

          </div>

          {showSidebar && <BookingSidebar fromDate={form.fromDate} toDate={form.toDate} />}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 2 – Select a Space (SVG Floor Map)
        ════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-3 sm:p-6 flex flex-col gap-4 sm:gap-5">
            <SvgFloorMapPage
              seats={seatsWithSvgId}
              selectedSeatId={form.selectedSeatId}
              onSeatSelect={selectSeat}
              loading={loadingSeats}
              svgUrl={floorLayoutUrl}
              siteName={selectedSite?.name}
              buildingName={selectedBuilding?.name}
              floorName={selectedFloor?.name}
              preferences={availablePreferences}
            />

            <div className="flex flex-col items-end gap-1.5 pt-1 border-t border-[#EBEBF5]">
              <div className="w-full flex justify-between">
                <Button variant="outline" size="sm" onClick={goBack} className="text-[12.5px]">
                  ← Back
                </Button>
                <Button
                  onClick={goToReview}
                  disabled={!form.selectedSeatId || (isModifyMode && !hasBookingChanges)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 gap-2 text-[12.5px] sm:text-[13px] font-semibold"
                >
                  Review Booking <ChevronRight size={14} />
                </Button>
              </div>
              {isModifyMode && form.selectedSeatId && !hasBookingChanges && (
                <p className="text-[11.5px] text-amber-600">
                  Select a different space, date, or location to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 3 – Review & Confirm
        ════════════════════════════════════════════════════ */}
        {step === 3 && !confirmation && (
          <div className="flex justify-center">
            <div className="bg-white border border-[#EBEBF5] rounded-2xl overflow-hidden w-full max-w-3xl shadow-sm">

              {/* Header strip */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <ClipboardCheck size={22} />
                  <div>
                    <p className="text-[16px] font-bold">Review & Confirm</p>
                    <p className="text-[12px] text-indigo-100 mt-0.5">
                      {isModifyMode
                        ? "Confirm to replace your original booking"
                        : "Please review your booking details"}
                    </p>
                  </div>
                </div>
                {isBookingForSomeone && bookingForName && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/15 text-white">
                    <Users size={11} />
                    Booking for {bookingForName}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 flex flex-col gap-3">
                {/* Summary rows — single clean list */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {isBookingForSomeone && bookingForName && (
                    <div className="flex justify-between items-center px-4 py-3 bg-indigo-50/50 border-b border-gray-100">
                      <span className="text-[12.5px] text-gray-500">Booking For</span>
                      <span className="text-[12.5px] font-semibold text-indigo-700">{bookingForName} ({isGuestBooking ? "Guest" : "Employee"})</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Location</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedSite?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Building</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedBuilding?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Floor</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedFloor?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Space</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedSeat?.label ?? prefillSeatLabel ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Date</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{fmtDate(form.fromDate)}</span>
                  </div>
                  {!isModifyMode && (
                    <>
                      <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-b border-gray-50">
                        <span className="text-[12.5px] text-gray-500">To</span>
                        <span className="text-[12.5px] font-semibold text-[#0f172a]">{fmtDate(form.toDate)}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3 bg-white">
                        <span className="text-[12.5px] text-gray-500">Duration</span>
                        <span className="text-[12.5px] font-semibold text-[#0f172a]">{dayCount} {dayCount === 1 ? "day" : "days"}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Info note */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <span className="text-blue-500 text-[11px] mt-0.5">ℹ️</span>
                  <p className="text-[12px] text-blue-600 leading-relaxed">
                    {isModifyMode
                      ? "This will cancel your original booking and create a new one."
                      : "A confirmation email will be sent. You can manage this booking from My Bookings."}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="w-full flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={goBack} className="text-[12.5px] h-10 px-5">
                      ← Back
                    </Button>
                    <Button
                      onClick={confirmBooking}
                      disabled={submitting || (isModifyMode && !hasBookingChanges)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-8 gap-2 text-[13px] font-semibold h-10"
                    >
                      {submitting
                        ? isModifyMode ? "Modifying…" : "Confirming…"
                        : isModifyMode ? "Confirm Modification" : "Confirm Booking"}
                      {!submitting && <ChevronRight size={14} />}
                    </Button>
                  </div>
                  {isModifyMode && !hasBookingChanges && (
                    <p className="text-[11.5px] text-amber-600">
                      Nothing has changed yet — go back and pick a different space, date, or location.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Confirmation success
        ════════════════════════════════════════════════════ */}
        {confirmation && (
          <div className="flex justify-center">
            <div className="bg-white border border-[#EBEBF5] rounded-2xl overflow-hidden w-full max-w-3xl shadow-sm">

              {/* Success header strip */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-6 text-white text-center">
                <div className="w-13 h-13 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={26} className="text-white" />
                </div>
                <p className="text-[18px] sm:text-[20px] font-bold">
                  {isModifyMode ? "Booking Modified!" : "Booking Confirmed!"}
                </p>
                <p className="text-[12px] text-indigo-100 mt-1">
                  {isModifyMode
                    ? "Your booking has been updated successfully."
                    : isBookingForSomeone && bookingForName
                      ? `A space has been reserved for ${bookingForName}.`
                      : "Your space has been reserved successfully."}
                </p>
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mt-3 text-[12px]">
                  <span className="text-indigo-100 font-medium">Booking ID</span>
                  <span className="font-bold font-mono">{confirmation.booking_id}</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex flex-col gap-4">
                {/* Summary rows */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {isBookingForSomeone && bookingForName && (
                    <div className="flex justify-between items-center px-4 py-2.5 bg-indigo-50/50 border-b border-gray-100">
                      <span className="text-[12.5px] text-gray-500">Booked For</span>
                      <span className="text-[12.5px] font-semibold text-indigo-700">{bookingForName} ({isGuestBooking ? "Guest" : "Employee"})</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Location</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.site_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Building</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.building_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Floor</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.floor_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Space</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.seat_code ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Date</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{fmtDate(confirmation.booking_date)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50">
                    <span className="text-[12.5px] text-gray-500">Status</span>
                    {(() => {
                      // is_modified/booking_status both come straight from the API (BookingResponse) —
                      // is_modified is derived server-side from modified_from_booking_id, never guessed here.
                      const rawLabel = confirmation.is_modified ? "Modified" : confirmation.booking_status;
                      const statusLabel = rawLabel.toUpperCase();
                      const isModifiedStatus = statusLabel === "MODIFIED";
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[12px] font-semibold",
                            isModifiedStatus ? "text-amber-700" : "text-emerald-700"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", isModifiedStatus ? "bg-amber-500" : "bg-emerald-500")} />
                          {statusLabel}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={isAdminFlow ? "/admin/bookings" : isBookingForSomeone ? "/mybookings?tab=bookedForSomeone" : "/mybookings"}
                    className="flex-1"
                  >
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold w-full h-11 gap-2">
                      {isAdminFlow && <ArrowLeft size={15} />}
                      {isAdminFlow ? "Back to Bookings" : "View My Bookings"}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 h-11 text-[13px] font-semibold text-gray-600"
                  >
                    Book Another Space
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </main>
  );
};

export default BookASeatPage;