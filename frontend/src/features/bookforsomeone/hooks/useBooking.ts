"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  BookingFormState,
  BookingType,
  Employee,
  Guest,
  SeatRequired,
  VisitDetails,
} from "../types/booking";
import { createGuest, MOCK_GUESTS, searchEmployees } from "../services/bookingService";

// ─── Initial state ────────────────────────────────────────────────────────────

const initialVisitDetails: VisitDetails = {
  guestType: "Interview Candidate",
  purposeOfVisit: "Interview",
  hostEmployee: null,
  visitDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  additionalNotes: "",
};

const initialFormState: BookingFormState = {
  step: 1,
  bookingType: "internal",
  selectedEmployee: null,
  guests: MOCK_GUESTS,
  selectedGuest: null,
  visitDetails: initialVisitDetails,
  seatRequired: null,
};

// ─── useBookingForm ───────────────────────────────────────────────────────────

export function useBookingForm() {
  const [formState, setFormState] = useState<BookingFormState>(initialFormState);

  const setBookingType = useCallback((type: BookingType) => {
    setFormState((prev) => ({
      ...initialFormState,
      guests: prev.guests,
      bookingType: type,
    }));
  }, []);

  const setSelectedEmployee = useCallback((employee: Employee | null) => {
    setFormState((prev) => ({ ...prev, selectedEmployee: employee }));
  }, []);

  const selectGuest = useCallback((guest: Guest | null) => {
    setFormState((prev) => ({ ...prev, selectedGuest: guest }));
  }, []);

  const addGuest = useCallback((data: Omit<Guest, "id">) => {
    const guest = createGuest(data);
    setFormState((prev) => ({
      ...prev,
      guests: [guest, ...prev.guests],
      selectedGuest: guest,
    }));
  }, []);

  const updateVisitDetails = useCallback((updates: Partial<VisitDetails>) => {
    setFormState((prev) => ({
      ...prev,
      visitDetails: { ...prev.visitDetails, ...updates },
    }));
  }, []);

  const setSeatRequired = useCallback((value: SeatRequired) => {
    setFormState((prev) => ({ ...prev, seatRequired: value }));
  }, []);

  const goNext = useCallback(() => {
    setFormState((prev) => {
      if (prev.bookingType === "internal") return prev;
      if (prev.step === 1) return { ...prev, step: 2 };
      if (prev.step === 2) return { ...prev, step: 3 };
      if (prev.step === 3 && prev.seatRequired === "no") return { ...prev, step: 4 };
      if (prev.step === 4) return { ...prev, step: 5 };
      return prev;
    });
  }, []);

  const goBack = useCallback(() => {
    setFormState((prev) => {
      if (prev.step <= 1) return prev;
      return { ...prev, step: prev.step - 1 };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setFormState((prev) => ({ ...initialFormState, guests: prev.guests, bookingType: prev.bookingType }));
  }, []);

  const resetWizard = useCallback(() => {
    setFormState((prev) => ({ ...initialFormState, guests: prev.guests }));
  }, []);

  return {
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
  };
}

// ─── useEmployeeSearch ────────────────────────────────────────────────────────

export function useEmployeeSearch(onSelect: (emp: Employee) => void) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResults(searchEmployees(query));
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(true);
  }, []);

  const handleSelect = useCallback(
    (emp: Employee) => {
      onSelect(emp);
      setQuery("");
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
  }, []);

  return {
    query,
    results,
    isOpen,
    containerRef,
    handleQueryChange,
    handleSelect,
    handleClear,
    openDropdown: () => setIsOpen(true),
  };
}
