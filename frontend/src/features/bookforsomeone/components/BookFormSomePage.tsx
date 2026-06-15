"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBookingForm } from "../hooks/useBooking";
import { getGuestName } from "../services/bookingService";
import { BookingTypeSelector, FormFooter, InternalEmployeeForm } from "./BookForSomeone";
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
    setBookingType,
    setSelectedEmployee,
    selectGuest,
    addGuest,
    updateVisitDetails,
    setSeatRequired,
    goNext,
    goBack,
    handleCancel,
    resetWizard,
  } = useBookingForm();

  const { step, bookingType, selectedEmployee, guests, selectedGuest, visitDetails, seatRequired } = formState;

  const [guestView, setGuestView] = useState<"list" | "create">("list");
  const isCreatingGuest = bookingType === "visitor" && step === 1 && guestView === "create";

  const redirectToBookSeat = () => {
    const fromDate = visitDetails.visitDate;
    const toDate = visitDetails.endDate || visitDetails.visitDate;
    const query = fromDate ? `?fromDate=${fromDate}&toDate=${toDate}` : "";
    router.push(`/book${query}`);
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
    if (step === 2) canContinue = !!visitDetails.hostEmployee && !!visitDetails.visitDate;
    if (step === 3) canContinue = seatRequired !== null;
  }

  const submitLabel = (() => {
    if (bookingType === "internal" && step === 1) return "Book a Seat";
    if (bookingType === "visitor" && step === 3) return seatRequired === "no" ? "Continue" : "Book a Seat";
    if (bookingType === "visitor" && step === 4) return "Confirm Invite";
    return "Continue";
  })();

  const infoText =
    (bookingType === "internal" && step === 1) || (bookingType === "visitor" && step === 3 && seatRequired === "yes")
      ? `After clicking "${submitLabel}", you will continue in the existing booking flow to select workspace, date, preferences and choose a seat.`
      : undefined;

  const handlePrimaryAction = () => {
    if (bookingType === "internal" && step === 1) {
      redirectToBookSeat();
      return;
    }
    if (bookingType === "visitor" && step === 3 && seatRequired === "yes") {
      redirectToBookSeat();
      return;
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
          guests={guests}
          selectedGuest={selectedGuest}
          view={guestView}
          onViewChange={setGuestView}
          onSelect={selectGuest}
          onCreate={addGuest}
        />
      );
    } else if (step === 2) {
      stepContent = (
        <VisitDetailsStep guest={selectedGuest} visitDetails={visitDetails} onChange={updateVisitDetails} />
      );
    } else if (step === 3) {
      stepContent = <SeatRequiredStep value={seatRequired} onChange={setSeatRequired} />;
    } else if (step === 4) {
      stepContent = <ConfirmInviteStep guest={selectedGuest} visitDetails={visitDetails} />;
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
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex gap-6 lg:gap-8 items-start w-full">
          {/* ── Main form card ── */}
          <div className="flex-1 min-w-0 bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col gap-0">
            <div className="px-4 sm:px-5 py-4 sm:py-5">
              {bookingType === "visitor" && <StepProgressBar steps={steps} currentStep={displayStep} />}

              {step === 1 && (
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
                    infoText={infoText}
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
                  {getGuestName(selectedGuest)}
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
