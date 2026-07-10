"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
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
  createGuestBooking,
  modifyBooking,
  modifyGuestBooking,
  fetchBuildings,
  fetchEmployeeWorkPreferences,
  fetchFloors,
  fetchMyWorkPreferences,
  fetchPreferences,
  fetchSeatsWithAvailability,
  fetchSites,
} from "../services/Bookingform.service";
import { guestVisitWorkflow } from "@/features/bookings/services/bookings.service";

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

interface GuestUrlParams {
  guestId?: string | null;
  hostUserId?: string | null;
  guestType?: string | null;
  purposeOfVisit?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
}

function buildUrl(
  step: number,
  form: BookingFormState,
  modifyBookingId?: string | null,
  bookedForUserId?: string | null,
  guestParams?: GuestUrlParams | null,
  bookingForName?: string | null,
  visitId?: string | null,
  isGuestModify?: boolean,
): string {
  const params = new URLSearchParams();
  params.set("step", String(step));
  if (modifyBookingId)             params.set("modifyBookingId", modifyBookingId);
  if (bookedForUserId)             params.set("bookedForUserId", bookedForUserId);
  if (bookingForName)              params.set("bookingForName",  bookingForName);
  if (visitId)                     params.set("visitId",         visitId);
  if (isGuestModify)               params.set("isGuestModify",   "true");
  if (form.siteId)                 params.set("siteId",          form.siteId);
  if (form.buildingId)             params.set("buildingId",      form.buildingId);
  if (form.floorId)                params.set("floorId",         form.floorId);
  if (form.fromDate)               params.set("fromDate",        form.fromDate);
  if (form.toDate)                 params.set("toDate",          form.toDate);
  if (form.selectedSeatId)         params.set("seatId",          form.selectedSeatId);
  if (form.preferences.length > 0) params.set("preferences",     form.preferences.join(","));
  if (guestParams?.guestId)        params.set("guestId",         guestParams.guestId);
  if (guestParams?.hostUserId)     params.set("hostUserId",      guestParams.hostUserId);
  if (guestParams?.guestType)      params.set("guestType",       guestParams.guestType);
  if (guestParams?.purposeOfVisit) params.set("purposeOfVisit",  guestParams.purposeOfVisit);
  if (guestParams?.startTime)      params.set("startTime",       guestParams.startTime);
  if (guestParams?.endTime)        params.set("endTime",         guestParams.endTime);
  if (guestParams?.notes)          params.set("notes",           guestParams.notes);
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

  const bookedForUserId = searchParams.get("bookedForUserId") ?? null;
  const bookingForName  = searchParams.get("bookingForName")  ?? null;

  // Guest booking params — present only when coming from book-for-someone (visitor path)
  const guestId       = searchParams.get("guestId")        ?? null;
  const hostUserId    = searchParams.get("hostUserId")      ?? null;
  const guestType     = searchParams.get("guestType")       ?? null;
  const purposeOfVisit = searchParams.get("purposeOfVisit") ?? null;
  const guestStartTime = searchParams.get("startTime")      ?? null;
  const guestEndTime   = searchParams.get("endTime")        ?? null;
  const guestNotes     = searchParams.get("notes")          ?? null;
  const visitId        = searchParams.get("visitId")         ?? null;
  const isGuestModify  = searchParams.get("isGuestModify") === "true";
  const isGuestBooking = Boolean(guestId);
  const isAddBookingToVisit = Boolean(visitId);
  const isBookingForSomeone = Boolean(bookedForUserId || guestId);

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

  const [myPreferencesApplied, setMyPreferencesApplied] = useState(false);

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

  // ── Auto-fill office/building/floor/amenities from saved preferences ─────
  // Self-booking: GET /dashboard/me, only on a fresh visit (no URL params).
  // Facilitator booking for an employee: GET /dashboard/employee/{id}, using
  // whoever bookedForUserId points at — not gated on hasAnyParam, since that
  // flow always carries bookedForUserId/bookingForName (and sometimes
  // fromDate) but never a siteId of its own to preserve.
  // Skipped for guest bookings (no work_preferences exist for a guest) and
  // modify mode. If the target user has never saved a preference, the form
  // is left exactly as it was (all fields blank).
  const [savedPreferenceNames, setSavedPreferenceNames] = useState<{
    siteName: string | null;
    buildingName: string | null;
    floorName: string | null;
  }>({ siteName: null, buildingName: null, floorName: null });

  useEffect(() => {
    if (myPreferencesApplied) return;
    if (isModifyMode || isGuestBooking) return;
    if (!bookedForUserId && hasAnyParam) return;
    if (availablePreferences.length === 0) return;

    setMyPreferencesApplied(true);
    const prefsPromise = bookedForUserId
      ? fetchEmployeeWorkPreferences(bookedForUserId)
      : fetchMyWorkPreferences();

    prefsPromise
      .then((prefs) => {
        if (!prefs) return;
        const preferenceKeys = prefs.amenityIds
          .map((id) => availablePreferences.find((p) => p.id === id)?.key)
          .filter((key): key is string => Boolean(key));

        setSavedPreferenceNames({
          siteName:     prefs.siteName,
          buildingName: prefs.buildingName,
          floorName:    prefs.floorName,
        });

        setForm((f) => ({
          ...f,
          siteId:     prefs.siteId     ?? f.siteId,
          buildingId: prefs.buildingId ?? f.buildingId,
          floorId:    prefs.floorId    ?? f.floorId,
          preferences: preferenceKeys.length > 0 ? preferenceKeys : f.preferences,
        }));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePreferences, hasAnyParam, bookedForUserId, isGuestBooking, isModifyMode, myPreferencesApplied]);

  // ── Navigate helper ───────────────────────────────────────────────────────

  const guestUrlParams: GuestUrlParams | null = isGuestBooking
    ? { guestId, hostUserId, guestType, purposeOfVisit, startTime: guestStartTime, endTime: guestEndTime, notes: guestNotes }
    : null;

  const navigateTo = useCallback(
    (nextStep: BookingStep, nextForm: BookingFormState) => {
      setStepState(nextStep);
      router.push(buildUrl(nextStep, nextForm, modifyBookingId, bookedForUserId, guestUrlParams, bookingForName, visitId, isGuestModify));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, modifyBookingId, bookedForUserId, isGuestBooking, visitId, isGuestModify],
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

  // ── Guarantee the selects can always render a saved-preference id ───────
  // The site/building/floor cascades below are independent GET calls (their
  // own pagination/status filters) from the one that returned the saved
  // site/building/floor id in the first place (GET /dashboard/me). If a
  // saved id isn't present in its fetched list for any reason, inject a
  // synthetic option (labeled from the name /dashboard/me already gave us)
  // rather than silently showing a blank select for a value that's actually
  // set.

  useEffect(() => {
    if (loadingSites || !form.siteId) return;
    setSites((prev) => {
      if (prev.some((s) => s.id === form.siteId)) return prev;
      return [
        ...prev,
        { id: form.siteId, name: savedPreferenceNames.siteName ?? `Site ${form.siteId}`, city: "", country: "", timezone: "" },
      ];
    });
  }, [sites, loadingSites, form.siteId, savedPreferenceNames.siteName]);

  useEffect(() => {
    if (loadingBuildings || !form.buildingId) return;
    setBuildings((prev) => {
      if (prev.some((b) => b.id === form.buildingId)) return prev;
      return [
        ...prev,
        { id: form.buildingId, siteId: form.siteId, name: savedPreferenceNames.buildingName ?? `Building ${form.buildingId}` },
      ];
    });
  }, [buildings, loadingBuildings, form.buildingId, form.siteId, savedPreferenceNames.buildingName]);

  useEffect(() => {
    if (loadingFloors || !form.floorId) return;
    setFloors((prev) => {
      if (prev.some((f) => f.id === form.floorId)) return prev;
      return [
        ...prev,
        { id: form.floorId, buildingId: form.buildingId, name: savedPreferenceNames.floorName ?? `Floor ${form.floorId}`, number: 0 },
      ];
    });
  }, [floors, loadingFloors, form.floorId, form.buildingId, savedPreferenceNames.floorName]);

  // ── Derive floor layout URL from the selected floor ───────────────────────

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

  // ── Re-fetch seats on step 2 page refresh ────────────────────────────────

  useEffect(() => {
    if (
      step === 2 &&
      seats.length === 0 &&
      form.floorId &&
      form.fromDate &&
      form.toDate &&
      availablePreferences.length > 0
    ) {
      setLoadingSeats(true);
      const amenityIds = resolveAmenityIds(form.preferences);
      fetchSeatsWithAvailability({
        floorId:         form.floorId,
        fromDate:        form.fromDate,
        toDate:          form.toDate,
        preferences:     form.preferences,
        amenityIds,
        currentSeatId:   searchParams.get("seatId") ?? undefined,
        modifyBookingId: modifyBookingId ?? null,
        bookedForUserId: bookedForUserId ?? null,
        isGuestBooking:  isGuestBooking,
        bookedForGuestId: guestId ?? null,
      })
        .then(setSeats)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load seats"))
        .finally(() => setLoadingSeats(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, availablePreferences]);

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
      toDate: v,
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
        floorId:         form.floorId,
        fromDate:        form.fromDate,
        toDate:          form.toDate,
        preferences:     form.preferences,
        amenityIds,
        currentSeatId:   searchParams.get("seatId") ?? undefined,
        modifyBookingId: modifyBookingId ?? null,
        bookedForUserId: bookedForUserId ?? null,
        isGuestBooking:  isGuestBooking,
        bookedForGuestId: guestId ?? null,
      });
      setSeats(data);
      navigateTo(2, form);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { detail?: { message?: string } | string; message?: string; error?: { message?: string } } | undefined;
        const msg =
          (typeof data?.detail === "object" ? data?.detail?.message : typeof data?.detail === "string" ? data.detail : null)
          ?? data?.error?.message
          ?? data?.message
          ?? e.message;
        setError(msg);
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      setLoadingSeats(false);
    }
  }, [form, resolveAmenityIds, navigateTo, searchParams, modifyBookingId]);

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

    const basePayload = {
      site_id:      Number(form.siteId),
      building_id:  Number(form.buildingId),
      floor_id:     Number(form.floorId),
      seat_id:      Number(form.selectedSeatId),
      booking_date: form.fromDate,
    };

    try {
      let result: CreateBookingResponse;

      if (isModifyMode && modifyBookingId && isGuestModify) {
        console.log("[ConfirmBooking] Branch: MODIFY_GUEST", { modifyBookingId });
        result = await modifyGuestBooking(modifyBookingId, basePayload);
      } else if (isModifyMode && modifyBookingId) {
        console.log("[ConfirmBooking] Branch: MODIFY", { modifyBookingId });
        result = await modifyBooking(modifyBookingId, basePayload);
      } else if (isAddBookingToVisit && visitId) {
        const workflowPayload = {
          site_id:      Number(form.siteId),
          building_id:  Number(form.buildingId),
          floor_id:     Number(form.floorId),
          seat_id:      Number(form.selectedSeatId),
          visit_date:   form.fromDate,
          guest_type:   guestType ?? "OTHER",
          host_user_id: hostUserId ? Number(hostUserId) : undefined,
        };
        console.log("[ConfirmBooking] Branch: ADD_BOOKING", { visitId, workflowPayload });
        const res = await guestVisitWorkflow(visitId, "ADD_BOOKING", workflowPayload);
        console.log("[ConfirmBooking] ADD_BOOKING response:", res);
        const wf = res as { booking?: CreateBookingResponse };
        result = wf.booking ?? { booking_id: "", booking_status: "CONFIRMED", booking_date: form.fromDate } as CreateBookingResponse;
      } else if (isGuestBooking && guestId && hostUserId && guestType) {
        console.log("[ConfirmBooking] Branch: CREATE_GUEST_BOOKING", { guestId, hostUserId, guestType });
        result = await createGuestBooking({
          site_id:      Number(form.siteId),
          building_id:  Number(form.buildingId),
          floor_id:     Number(form.floorId),
          seat_id:      Number(form.selectedSeatId),
          visit_date:   form.fromDate,
          guest_id:     Number(guestId),
          host_user_id: Number(hostUserId),
          guest_type:   guestType,
          ...(purposeOfVisit ? { purpose_of_visit: purposeOfVisit } : {}),
          ...(guestStartTime ? { start_time: guestStartTime }       : {}),
          ...(guestEndTime   ? { end_time:   guestEndTime }         : {}),
          ...(guestNotes     ? { notes:      guestNotes }           : {}),
        });
      } else {
        result = await createBooking(
          bookedForUserId ? { ...basePayload, booked_for_user_id: Number(bookedForUserId) } : basePayload
        );
      }

      setConfirmation(result);
      setStepState(3);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { detail?: { message?: string } | string; message?: string; error?: { message?: string } } | undefined;
        const msg =
          (typeof data?.detail === "object" ? data?.detail?.message : typeof data?.detail === "string" ? data.detail : null)
          ?? data?.error?.message
          ?? data?.message
          ?? err.message;
        setError(msg);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, isModifyMode, modifyBookingId]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goBack = () => {
    if (searchParams.get("source") === "dashboard") {
      router.push("/dashboard?openFavDialog=1");
      return;
    }
    const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
    const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
    setForm(clearedForm);
    navigateTo(prevStep, clearedForm);
  };

  // ── FIX: after confirmation (both book & modify) go to My Bookings ────────
  const resetForm = () => {
    setForm({ ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() });
    setStepState(1);
    setBuildings([]);
    setFloors([]);
    setSeats([]);
    setFloorLayoutUrl(null);
    setConfirmation(null);
    setError(null);
    if (isModifyMode) {
      const forSomeone = isBookingForSomeone || isGuestModify || Boolean(bookedForUserId);
      router.push(forSomeone ? "/mybookings?tab=bookedForSomeone" : "/mybookings");
    } else {
      router.push("/book");
    }
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
    isBookingForSomeone,
    isGuestBooking,
    bookingForName,
    modifyBookingId,
    prefillSeatLabel,
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