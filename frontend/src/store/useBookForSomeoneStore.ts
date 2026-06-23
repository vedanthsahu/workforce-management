import { create } from "zustand";
import {
  BookingFormState,
  BookingType,
  Employee,
  Guest,
  SeatRequired,
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
}));
