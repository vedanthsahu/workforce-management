"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookingFormState,
  BookingStep,
  Building,
  CreateBookingResponse,
  Floor,
  Preference,
  Seat,
  Site,
} from "../types/Bookingform.types";

import {
  createBooking,
  modifyBooking,
  fetchBuildings,
  fetchFloors,
  fetchPreferences,
  fetchSeatsWithAvailability,
  fetchSites,
} from "../services/Bookingform.service";

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: BookingFormState = {
  siteId:         "",
  buildingId:     "",
  floorId:        "",
  fromDate:       todayIso(),
  toDate:         todayIso(),
  preferences:    [],
  selectedSeatId: null,
};

// ── URL builder ───────────────────────────────────────────────────────────────

function buildUrl(
  step: number,
  form: BookingFormState,
  modifyBookingId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("step", String(step));
  if (modifyBookingId)             params.set("modifyBookingId", modifyBookingId);
  if (form.siteId)                 params.set("siteId",          form.siteId);
  if (form.buildingId)             params.set("buildingId",      form.buildingId);
  if (form.floorId)                params.set("floorId",         form.floorId);
  if (form.fromDate)               params.set("fromDate",        form.fromDate);
  if (form.toDate)                 params.set("toDate",          form.toDate);
  if (form.selectedSeatId)         params.set("seatId",          form.selectedSeatId);
  if (form.preferences.length > 0) params.set("preferences",     form.preferences.join(","));
  return `/book?${params.toString()}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBookingForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── Read params once up-front ─────────────────────────────────────────────

  const modifyBookingId = searchParams.get("modifyBookingId");
  const isModifyMode    = Boolean(modifyBookingId);

  const prefillLocationName = searchParams.get("locationName") ?? null;
  const prefillBuildingName = searchParams.get("buildingName") ?? null;
  const prefillFloorName    = searchParams.get("floorName")    ?? null;
  const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null;

  const prefillFromDate = searchParams.get("fromDate") ?? null;
  const prefillToDate   = searchParams.get("toDate")   ?? null;

  const prefillPreferencesParam = searchParams.get("preferences") ?? null;
  const prefillPreferences: string[] = prefillPreferencesParam
    ? prefillPreferencesParam.split(",").filter(Boolean)
    : [];

  const prefillPreferenceNamesParam = searchParams.get("preferenceNames") ?? null;
  const prefillPreferenceNames: string[] = prefillPreferenceNamesParam
    ? prefillPreferenceNamesParam.split(",").filter(Boolean)
    : [];

  const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

  const hasAnyParam = Boolean(
    searchParams.get("modifyBookingId") ||
    searchParams.get("step")            ||
    searchParams.get("siteId")          ||
    searchParams.get("fromDate")
  );

  // ── Initial form values ───────────────────────────────────────────────────

  const initialFromDate = prefillFromDate ?? todayIso();
  const initialToDate   = prefillToDate ?? (isModifyMode ? initialFromDate : todayIso());

  // ── State ─────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<BookingFormState>(() => {
    if (!hasAnyParam) return { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
    return {
      siteId:         searchParams.get("siteId")     ?? "",
      buildingId:     searchParams.get("buildingId") ?? "",
      floorId:        searchParams.get("floorId")    ?? "",
      fromDate:       initialFromDate,
      toDate:         initialToDate,
      selectedSeatId: searchParams.get("seatId")     ?? null,
      preferences:    prefillPreferences,
    };
  });

  const [step, setStepState] = useState<BookingStep>(() =>
    hasAnyParam ? stepFromUrl : 1
  );

  const [sites,                setSites]                = useState<Site[]>([]);
  const [buildings,            setBuildings]            = useState<Building[]>([]);
  const [floors,               setFloors]               = useState<Floor[]>([]);
  const [seats,                setSeats]                = useState<Seat[]>([]);
  const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

  // ── Floor layout URL — derived from the selected floor ───────────────────
  const [floorLayoutUrl, setFloorLayoutUrl] = useState<string | null>(null);

  const [loadingSites,       setLoadingSites]       = useState(false);
  const [loadingBuildings,   setLoadingBuildings]   = useState(false);
  const [loadingFloors,      setLoadingFloors]      = useState(false);
  const [loadingSeats,       setLoadingSeats]       = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [submitting,         setSubmitting]         = useState(false);

  const [error,        setError]        = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

  // ── Reset on clean /book navigation ──────────────────────────────────────

  useEffect(() => {
    if (hasAnyParam) return;
    setForm({ ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() });
    setStepState(1);
    setBuildings([]);
    setFloors([]);
    setSeats([]);
    setFloorLayoutUrl(null);
    setConfirmation(null);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // ── Resolve prefill preferences once the API list is available ───────────

  useEffect(() => {
    if (availablePreferences.length === 0) return;

    if (prefillPreferences.length > 0) {
      const validKeys = prefillPreferences.filter((k) =>
        availablePreferences.some((p) => p.key === k)
      );
      if (validKeys.length > 0) {
        setForm((f) => ({ ...f, preferences: validKeys }));
      }
      return;
    }

    if (prefillPreferenceNames.length > 0) {
      const resolvedKeys = prefillPreferenceNames
        .map((name) =>
          availablePreferences.find(
            (p) => p.name.toLowerCase() === name.toLowerCase()
          )
        )
        .filter((p): p is Preference => p !== undefined)
        .map((p) => p.key);

      if (resolvedKeys.length > 0) {
        setForm((f) => ({
          ...f,
          preferences: f.preferences.length === 0 ? resolvedKeys : f.preferences,
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePreferences]);

  // ── Navigate helper ───────────────────────────────────────────────────────

  const navigateTo = useCallback(
    (nextStep: BookingStep, nextForm: BookingFormState) => {
      setStepState(nextStep);
      router.push(buildUrl(nextStep, nextForm, modifyBookingId));
    },
    [router, modifyBookingId],
  );

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    setLoadingSites(true);
    fetchSites()
      .then(setSites)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSites(false));
  }, []);

  useEffect(() => {
    setLoadingPreferences(true);
    fetchPreferences()
      .then(setAvailablePreferences)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPreferences(false));
  }, []);

  useEffect(() => {
    if (!form.siteId) { setBuildings([]); setFloors([]); return; }
    setBuildings([]);
    setFloors([]);
    setLoadingBuildings(true);
    fetchBuildings(form.siteId)
      .then(setBuildings)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingBuildings(false));
  }, [form.siteId]);

  useEffect(() => {
    if (!form.buildingId) { setFloors([]); return; }
    setFloors([]);
    setLoadingFloors(true);
    fetchFloors(form.buildingId)
      .then(setFloors)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingFloors(false));
  }, [form.buildingId]);

  // ── Derive floor layout URL from the selected floor ───────────────────────
  // No extra API call needed — layout_file_url comes from fetchFloors already.

  useEffect(() => {
    const floor = floors.find((f) => f.id === form.floorId);
    setFloorLayoutUrl(floor?.layoutFileUrl ?? null);
  }, [floors, form.floorId]);

  // ── Prefill resolution: display names → IDs ──────────────────────────────

  useEffect(() => {
    if (!prefillLocationName || sites.length === 0 || form.siteId) return;
    const match = sites.find(
      (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase(),
    );
    if (match) setForm((f) => ({ ...f, siteId: match.id, buildingId: "", floorId: "" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, prefillLocationName]);

  useEffect(() => {
    if (!prefillBuildingName || buildings.length === 0 || form.buildingId) return;
    const match = buildings.find(
      (b) => b.name.toLowerCase() === prefillBuildingName.toLowerCase(),
    );
    if (match) setForm((f) => ({ ...f, buildingId: match.id, floorId: "", selectedSeatId: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings, prefillBuildingName]);

  useEffect(() => {
    if (!prefillLocationName || prefillBuildingName || buildings.length !== 1 || form.buildingId) return;
    setForm((f) => ({ ...f, buildingId: buildings[0].id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings, prefillLocationName, prefillBuildingName]);

  useEffect(() => {
    if (!prefillFloorName || floors.length === 0 || form.floorId) return;
    const match = floors.find(
      (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
    );
    if (match) setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors, prefillFloorName]);

  useEffect(() => {
    if (!prefillSeatLabel || seats.length === 0 || form.selectedSeatId) return;
    const match = seats.find(
      (s) => s.label.toLowerCase() === prefillSeatLabel.toLowerCase(),
    );
    if (match) setForm((f) => ({ ...f, selectedSeatId: match.id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, prefillSeatLabel]);

  // ── Re-fetch seats on step 2 page refresh ────────────────────────────────

  useEffect(() => {
    if (step === 2 && seats.length === 0 && form.floorId && form.fromDate && form.toDate) {
      setLoadingSeats(true);
      const amenityIds = resolveAmenityIds(form.preferences);
      fetchSeatsWithAvailability({
        floorId:       form.floorId,
        fromDate:      form.fromDate,
        toDate:        form.toDate,
        preferences:   form.preferences,
        amenityIds,
        currentSeatId: searchParams.get("seatId") ?? undefined,
      })
        .then(setSeats)
        .catch((e) => setError(e.message))
        .finally(() => setLoadingSeats(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Preference resolver ───────────────────────────────────────────────────

  const resolveAmenityIds = useCallback(
    (preferenceKeys: string[]): number[] =>
      preferenceKeys
        .map((key) => availablePreferences.find((p) => p.key === key)?.id)
        .filter((id): id is string => id !== undefined)
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id)),
    [availablePreferences],
  );

  // ── Field setters ─────────────────────────────────────────────────────────

  const setSiteId = (v: string | null) =>
    setForm((f) => ({ ...f, siteId: v ?? "", buildingId: "", floorId: "", selectedSeatId: null }));

  const setBuildingId = (v: string | null) =>
    setForm((f) => ({ ...f, buildingId: v ?? "", floorId: "", selectedSeatId: null }));

  const setFloorId = (v: string | null) =>
    setForm((f) => ({ ...f, floorId: v ?? "", selectedSeatId: null }));

  const setFromDate = (v: string) =>
    setForm((f) => ({
      ...f,
      fromDate: v,
      toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
    }));

  const setToDate = (v: string) =>
    setForm((f) => ({ ...f, toDate: v }));

  const togglePreference = (key: string) =>
    setForm((f) => ({
      ...f,
      preferences: f.preferences.includes(key)
        ? f.preferences.filter((p) => p !== key)
        : [...f.preferences, key],
    }));

  const clearAll = () => setForm((f) => ({ ...f, preferences: [] }));

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────

  const findAvailableSeats = useCallback(async () => {
    if (!form.floorId || !form.fromDate || !form.toDate) return;
    setLoadingSeats(true);
    setError(null);
    try {
      const amenityIds = resolveAmenityIds(form.preferences);
      const data = await fetchSeatsWithAvailability({
        floorId:       form.floorId,
        fromDate:      form.fromDate,
        toDate:        form.toDate,
        preferences:   form.preferences,
        amenityIds,
        currentSeatId: searchParams.get("seatId") ?? undefined,
      });
      setSeats(data);
      navigateTo(2, form);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        setError("This seat is already booked for the selected date. Please choose a different seat.");
      } else if (status === 400) {
        setError(e instanceof Error ? e.message : "Failed to load seats");
      }
    } finally {
      setLoadingSeats(false);
    }
  }, [form, resolveAmenityIds, navigateTo, searchParams]);

  // ── Step 2: select seat ───────────────────────────────────────────────────

  const selectSeat = (seatId: string | null) =>
    setForm((f) => ({ ...f, selectedSeatId: seatId }));

  // ── Step 2 → Step 3 ───────────────────────────────────────────────────────

  const goToReview = () => {
    if (!form.selectedSeatId) return;
    navigateTo(3, form);
  };

  // ── Step 3: confirm ───────────────────────────────────────────────────────

  const confirmBooking = useCallback(async () => {
    if (!form.selectedSeatId) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      site_id:      Number(form.siteId),
      building_id:  Number(form.buildingId),
      floor_id:     Number(form.floorId),
      seat_id:      Number(form.selectedSeatId),
      booking_date: form.fromDate,
    };

    try {
      let result: CreateBookingResponse;

      if (isModifyMode && modifyBookingId) {
        result = await modifyBooking(modifyBookingId, payload);
      } else {
        result = await createBooking(payload);
      }

      setConfirmation(result);
      setStepState(3);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setError("This seat is already booked for the selected date. Please choose a different seat.");
      } else if (status === 400) {
        setError(
          err?.response?.data?.detail?.message ??
          "Invalid booking details. Please go back and check your selection."
        );
      } else if (status === 403) {
        setError("You don't have permission to book this seat.");
      } else if (status === 404) {
        setError(
          isModifyMode
            ? "The original booking could not be found. It may have already been cancelled."
            : "The selected seat is no longer available. Please go back and choose another."
        );
      } else {
        setError(
          err?.response?.data?.detail?.message ??
          err?.response?.data?.message ??
          err?.message ??
          "Failed to confirm booking. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, isModifyMode, modifyBookingId]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goBack = () => {
    const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
    const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
    setForm(clearedForm);
    navigateTo(prevStep, clearedForm);
  };

  const resetForm = () => {
    const fresh = { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
    setForm(fresh);
    setStepState(1);
    setBuildings([]);
    setFloors([]);
    setSeats([]);
    setFloorLayoutUrl(null);
    setConfirmation(null);
    setError(null);
    router.push("/book");
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedSite     = sites.find((s) => s.id === form.siteId);
  const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
  const selectedFloor    = floors.find((f) => f.id === form.floorId);
  const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

  const dayCount = (() => {
    if (!form.fromDate || !form.toDate) return 0;
    const diff =
      new Date(form.toDate + "T00:00:00").getTime() -
      new Date(form.fromDate + "T00:00:00").getTime();
    return Math.round(diff / 86_400_000) + 1;
  })();

  const step1Valid =
    !!form.siteId     &&
    !!form.buildingId &&
    !!form.floorId    &&
    !!form.fromDate   &&
    !!form.toDate;

  return {
    step,
    form,
    sites,
    buildings,
    floors,
    seats,
    availablePreferences,
    confirmation,
    error,
    loadingSites,
    loadingBuildings,
    loadingFloors,
    loadingSeats,
    loadingPreferences,
    submitting,
    selectedSite,
    selectedBuilding,
    selectedFloor,
    selectedSeat,
    dayCount,
    step1Valid,
    isModifyMode,
    modifyBookingId,
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
  };
}