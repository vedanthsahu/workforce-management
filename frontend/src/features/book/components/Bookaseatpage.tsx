"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  RefreshCw,
  Settings2,
  Users,
  X,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { useBookingForm } from "../hooks/Usebookingform";
import { SvgFloorMapPage, SeatWithSvgId } from "./SvgFloorMapPage";
import { fmtDate, getPreferenceIcon } from "../utils/bookingFormHelpers";
import { BookaSeatSkeleton } from "./BookaSeatSkeleton";

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

// ── Section header ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="flex items-center gap-3 mb-4 sm:mb-5">
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-[13px] sm:text-[14px] font-bold text-[#1A1A2E] leading-tight">{title}</p>
      <p className="text-[11px] sm:text-[12px] text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

// ── Summary row ───────────────────────────────────────────────────────────────

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2.5 sm:py-3 border-b border-[#EBEBF5] last:border-0 gap-4">
    <span className="text-[12px] sm:text-[12.5px] text-gray-500 shrink-0">{label}</span>
    <span className="text-[12px] sm:text-[13px] font-semibold text-[#1A1A2E] text-right">{value}</span>
  </div>
);

// ── Review section header ─────────────────────────────────────────────────────

const ReviewSectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
      {icon}
    </div>
    <div>
      <p className="text-[13px] font-semibold text-[#1A1A2E] leading-tight">{title}</p>
      <p className="text-[11.5px] text-gray-400">{subtitle}</p>
    </div>
  </div>
);

// ── Date input ────────────────────────────────────────────────────────────────

const DateInput: React.FC<{
  label: string;
  value: string;
  min?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, min, disabled, onChange }) => (
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
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-9 sm:h-10 pl-8 pr-2 sm:pr-3 rounded-lg border border-[#EBEBF5] bg-white",
          "text-[12px] sm:text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
          disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "cursor-pointer"
        )}
      />
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const BookASeatPage: React.FC = () => {
  const {
    step,
    form,
    sites,
    buildings,
    floors,
    seats,
    confirmation,
    error,
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
    isModifyMode,
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
    findAvailableSeats,
    selectSeat,
    goToReview,
    confirmBooking,
    goBack,
    resetForm,
    availablePreferences,
    loadingPreferences,
  } = useBookingForm();

  const errorBannerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error) {
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const seatsWithSvgId = seats as unknown as SeatWithSvgId[];

  const showHeaderAction = step !== 3;

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
                : isBookingForSomeone ? `Book a Seat for ${bookingForName}` : "Book a Seat"}
            </h1>
            <p className="text-[11.5px] sm:text-[12.5px] text-gray-400 mt-0.5">
              {isModifyMode
                ? "Select a new seat to replace your existing booking"
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

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">

        {/* ── Step indicator ── */}
        {step === 1 && (
          <div className="flex items-center justify-between sm:justify-start sm:gap-3 bg-white border border-[#EBEBF5] rounded-xl px-4 sm:px-6 py-3 sm:py-4">
            <StepDot number={1} label="Workspace & Preferences" sublabel="Select your workspace, dates and preferences" active={step === 1} done={false} />
            <StepArrow />
            <StepDot number={2} label="Select a Seat" sublabel="Choose your preferred seat on the floor map" active={false} done={false} />
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
            <button onClick={() => { }} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 1 – Workspace & Preferences
        ════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-5 sm:gap-7">

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-[14px] sm:text-[15px] font-bold text-[#1A1A2E]">Workspace & Preferences</p>
                <p className="text-[11.5px] sm:text-[12px] text-gray-400">Tell us where and when you plan to work</p>
              </div>
            </div>

            <Separator />

            {/* 1. Select Workspace */}
            <section>
              <SectionHeader icon={<Building2 size={14} />} title="1. Select Workspace" subtitle="Choose your office location, building and floor" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Site (Office Location)</p>
                  <select
                    value={form.siteId ?? ""}
                    onChange={(e) => setSiteId(e.target.value || null)}
                    disabled={loadingSites}
                    className="w-full h-9 sm:h-10 px-4 border border-gray-200 rounded-lg text-[12.5px] sm:text-[13px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled hidden>{loadingSites ? "Loading…" : "Select site"}</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id} style={{ color: '#111827' }}>{s.name}</option>
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

            {/* 2. Select Dates */}
            <section>
              <SectionHeader
                icon={<CalendarDays size={14} />}
                title="2. Select Dates"
                subtitle={
                  isModifyMode
                    ? "Date is pre-filled from your original booking — you can change it if needed"
                    : "Choose the dates you'll be coming to the office"
                }
              />
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-end">

                <div className="flex gap-2 sm:gap-3 flex-1 items-center">
                  <DateInput label="From" value={form.fromDate} min={todayIso} onChange={setFromDate} />
                  <ChevronRight size={14} className="text-gray-300 shrink-0 mt-5" />
                  <DateInput label="To" value={form.toDate} min={form.fromDate} onChange={setToDate} />
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
                          You will be able to select a seat for all days in the next step.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 3. Preferences */}
            <section>
              <SectionHeader icon={<Settings2 size={14} />} title="3. Preferences" subtitle="Choose features that are important to you" />
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {loadingPreferences ? (
                  <p className="text-[12.5px] text-gray-400">Loading preferences…</p>
                ) : (
                  availablePreferences.map(({ key, name }) => {
                    const checked = form.preferences.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => togglePreference(key)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-4 rounded-xl border transition-all duration-150",
                          "w-[calc(50%-4px)] sm:w-[130px] lg:w-[140px]",
                          checked
                            ? "border-indigo-300 bg-indigo-50 shadow-sm"
                            : "border-[#EBEBF5] bg-white hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {getPreferenceIcon(key)}
                        <span className="text-[11.5px] sm:text-[12.5px] font-medium text-[#1A1A2E] text-center">{name}</span>
                        <Checkbox checked={checked} onCheckedChange={() => togglePreference(key)} className="pointer-events-none" />
                      </button>
                    );
                  })
                )}

                <div className="flex-1 min-w-[160px] bg-amber-50 border border-amber-100 rounded-xl px-3 sm:px-4 py-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">💡</span>
                    <span className="text-[11.5px] sm:text-[12px] font-semibold text-amber-700">Tip</span>
                  </div>
                  <p className="text-[11px] sm:text-[11.5px] text-amber-600 leading-relaxed">
                    Selecting more preferences helps us show seats that match your needs better.
                  </p>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end items-center pt-1 border-t border-[#EBEBF5]">
              <Button
                onClick={findAvailableSeats}
                disabled={!step1Valid || loadingSeats}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 gap-2 text-[12.5px] sm:text-[13px] font-semibold"
              >
                {loadingSeats ? "Finding seats…" : "Find Available Seats"}
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
                    ? "You'll see the floor map to pick your new seat. Once you confirm, your original booking will be cancelled and the new one created."
                    : "You'll be taken to the floor map to view and select your preferred seats based on availability and your preferences."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 2 – Select a Seat (SVG Floor Map)
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
            />

            <div className="flex justify-between pt-1 border-t border-[#EBEBF5]">
              <Button variant="outline" size="sm" onClick={goBack} className="text-[12.5px]">
                ← Back
              </Button>
              <Button
                onClick={goToReview}
                disabled={!form.selectedSeatId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 gap-2 text-[12.5px] sm:text-[13px] font-semibold"
              >
                Review Booking <ChevronRight size={14} />
              </Button>
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

              <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* Summary rows — single clean list */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {isBookingForSomeone && bookingForName && (
                    <div className="flex justify-between items-center px-4 py-3 bg-indigo-50/50 border-b border-gray-100">
                      <span className="text-[12.5px] text-gray-500">Booking For</span>
                      <span className="text-[12.5px] font-semibold text-indigo-700">{bookingForName} ({isGuestBooking ? "Guest" : "Employee"})</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Location</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedSite?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Building</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedBuilding?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Floor</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedFloor?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Seat</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{selectedSeat?.label ?? prefillSeatLabel ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
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
                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm" onClick={goBack} className="text-[12.5px] h-10 px-5">
                    ← Back
                  </Button>
                  <Button
                    onClick={confirmBooking}
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-8 gap-2 text-[13px] font-semibold h-10"
                  >
                    {submitting
                      ? isModifyMode ? "Modifying…" : "Confirming…"
                      : isModifyMode ? "Confirm Modification" : "Confirm Booking"}
                    {!submitting && <ChevronRight size={14} />}
                  </Button>
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
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={30} className="text-white" />
                </div>
                <p className="text-[18px] sm:text-[20px] font-bold">
                  {isModifyMode ? "Booking Modified!" : "Booking Confirmed!"}
                </p>
                <p className="text-[12px] text-indigo-100 mt-1">
                  {isModifyMode
                    ? "Your booking has been updated successfully."
                    : isBookingForSomeone && bookingForName
                      ? `A seat has been reserved for ${bookingForName}.`
                      : "Your seat has been reserved successfully."}
                </p>
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mt-3 text-[12px]">
                  <span className="text-indigo-100 font-medium">Booking ID</span>
                  <span className="font-bold font-mono">{confirmation.booking_id}</span>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* Summary rows */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {isBookingForSomeone && bookingForName && (
                    <div className="flex justify-between items-center px-4 py-3 bg-indigo-50/50 border-b border-gray-100">
                      <span className="text-[12.5px] text-gray-500">Booked For</span>
                      <span className="text-[12.5px] font-semibold text-indigo-700">{bookingForName} ({isGuestBooking ? "Guest" : "Employee"})</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Location</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.site_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Building</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.building_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Floor</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.floor_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Seat</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{confirmation.seat_code ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-50">
                    <span className="text-[12.5px] text-gray-500">Date</span>
                    <span className="text-[12.5px] font-semibold text-[#0f172a]">{fmtDate(confirmation.booking_date)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50">
                    <span className="text-[12.5px] text-gray-500">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {confirmation.booking_status}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={isBookingForSomeone ? "/mybookings?tab=bookedForSomeone" : "/mybookings"} className="flex-1">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold w-full h-11">
                      View My Bookings
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 h-11 text-[13px] font-semibold text-gray-600"
                  >
                    Book Another Seat
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