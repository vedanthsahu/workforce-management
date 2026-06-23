"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Settings2,
  X,
  Pencil,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { useBookingForm } from "../hooks/Usebookingform";
import { SvgFloorMapPage, SeatWithSvgId } from "./SvgFloorMapPage";
import { fmtDate, getPreferenceIcon } from "../utils/bookingFormHelpers";

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

  // Scroll up to the error banner whenever a new error comes in, so it's
  // visible even if the user is scrolled further down the page.
  React.useEffect(() => {
    if (error) {
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [error]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const selectedSiteLabel = React.useMemo(() => {
    if (!form.siteId) return undefined;
    return sites.find((x) => x.id === form.siteId)?.name ?? form.siteId;
  }, [form.siteId, sites]);

  const selectedBuildingLabel = React.useMemo(() => {
    if (!form.buildingId) return undefined;
    return buildings.find((x) => x.id === form.buildingId)?.name ?? form.buildingId;
  }, [form.buildingId, buildings]);

  const selectedFloorLabel = React.useMemo(() => {
    if (!form.floorId) return undefined;
    return floors.find((x) => x.id === form.floorId)?.name ?? form.floorId;
  }, [form.floorId, floors]);

  const seatsWithSvgId = seats as unknown as SeatWithSvgId[];

  const showHeaderAction = step !== 3;

  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">

      {/* ── Sticky header: title + modify banner only ── */}
      <div className="sticky top-0 z-10 shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 flex flex-col gap-4 sm:gap-5">

        {/* ── Header ── */}
        <div className="flex justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-[17px] sm:text-[20px] font-bold text-[#1A1A2E] leading-tight">
              {isModifyMode ? "Modify Booking" : isBookingForSomeone ? `Book a Seat for ${bookingForName}` : "Book a Seat"}
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

        {/* ── Modify mode banner ── */}
        {isModifyMode && (
          <div className="flex items-start sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 sm:px-5 py-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Pencil size={13} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] sm:text-[13px] font-semibold text-amber-800">Modifying existing booking</p>
              <p className="text-[11.5px] sm:text-[12px] text-amber-600 mt-0.5">
                Your original booking will be cancelled once you confirm a new seat.
                The date is pre-filled from your original booking.
              </p>
            </div>
          </div>
        )}

      </div>{/* end sticky header */}

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">

        {/* ── Step indicator — only shown while selecting workspace, dates & preferences ── */}
        {step === 1 && (
          <div className="flex items-center justify-between sm:justify-start sm:gap-3 bg-white border border-[#EBEBF5] rounded-xl px-4 sm:px-6 py-3 sm:py-4">
            <StepDot
              number={1}
              label="Workspace & Preferences"
              sublabel="Select your workspace, dates and preferences"
              active={step === 1}
              done={false}
            />
            <StepArrow />
            <StepDot
              number={2}
              label="Select a Seat"
              sublabel="Choose your preferred seat on the floor map"
              active={false}
              done={false}
            />
            <StepArrow />
            <StepDot
              number={3}
              label="Review & Confirm"
              sublabel="Review your booking and confirm"
              active={false}
              done={false}
            />
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div
            ref={errorBannerRef}
            className="bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-3 text-red-500 text-[12.5px] sm:text-[13px] flex items-center justify-between gap-3"
          >
            <span>{error}</span>
            <button onClick={() => {}} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 1 – Workspace & Preferences
        ════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-5 sm:gap-7">

            {/* Section title */}
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
              <SectionHeader
                icon={<Building2 size={14} />}
                title="1. Select Workspace"
                subtitle="Choose your office location, building and floor"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

                {/* Site */}
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Site (Office Location)</p>
                  <Select value={form.siteId} onValueChange={setSiteId} disabled={loadingSites}>
                    <SelectTrigger className="h-9 sm:h-10 text-[12.5px] sm:text-[13px] border-[#EBEBF5] w-full">
                      <SelectValue placeholder={loadingSites ? "Loading…" : "Select site"}>
                        {selectedSiteLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Building */}
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Building</p>
                  <Select
                    value={form.buildingId}
                    onValueChange={setBuildingId}
                    disabled={!form.siteId || loadingBuildings}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-[12.5px] sm:text-[13px] border-[#EBEBF5] w-full">
                      <SelectValue placeholder={loadingBuildings ? "Loading…" : "Select building"}>
                        {selectedBuildingLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Floor */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Floor</p>
                  <Select
                    value={form.floorId}
                    onValueChange={setFloorId}
                    disabled={!form.buildingId || loadingFloors}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-[12.5px] sm:text-[13px] border-[#EBEBF5] w-full">
                      <SelectValue placeholder={loadingFloors ? "Loading…" : "Select floor"}>
                        {selectedFloorLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {/* Date pickers row */}
                <div className="flex gap-2 sm:gap-3 flex-1 items-center">
                  <DateInput
                    label="From"
                    value={form.fromDate}
                    min={todayIso}
                    onChange={setFromDate}
                  />
                  <ChevronRight size={14} className="text-gray-300 shrink-0 mt-5" />
                  <DateInput
                    label="To"
                    value={form.toDate}
                    min={form.fromDate}
                    onChange={setToDate}
                  />
                </div>

                {/* Day count summary */}
                {dayCount > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 sm:px-5 py-3 md:min-w-[200px] lg:min-w-[220px]">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays size={13} className="text-indigo-500" />
                      <span className="text-[12.5px] sm:text-[13px] font-semibold text-indigo-700">
                        {isModifyMode
                          ? fmtDate(form.fromDate)
                          : `${dayCount} ${dayCount === 1 ? "day" : "days"} selected`}
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
              <SectionHeader
                icon={<Settings2 size={14} />}
                title="3. Preferences"
                subtitle="Choose features that are important to you"
              />
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
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePreference(key)}
                          className="pointer-events-none"
                        />
                      </button>
                    );
                  })
                )}

                {/* Tip card */}
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

            {/* What happens next */}
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
            <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 w-full max-w-2xl">
              <div>
                <p className="text-[14px] sm:text-[15px] font-bold text-[#1A1A2E]">Review & Confirm</p>
                <p className="text-[11.5px] sm:text-[12px] text-gray-400 mt-0.5">
                  {isModifyMode
                    ? "Confirming will cancel your original booking and create this new one"
                    : "Please review your booking details before confirming"}
                </p>
              </div>

              <Separator />

              <div>
                {isBookingForSomeone && bookingForName && (
                  <SummaryRow label="Booking For" value={`${bookingForName} (${isGuestBooking ? "Guest" : "Employee"})`} />
                )}
                <SummaryRow label="Location"   value={selectedSite?.name ?? "—"} />
                <SummaryRow label="Building"   value={selectedBuilding?.name ?? "—"} />
                <SummaryRow label="Floor"      value={selectedFloor?.name ?? "—"} />
                <SummaryRow label="Seat"       value={`Seat ${selectedSeat?.label ?? "—"}`} />
                <SummaryRow label="Date"       value={fmtDate(form.fromDate)} />
                {!isModifyMode && (
                  <>
                    <SummaryRow label="To"       value={fmtDate(form.toDate)} />
                    <SummaryRow label="Duration" value={`${dayCount} ${dayCount === 1 ? "day" : "days"}`} />
                  </>
                )}
              </div>

              <div className="flex justify-between pt-1 border-t border-[#EBEBF5]">
                <Button variant="outline" size="sm" onClick={goBack} className="text-[12.5px]">
                  ← Back
                </Button>
                <Button
                  onClick={confirmBooking}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 text-[12.5px] sm:text-[13px] font-semibold"
                >
                  {submitting
                    ? isModifyMode ? "Modifying…" : "Confirming…"
                    : isModifyMode ? "Confirm Modification" : "Confirm Booking"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Confirmation success
        ════════════════════════════════════════════════════ */}
        {confirmation && (
          <div className="flex justify-center">
            <div className="bg-white border border-[#EBEBF5] rounded-xl p-6 sm:p-8 flex flex-col items-center gap-4 w-full max-w-2xl text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={26} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[16px] sm:text-[18px] font-bold text-[#1A1A2E]">
                  {isModifyMode ? "Booking Modified!" : "Booking Confirmed!"}
                </p>
                <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-1">
                  {isModifyMode
                    ? "Your booking has been updated successfully."
                    : isBookingForSomeone && bookingForName
                      ? `A seat has been reserved for ${bookingForName}.`
                      : "Your seat has been reserved successfully."}
                </p>
              </div>
              <div className="bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl px-4 sm:px-6 py-4 w-full text-left">
                <p className="text-[10.5px] sm:text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
                  Booking Details
                </p>
                {isBookingForSomeone && bookingForName && (
                  <SummaryRow label="Booked For" value={`${bookingForName} (${isGuestBooking ? "Guest" : "Employee"})`} />
                )}
                <SummaryRow label="Booking ID" value={confirmation.booking_id} />
                <SummaryRow label="Location"   value={confirmation.site_name ?? "—"} />
                <SummaryRow label="Building"   value={confirmation.building_name ?? "—"} />
                <SummaryRow label="Floor"      value={confirmation.floor_name ?? "—"} />
                <SummaryRow label="Seat"       value={confirmation.seat_code ?? "—"} />
                <SummaryRow label="Date"       value={fmtDate(confirmation.booking_date)} />
                <SummaryRow label="Status"     value={confirmation.booking_status} />
              </div>

              <Link href="/mybookings" className="w-full">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium w-full">
                  View My Bookings
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>{/* end scrollable content */}

    </main>
  );
};

export default BookASeatPage;