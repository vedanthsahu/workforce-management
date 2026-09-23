import { create } from "zustand";
import {
  BookingFormState,
  VisitDetails,
} from "@/features/bookforsomeone/types/booking";

const initialVisitDetails: VisitDetails = {
  guestType: "INTERVIEW_CANDIDATE",
  purposeOfVisit: "INTERVIEW",
  hostEmployee: null,
  siteId: "",
  buildingId: "",
  floorId: "",
  visitDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  additionalNotes: "",
};

export const initialBookForSomeoneFormState: BookingFormState = {
  step: 1,
  bookingType: "internal",
  selectedEmployee: null,
  selectedGuest: null,
  visitDetails: initialVisitDetails,
  seatRequired: null,
};

interface BookForSomeoneStore {
  formState: BookingFormState;
  setFormState: (
    updater: BookingFormState | ((prev: BookingFormState) => BookingFormState)
  ) => void;
  resetFormState: () => void;
  // Set right before navigating away to /book mid-flow (redirectToBookSeat)
  // so the wizard knows a remount is the user coming back from that step,
  // not a fresh entry -- see BookFormSomePage's reset-on-mount effect. Kept
  // outside formState since it's about *why* the page remounted, not
  // booking data itself.
  awaitingSeatSelection: boolean;
  setAwaitingSeatSelection: (value: boolean) => void;
}

export const useBookForSomeoneStore = create<BookForSomeoneStore>((set) => ({
  formState: initialBookForSomeoneFormState,

  setFormState: (updater) =>
    set((state) => ({
      formState:
        typeof updater === "function" ? updater(state.formState) : updater,
    })),

  resetFormState: () =>
    set({ formState: initialBookForSomeoneFormState }),

  awaitingSeatSelection: false,
  setAwaitingSeatSelection: (value) => set({ awaitingSeatSelection: value }),
}));
