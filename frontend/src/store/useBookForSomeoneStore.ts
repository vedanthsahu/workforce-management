import { create } from "zustand";
import {
  BookingFormState,
  VisitDetails,
} from "@/features/bookforsomeone/types/booking";
import { todayIso } from "@/features/bookforsomeone/constants/booking.constants";

// Functions, not static objects -- visitDate/endDate must be "today" at the
// moment the wizard is actually opened/reset, not frozen to whatever day
// this module first loaded (a tab left open across midnight would otherwise
// keep defaulting to yesterday).
function createInitialVisitDetails(): VisitDetails {
  const today = todayIso();
  return {
    guestType: "INTERVIEW_CANDIDATE",
    purposeOfVisit: "INTERVIEW",
    hostEmployee: null,
    siteId: "",
    buildingId: "",
    floorId: "",
    visitDate: today,
    endDate: today,
    startTime: "",
    endTime: "",
    additionalNotes: "",
  };
}

export function createInitialBookForSomeoneFormState(): BookingFormState {
  return {
    step: 1,
    bookingType: "internal",
    selectedEmployee: null,
    selectedGuest: null,
    visitDetails: createInitialVisitDetails(),
    seatRequired: null,
  };
}

interface BookForSomeoneStore {
  formState: BookingFormState;
  setFormState: (
    updater: BookingFormState | ((prev: BookingFormState) => BookingFormState)
  ) => void;
  resetFormState: () => void;
}

export const useBookForSomeoneStore = create<BookForSomeoneStore>((set) => ({
  formState: createInitialBookForSomeoneFormState(),

  setFormState: (updater) =>
    set((state) => ({
      formState:
        typeof updater === "function" ? updater(state.formState) : updater,
    })),

  resetFormState: () =>
    set({ formState: createInitialBookForSomeoneFormState() }),
}));
