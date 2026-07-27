"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useBookingForm, useSiteBuildingOptions } from "../hooks/useBooking";
import type { BookingType } from "../types/booking";
import { checkGuestBookingEligibility } from "../services/booking.service";
import { guestVisitWorkflow } from "@/features/bookings/services/bookings.service";
import { BookingTypeSelector, FormFooter, InternalEmployeeForm } from "./BookForSomeone";
import { usePermissions } from "@/features/dashboard/hooks/usePermissions";
import {
  ConfirmInviteStep,
  GuestSelectStep,
  SeatRequiredStep,
  StepProgressBar,
  SuccessStep,
  VisitDetailsStep,
} from "./BookingWizardSteps";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useBookForSomeoneStore } from "@/store/useBookForSomeoneStore";

export default function BookForSomeonePage() {
  const router = useRouter();
const { data } = useDashboard();
const currentUserId = data?.user.user_id;
  const {
    formState,
    isSubmitting,
    submitError,
    setBookingType,
    setSelectedEmployee,
    selectGuest,
    createAndSelectGuest,
    updateVisitDetails,
    setSeatRequired,
    goNext,
    goBack,
    handleCancel,
    resetWizard,
    submitGuestVisit,
  } = useBookingForm();

  const searchParams = useSearchParams();
  const setFormState = useBookForSomeoneStore((s) => s.setFormState);

  const { step, bookingType, selectedEmployee, selectedGuest, visitDetails, seatRequired } = formState;
  const { sites, buildings, floors, isLoadingBuildings, isLoadingFloors } = useSiteBuildingOptions(visitDetails.siteId, visitDetails.buildingId);

  const { can } = usePermissions();
  const canBookEmployee = can("booking:book_for_employee");
  const canBookGuest    = can("booking:book_for_guest");

  // ── Prefill from URL when editing a visit ──
  const editVisitId = searchParams.get("editVisitId");
  // Set only by AdminBookingsPage's row-menu "Modify" action so the success
  // screen can navigate back to Admin Bookings instead of My Bookings.
  const isAdminFlow = searchParams.get("adminFlow") === "true";
  const prefillApplied = useRef(false);

  useEffect(() => {
    if (!editVisitId || prefillApplied.current) return;
    prefillApplied.current = true;

    const guestName      = searchParams.get("guestName") ?? "";
    const guestEmail     = searchParams.get("guestEmail") ?? "";
    const guestType      = searchParams.get("guestType") ?? "";
    const purposeOfVisit = searchParams.get("purposeOfVisit") ?? "";
    const visitDate      = searchParams.get("visitDate") ?? "";
    const endDate        = searchParams.get("endDate") ?? "";
    const rawStart       = searchParams.get("startTime") ?? "";
    const rawEnd         = searchParams.get("endTime") ?? "";
    const startTime      = rawStart.slice(0, 5);
    const endTime        = rawEnd.slice(0, 5);
    const hostName       = searchParams.get("hostName") ?? "";
    const hostUserId     = searchParams.get("hostUserId") ?? "";
    const siteId         = searchParams.get("siteId") ?? "";
    const buildingId     = searchParams.get("buildingId") ?? "";
    const floorId        = searchParams.get("floorId") ?? "";

    setFormState(() => ({
      step: 2,
      bookingType: "visitor",
      selectedEmployee: null,
      selectedGuest: guestName ? { id: "", fullName: guestName, email: guestEmail } : null,
      seatRequired: null,
      visitDetails: {
        guestType: (guestType || "INTERVIEW_CANDIDATE") as any,
        purposeOfVisit: (purposeOfVisit || "INTERVIEW") as any,
        hostEmployee: hostName ? { id: hostUserId, name: hostName, email: "", role: "", status: "ACTIVE" } : null,
        siteId,
        buildingId,
        floorId,
        visitDate,
        endDate,
        startTime,
        endTime,
        additionalNotes: "",
      },
    }));
  }, [editVisitId]);

  // Admin's "Booking Management" page links here with ?entry=employee or
  // ?entry=guest depending on which button was clicked — lock the wizard to
  // that type and disable the other card. Absent for every other entry point
  // (e.g. the facilitator sidebar), so their flow is unaffected.
  const entry = searchParams.get("entry");
  const disabledType: BookingType | undefined =
    entry === "employee" ? "visitor" : entry === "guest" ? "internal" : undefined;

  // Auto-select when only one type is permitted — no need to show the selector
  useEffect(() => {
    if (editVisitId) return;
    if (entry === "employee") { setBookingType("internal"); return; }
    if (entry === "guest") { setBookingType("visitor"); return; }
    if (canBookEmployee && !canBookGuest) setBookingType("internal");
    if (canBookGuest && !canBookEmployee) setBookingType("visitor");
  }, [canBookEmployee, canBookGuest, entry]);

  const showTypeSelector = canBookEmployee && canBookGuest;

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  const [guestView, setGuestView] = useState<"list" | "create" | "edit">("list");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const isCreatingGuest = bookingType === "visitor" && step === 1 && guestView !== "list";

  useEffect(() => {
    setEligibilityError(null);
  }, [visitDetails.visitDate, visitDetails.endDate, selectedGuest]);

  // When an eligibility error appears, scroll it into view so the user
  // doesn't miss it if they're scrolled down past the footer.
  useEffect(() => {
    if (eligibilityError) {
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [eligibilityError]);

  const redirectToBookSeat = () => {
    const fromDate = visitDetails.visitDate;
    const toDate = visitDetails.endDate || visitDetails.visitDate;

    const params = new URLSearchParams();
    if (fromDate) {
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);
    }
    if (visitDetails.siteId) params.set("siteId", visitDetails.siteId);
    if (visitDetails.buildingId) params.set("buildingId", visitDetails.buildingId);
    if (visitDetails.floorId) params.set("floorId", visitDetails.floorId);
    if (bookingType === "internal" && selectedEmployee) {
      params.set("bookedForUserId", selectedEmployee.id);
      params.set("bookingForName", selectedEmployee.name);
    }

    if (bookingType === "visitor" && selectedGuest) {
      params.set("guestId", selectedGuest.id);
      params.set("bookingForName", selectedGuest.fullName);
      if (visitDetails.hostEmployee) params.set("hostUserId", visitDetails.hostEmployee.id);
      params.set("guestType", visitDetails.guestType);
      if (visitDetails.purposeOfVisit) params.set("purposeOfVisit", visitDetails.purposeOfVisit);
      if (visitDetails.startTime)      params.set("startTime", visitDetails.startTime);
      if (visitDetails.endTime)        params.set("endTime", visitDetails.endTime);
      if (visitDetails.additionalNotes) params.set("notes", visitDetails.additionalNotes);
    }

    const query = params.toString();
    router.push(`/book${query ? `?${query}` : ""}`);
  };

  const steps =
    bookingType === "internal"
      ? ["Who"]
      : ["Who", "Details", "Seat Required?", "Book Seat", "Confirm"];

  const isSuccessStep = bookingType === "visitor" && step === 5;

  // ConfirmInviteStep (step 4, "no seat" path) maps to the "Confirm" progress node;
  // the success screen lights up everything.
  const displayStep =
    bookingType === "visitor" && step === 4 ? 5 : isSuccessStep ? steps.length + 1 : step;

  let canContinue = true;
  if (bookingType === "internal") {
    if (step === 1) canContinue = !!selectedEmployee;
  } else {
    if (step === 1) canContinue = !!selectedGuest;
    if (step === 2)
      canContinue =
        !!visitDetails.hostEmployee && !!visitDetails.visitDate && !!visitDetails.endDate && !!visitDetails.siteId && !!visitDetails.buildingId && !!visitDetails.floorId && !checkingEligibility;
    if (step === 3) canContinue = seatRequired !== null;
    if (step === 4) canContinue = !(isSubmitting || editSubmitting);
  }

  const submitLabel = (() => {
    if (bookingType === "internal" && step === 1) return "Book a Seat";
    if (bookingType === "visitor" && step === 3) return seatRequired === "no" ? "Continue" : "Book a Seat";
    if (bookingType === "visitor" && step === 4) {
      if (editVisitId) return editSubmitting ? "Saving…" : "Confirm Changes";
      return isSubmitting ? "Sending…" : "Confirm Invite";
    }
    return "Continue";
  })();

  const infoText =
    (bookingType === "internal" && step === 1) || (bookingType === "visitor" && step === 3 && seatRequired === "yes")
      ? `After clicking "${submitLabel}", you will continue in the existing booking flow to select workspace, date, preferences and choose a seat.`
      : editError ?? submitError;

  const handlePrimaryAction = async () => {
    if (bookingType === "internal" && step === 1) {
      redirectToBookSeat();
      return;
    }

    if (bookingType === "visitor" && step === 2 && selectedGuest && !editVisitId) {
      setEligibilityError(null);
      setCheckingEligibility(true);
      try {
        await checkGuestBookingEligibility(
          selectedGuest.id,
          visitDetails.visitDate,
          visitDetails.endDate || visitDetails.visitDate,
        );
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          const detail = err.response.data?.detail;
          setEligibilityError(
            typeof detail === "object" && detail?.message
              ? detail.message
              : "This guest already has an active visit for the selected date(s)."
          );
        } else {
          setEligibilityError("Unable to verify booking eligibility. Please try again.");
        }
        setCheckingEligibility(false);
        return;
      }
      setCheckingEligibility(false);
    }

    if (editVisitId && bookingType === "visitor" && step === 2) {
      setFormState((prev) => ({ ...prev, step: 4 }));
      return;
    }

    if (bookingType === "visitor" && step === 3 && seatRequired === "yes") {
      redirectToBookSeat();
      return;
    }
    if (bookingType === "visitor" && step === 4) {
      if (editVisitId) {
        setEditSubmitting(true);
        setEditError(null);
        try {
          const fmtTime = (t: string) => {
            if (!t) return undefined;
            const parts = t.replace(/\s*(AM|PM)\s*/i, "").split(":");
            if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1]}:00`;
            return `${t}:00`;
          };

          const action = searchParams.get("action") ?? "MODIFY_VISIT_ONLY";
          const seatId = searchParams.get("seatId");

          const workflowPayload: Record<string, unknown> = {
            host_user_id: visitDetails.hostEmployee?.id ? Number(visitDetails.hostEmployee.id) : undefined,
            site_id: visitDetails.siteId ? Number(visitDetails.siteId) : undefined,
            building_id: visitDetails.buildingId ? Number(visitDetails.buildingId) : undefined,
            floor_id: visitDetails.floorId ? Number(visitDetails.floorId) : undefined,
            visit_date: visitDetails.visitDate || undefined,
            guest_type: visitDetails.guestType,
            purpose_of_visit: visitDetails.purposeOfVisit || undefined,
            start_time: visitDetails.startTime ? fmtTime(visitDetails.startTime) : undefined,
            end_time: visitDetails.endTime ? fmtTime(visitDetails.endTime) : undefined,
            notes: visitDetails.additionalNotes || undefined,
          };
          if (action === "MODIFY_VISIT_AND_BOOKING" && seatId) {
            workflowPayload.seat_id = Number(seatId);
          }
          console.log("[ModifyVisit] Action:", action, "Payload:", JSON.stringify(workflowPayload));
          await guestVisitWorkflow(editVisitId, action as any, workflowPayload);
        } catch (err: unknown) {
          const detail = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
          console.error("[ModifyVisit] Workflow error:", detail);
          setEditError("Failed to modify visit. Please try again.");
          setEditSubmitting(false);
          return;
        }
        setEditSubmitting(false);
      } else {
        const success = await submitGuestVisit();
        if (!success) return;
      }
    }
    goNext();
  };

  let stepContent: React.ReactNode = null;
  if (bookingType === "internal") {
    stepContent = (
      <InternalEmployeeForm
        selectedEmployee={selectedEmployee}
        onSelect={setSelectedEmployee}
        onClear={() => setSelectedEmployee(null)}
        excludeId={currentUserId}
      />
    );
  } else {
    if (step === 1) {
      stepContent = (
        <GuestSelectStep
          selectedGuest={selectedGuest}
          view={guestView}
          onViewChange={setGuestView}
          onSelect={selectGuest}
          onCreate={createAndSelectGuest}
        />
      );
    } else if (step === 2) {
      const hasLinkedBooking = editVisitId && searchParams.get("action") === "MODIFY_VISIT_AND_BOOKING";
      stepContent = (
        <VisitDetailsStep
          guest={selectedGuest}
          visitDetails={visitDetails}
          onChange={updateVisitDetails}
          sites={sites}
          buildings={buildings}
          floors={floors}
          isLoadingBuildings={isLoadingBuildings}
          isLoadingFloors={isLoadingFloors}
          readOnlyLocation={!!hasLinkedBooking}
        />
      );
    } else if (step === 3) {
      stepContent = <SeatRequiredStep value={seatRequired} onChange={setSeatRequired} />;
    } else if (step === 4) {
      stepContent = (
        <ConfirmInviteStep
          guest={selectedGuest}
          visitDetails={visitDetails}
          sites={sites}
          buildings={buildings}
          seatLabel={searchParams.get("seatLabel")}
          floorName={searchParams.get("floorName")}
        />
      );
    } else {
      stepContent = <SuccessStep onBookAnother={resetWizard} isAdminFlow={isAdminFlow} />;
    }
  }

  const howItWorks =
    bookingType === "internal"
      ? [
          { step: "1", title: "Choose who", desc: "Search and select the employee you're booking for." },
          { step: "2", title: "Pick a seat", desc: "Continue to the booking flow to choose workspace, date and seat." },
        ]
      : [
          { step: "1", title: "Choose who", desc: "Select a recent guest or create a new one." },
          { step: "2", title: "Fill in details", desc: "Set guest type, purpose, host employee and visit time." },
          { step: "3", title: "Seat required?", desc: "Decide whether this guest needs a workspace." },
          { step: "4", title: "Pick a seat", desc: "Continue to the booking flow to choose workspace and seat." },
          { step: "5", title: "Confirm", desc: "Review the details and send the invite." },
        ];

  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">
      {/* ── Sticky top zone: header ── */}
      <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-[18px] sm:text-[20px] font-bold text-[#1A1A2E] leading-tight">
              Book for Someone
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-0.5">
              Book a seat for an internal employee, or send a visitor an invite.
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {eligibilityError && (
          <div
            ref={errorBannerRef}
            className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-3 text-red-600 text-[12.5px] sm:text-[13px] flex items-start gap-3"
          >
            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 00-2 0v3a1 1 0 002 0V5zm-.25 5.75a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" /></svg>
            <span className="flex-1">{eligibilityError}</span>
            <button onClick={() => setEligibilityError(null)} className="text-red-400 hover:text-red-600 shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13" /></svg>
            </button>
          </div>
        )}

        <div className="flex gap-6 lg:gap-8 items-start w-full">
          {/* ── Main form card ── */}
          <div className="flex-1 min-w-0 bg-white border border-[#EBEBF5] rounded-xl flex flex-col gap-0">
            <div className="px-4 sm:px-5 py-4 sm:py-5">
              {bookingType === "visitor" && <StepProgressBar steps={steps} currentStep={displayStep} />}

              {step === 1 && showTypeSelector && (
                <>
                  <BookingTypeSelector selected={bookingType} onChange={setBookingType} disabledType={disabledType} />
                  <div className="border-t border-[#EBEBF5] my-4 sm:my-5" />
                </>
              )}

              {stepContent}
            </div>

            {!isSuccessStep && !isCreatingGuest && (
              <>
                <div className="border-t border-[#EBEBF5]" />
                <div className="px-4 sm:px-5 py-4 sm:py-5 bg-[#F7F8FC]">
                  <FormFooter
                    onCancel={handleCancel}
                    onSubmit={handlePrimaryAction}
                    onBack={
                      editVisitId
                        ? (step === 4
                            ? () => setFormState((prev) => ({ ...prev, step: 2 }))
                            : () => router.push("/mybookings?tab=bookedForSomeone"))
                        : step > 1
                          ? goBack
                          : undefined
                    }
                    submitLabel={checkingEligibility ? "Checking…" : submitLabel}
                    submitDisabled={!canContinue}
                    infoText={infoText ?? undefined}
                  />
                </div>
              </>
            )}
          </div>

          {/* ── Right: Help panel (xl+) ── */}
          <aside className="hidden xl:flex flex-col gap-3 sm:gap-4 w-[264px] shrink-0">
            <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-5">
              <p className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E] mb-3">
                How it works
              </p>
              <ol className="flex flex-col gap-3">
                {howItWorks.map(({ step: s, title, desc }) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {s}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E]">{title}</span>
                      <span className="text-[11.5px] text-gray-400 leading-snug">{desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {bookingType === "visitor" && selectedGuest && step >= 2 && !isSuccessStep && (
              <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-5">
                <p className="text-[10.5px] font-semibold text-indigo-500 tracking-wider uppercase mb-1.5">
                  Booking For
                </p>
                <p className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E]">
                  {selectedGuest.fullName}
                </p>
                <p className="text-[11.5px] text-gray-400">{selectedGuest.email}</p>
              </div>
            )}

            <div className="bg-[#EEF2FF] border border-indigo-100 rounded-xl p-4 sm:p-5">
              <p className="text-[12px] sm:text-[12.5px] font-semibold text-indigo-800 mb-1.5">
                Booking policy
              </p>
              <p className="text-[11.5px] text-indigo-500 leading-relaxed">
                You can book a seat up to 30 days in advance. Visitors must be
                accompanied by a host employee at all times.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}