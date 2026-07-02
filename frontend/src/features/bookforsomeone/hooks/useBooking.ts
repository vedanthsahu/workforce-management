"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  BookingType,
  Building,
  Employee,
  Floor,
  Guest,
  SeatRequired,
  Site,
  VisitDetails,
} from "../types/booking";
import { CreateGuestInput } from "../types/booking";
import {
  createGuest,
  createGuestVisit,
  fetchBuildings,
  fetchFloors,
  fetchSites,
  searchGuests,
  searchUsers,
} from "../services/booking.service";
import {
  initialBookForSomeoneFormState,
  useBookForSomeoneStore,
} from "@/store/useBookForSomeoneStore";

// ─── useBookingForm ───────────────────────────────────────────────────────────

export function useBookingForm() {
  const formState    = useBookForSomeoneStore((s) => s.formState);
  const setFormState = useBookForSomeoneStore((s) => s.setFormState);
  const resetFormState = useBookForSomeoneStore((s) => s.resetFormState);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setBookingType = useCallback((type: BookingType) => {
    setFormState(() => ({ ...initialBookForSomeoneFormState, bookingType: type }));
  }, []);

  const setSelectedEmployee = useCallback((employee: Employee | null) => {
    setFormState((prev) => ({ ...prev, selectedEmployee: employee }));
  }, []);

  const selectGuest = useCallback((guest: Guest | null) => {
    setFormState((prev) => ({ ...prev, selectedGuest: guest }));
  }, []);

  const createAndSelectGuest = useCallback(async (data: CreateGuestInput) => {
    const guest = await createGuest(data);
    setFormState((prev) => ({ ...prev, selectedGuest: guest }));
    return guest;
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
    setFormState((prev) => ({ ...initialBookForSomeoneFormState, bookingType: prev.bookingType }));
    setSubmitError(null);
  }, []);

  const resetWizard = useCallback(() => {
    resetFormState();
    setSubmitError(null);
  }, [resetFormState]);

  const submitGuestVisit = useCallback(async () => {
    const { selectedGuest, visitDetails } = formState;
    if (!selectedGuest || !visitDetails.hostEmployee || !visitDetails.siteId || !visitDetails.buildingId) {
      setSubmitError("Please complete all required visit details.");
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createGuestVisit({
        guestId: selectedGuest.id,
        hostUserId: visitDetails.hostEmployee.id,
        siteId: visitDetails.siteId,
        buildingId: visitDetails.buildingId,
        floorId: visitDetails.floorId || undefined,
        visitDate: visitDetails.visitDate,
        guestType: visitDetails.guestType,
        purposeOfVisit: visitDetails.purposeOfVisit,
        startTime: visitDetails.startTime ? `${visitDetails.startTime}:00` : null,
        endTime: visitDetails.endTime ? `${visitDetails.endTime}:00` : null,
        notes: visitDetails.additionalNotes || null,
      });
      return true;
    } catch {
      setSubmitError("Failed to send the invite. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formState]);

  return {
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
  };
}

// ─── useEmployeeSearch ────────────────────────────────────────────────────────

export function useEmployeeSearch(onSelect: (emp: Employee) => void, excludeId?: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      searchUsers(trimmed, 20, excludeId)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, excludeId]);

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
    isLoading,
    containerRef,
    handleQueryChange,
    handleSelect,
    handleClear,
    openDropdown: () => setIsOpen(true),
  };
}

// ─── useGuestSearch ───────────────────────────────────────────────────────────

export function useGuestSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      searchGuests(trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, results, isLoading };
}

// ─── useSiteBuildingOptions ───────────────────────────────────────────────────

export function useSiteBuildingOptions(siteId: string, buildingId: string) {
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [isLoadingFloors, setIsLoadingFloors] = useState(false);

  useEffect(() => {
    setIsLoadingSites(true);
    fetchSites()
      .then(setSites)
      .catch(() => setSites([]))
      .finally(() => setIsLoadingSites(false));
  }, []);

  useEffect(() => {
    if (!siteId) {
      setBuildings([]);
      setFloors([]);
      return;
    }
    setIsLoadingBuildings(true);
    fetchBuildings(siteId)
      .then(setBuildings)
      .catch(() => setBuildings([]))
      .finally(() => setIsLoadingBuildings(false));
  }, [siteId]);

  useEffect(() => {
    if (!buildingId) {
      setFloors([]);
      return;
    }
    setIsLoadingFloors(true);
    fetchFloors(buildingId)
      .then(setFloors)
      .catch(() => setFloors([]))
      .finally(() => setIsLoadingFloors(false));
  }, [buildingId]);

  return { sites, buildings, floors, isLoadingSites, isLoadingBuildings, isLoadingFloors };
}