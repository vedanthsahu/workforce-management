"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { BookingFormState, BookingType, Employee, VisitorDetails } from "../types/booking";
import { searchEmployees } from "../services/bookingService";


// ─── Initial state ────────────────────────────────────────────────────────────

const initialVisitorDetails: VisitorDetails = {
  fullName: "",
  email: "",
  phoneNumber: "",
  organization: "",
  guestType: "Interview Candidate",
  purposeOfVisit: "Interview",
  hostEmployee: null,
  additionalNotes: "",
};

const initialFormState: BookingFormState = {
  bookingType: "internal",
  selectedEmployee: null,
  visitorDetails: initialVisitorDetails,
};

// ─── useBookingForm ───────────────────────────────────────────────────────────

export function useBookingForm() {
  const [formState, setFormState] = useState<BookingFormState>(initialFormState);

  const setBookingType = useCallback((type: BookingType) => {
    setFormState({
      ...initialFormState,
      bookingType: type,
    });
  }, []);

  const setSelectedEmployee = useCallback((employee: Employee | null) => {
    setFormState((prev) => ({ ...prev, selectedEmployee: employee }));
  }, []);

  const updateVisitorDetails = useCallback((updates: Partial<VisitorDetails>) => {
    setFormState((prev) => ({
      ...prev,
      visitorDetails: { ...prev.visitorDetails, ...updates },
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    // Wire up real navigation here
    alert("Continuing to workspace & seat selection…");
  }, []);

  const handleCancel = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  return {
    formState,
    setBookingType,
    setSelectedEmployee,
    updateVisitorDetails,
    handleSubmit,
    handleCancel,
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
