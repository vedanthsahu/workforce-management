"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBookingForm, useSiteBuildingOptions } from "../hooks/useBooking";
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

export default function BookForSomeonePage() {
  const router = useRouter();

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

  const { step, bookingType, selectedEmployee, selectedGuest, visitDetails, seatRequired } = formState;
  const { sites, buildings, floors, isLoadingBuildings, isLoadingFloors } = useSiteBuildingOptions(visitDetails.siteId, visitDetails.buildingId);

  const { can } = usePermissions();
  const canBookEmployee = can("booking:book_for_employee");
  const canBookGuest    = can("booking:book_for_guest");

  // Auto-select when only one type is permitted — no need to show the selector
  useEffect(() => {
    if (canBookEmployee && !canBookGuest) setBookingType("internal");
    if (canBookGuest && !canBookEmployee) setBookingType("visitor");
  }, [canBookEmployee, canBookGuest]);

  const showTypeSelector = canBookEmployee && canBookGuest;

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  const [guestView, setGuestView] = useState<"list" | "create">("list");
  const isCreatingGuest = bookingType === "visitor" && step === 1 && guestView === "create";

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
        !!visitDetails.hostEmployee && !!visitDetails.visitDate && !!visitDetails.siteId && !!visitDetails.buildingId && !!visitDetails.floorId;
    if (step === 3) canContinue = seatRequired !== null;
    if (step === 4) canContinue = !isSubmitting;
  }

  const submitLabel = (() => {
    if (bookingType === "internal" && step === 1) return "Book a Seat";
    if (bookingType === "visitor" && step === 3) return seatRequired === "no" ? "Continue" : "Book a Seat";
    if (bookingType === "visitor" && step === 4) return isSubmitting ? "Sending…" : "Confirm Invite";
    return "Continue";
  })();

  const infoText =
    (bookingType === "internal" && step === 1) || (bookingType === "visitor" && step === 3 && seatRequired === "yes")
      ? `After clicking "${submitLabel}", you will continue in the existing booking flow to select workspace, date, preferences and choose a seat.`
      : submitError;

  const handlePrimaryAction = async () => {
    if (bookingType === "internal" && step === 1) {
      redirectToBookSeat();
      return;
    }
    if (bookingType === "visitor" && step === 3 && seatRequired === "yes") {
      redirectToBookSeat();
      return;
    }
    if (bookingType === "visitor" && step === 4) {
      const success = await submitGuestVisit();
      if (!success) return;
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
        />
      );
    } else if (step === 3) {
      stepContent = <SeatRequiredStep value={seatRequired} onChange={setSeatRequired} />;
    } else if (step === 4) {
      stepContent = (
        <ConfirmInviteStep guest={selectedGuest} visitDetails={visitDetails} sites={sites} buildings={buildings} />
      );
    } else {
      stepContent = <SuccessStep onBookAnother={resetWizard} />;
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
        <div className="flex gap-6 lg:gap-8 items-start w-full">
          {/* ── Main form card ── */}
          <div className="flex-1 min-w-0 bg-white border border-[#EBEBF5] rounded-xl flex flex-col gap-0">
            <div className="px-4 sm:px-5 py-4 sm:py-5">
              {bookingType === "visitor" && <StepProgressBar steps={steps} currentStep={displayStep} />}

              {step === 1 && showTypeSelector && (
                <>
                  <BookingTypeSelector selected={bookingType} onChange={setBookingType} />
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
                    onBack={step > 1 ? goBack : undefined}
                    submitLabel={submitLabel}
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
