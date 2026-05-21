// // // // // // // // // "use client";

// // // // // // // // // import { useCallback, useEffect, useState } from "react";
// // // // // // // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // // // // // // import {
// // // // // // // // //   BookingFormState,
// // // // // // // // //   BookingStep,
// // // // // // // // //   Building,
// // // // // // // // //   CreateBookingResponse,
// // // // // // // // //   Floor,
// // // // // // // // //   Preference,
// // // // // // // // //   Seat,
// // // // // // // // //   Site,
// // // // // // // // // } from "../types/Bookingform.types";

// // // // // // // // // import {
// // // // // // // // //   createBooking,
// // // // // // // // //   fetchBuildings,
// // // // // // // // //   fetchFloors,
// // // // // // // // //   fetchPreferences,
// // // // // // // // //   fetchSeatsWithAvailability,
// // // // // // // // //   fetchSites,
// // // // // // // // // } from "../services/Bookingform.service";

// // // // // // // // // function todayIso(): string {
// // // // // // // // //   return new Date().toISOString().slice(0, 10);
// // // // // // // // // }

// // // // // // // // // function plusDaysIso(n: number): string {
// // // // // // // // //   const d = new Date();
// // // // // // // // //   d.setDate(d.getDate() + n);
// // // // // // // // //   return d.toISOString().slice(0, 10);
// // // // // // // // // }

// // // // // // // // // const DEFAULT_STATE: BookingFormState = {
// // // // // // // // //   siteId: "",
// // // // // // // // //   buildingId: "",
// // // // // // // // //   floorId: "",
// // // // // // // // //   fromDate: todayIso(),
// // // // // // // // //   toDate: plusDaysIso(2),
// // // // // // // // //   preferences: [],
// // // // // // // // //   selectedSeatId: null,
// // // // // // // // // };

// // // // // // // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // // // // // // function buildUrl(step: number, form: BookingFormState): string {
// // // // // // // // //   const params = new URLSearchParams();
// // // // // // // // //   params.set("step", String(step));
// // // // // // // // //   if (form.siteId)         params.set("siteId",    form.siteId);
// // // // // // // // //   if (form.buildingId)     params.set("buildingId", form.buildingId);
// // // // // // // // //   if (form.floorId)        params.set("floorId",    form.floorId);
// // // // // // // // //   if (form.fromDate)       params.set("fromDate",   form.fromDate);
// // // // // // // // //   if (form.toDate)         params.set("toDate",     form.toDate);
// // // // // // // // //   if (form.selectedSeatId) params.set("seatId",     form.selectedSeatId);
// // // // // // // // //   // preferences stored in sessionStorage (too long for URL)
// // // // // // // // //   return `/book?${params.toString()}`;
// // // // // // // // // }

// // // // // // // // // export function useBookingForm() {
// // // // // // // // //   const router       = useRouter();
// // // // // // // // //   const searchParams = useSearchParams();

// // // // // // // // //   // ── Read initial state from URL ──────────────────────────────────────────
// // // // // // // // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // // // // // // //   const [form, setForm] = useState<BookingFormState>({
// // // // // // // // //     siteId:         searchParams.get("siteId")     ?? "",
// // // // // // // // //     buildingId:     searchParams.get("buildingId") ?? "",
// // // // // // // // //     floorId:        searchParams.get("floorId")    ?? "",
// // // // // // // // //     fromDate:       searchParams.get("fromDate")   ?? todayIso(),
// // // // // // // // //     toDate:         searchParams.get("toDate")     ?? plusDaysIso(2),
// // // // // // // // //     selectedSeatId: searchParams.get("seatId")     ?? null,
// // // // // // // // //     preferences:    [], // restored from sessionStorage below
// // // // // // // // //   });

// // // // // // // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // // // // // // //   const [sites, setSites]                               = useState<Site[]>([]);
// // // // // // // // //   const [buildings, setBuildings]                       = useState<Building[]>([]);
// // // // // // // // //   const [floors, setFloors]                             = useState<Floor[]>([]);
// // // // // // // // //   const [seats, setSeats]                               = useState<Seat[]>([]);
// // // // // // // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // // // // // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // // // // // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // // // // // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // // // // // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // // // // // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // // // // // // //   const [submitting,         setSubmitting]         = useState(false);

// // // // // // // // //   const [error,        setError]        = useState<string | null>(null);
// // // // // // // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // // // // // // //   // ── Restore preferences from sessionStorage (client only) ───────────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     try {
// // // // // // // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // // // // // // //       if (saved) {
// // // // // // // // //         const prefs = JSON.parse(saved) as string[];
// // // // // // // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // // // // // // //       }
// // // // // // // // //     } catch {}
// // // // // // // // //   }, []);

// // // // // // // // //   // ── Persist preferences to sessionStorage whenever they change ───────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     try {
// // // // // // // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // // // // // // //     } catch {}
// // // // // // // // //   }, [form.preferences]);

// // // // // // // // //   // ── Navigate to new URL whenever step or key form fields change ──────────
// // // // // // // // //   const navigateTo = useCallback((nextStep: BookingStep, nextForm: BookingFormState) => {
// // // // // // // // //     setStepState(nextStep);
// // // // // // // // //     router.push(buildUrl(nextStep, nextForm));
// // // // // // // // //   }, [router]);

// // // // // // // // //   // ── Load sites on mount ──────────────────────────────────────────────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     setLoadingSites(true);
// // // // // // // // //     fetchSites()
// // // // // // // // //       .then(setSites)
// // // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // // //       .finally(() => setLoadingSites(false));
// // // // // // // // //   }, []);

// // // // // // // // //   // ── Load preferences on mount ────────────────────────────────────────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     setLoadingPreferences(true);
// // // // // // // // //     fetchPreferences()
// // // // // // // // //       .then(setAvailablePreferences)
// // // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // // //       .finally(() => setLoadingPreferences(false));
// // // // // // // // //   }, []);

// // // // // // // // //   // ── Load buildings when siteId changes ──────────────────────────────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // // // // // // //     setBuildings([]);
// // // // // // // // //     setFloors([]);
// // // // // // // // //     setLoadingBuildings(true);
// // // // // // // // //     fetchBuildings(form.siteId)
// // // // // // // // //       .then(setBuildings)
// // // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // // //       .finally(() => setLoadingBuildings(false));
// // // // // // // // //   }, [form.siteId]);

// // // // // // // // //   // ── Load floors when buildingId changes ─────────────────────────────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (!form.buildingId) { setFloors([]); return; }
// // // // // // // // //     setFloors([]);
// // // // // // // // //     setLoadingFloors(true);
// // // // // // // // //     fetchFloors(form.buildingId)
// // // // // // // // //       .then(setFloors)
// // // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // // //       .finally(() => setLoadingFloors(false));
// // // // // // // // //   }, [form.buildingId]);

// // // // // // // // //   // ── Re-fetch seats when landing on step 2 (e.g. after refresh) ──────────
// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (
// // // // // // // // //       step === 2 &&
// // // // // // // // //       seats.length === 0 &&
// // // // // // // // //       form.floorId &&
// // // // // // // // //       form.fromDate &&
// // // // // // // // //       form.toDate
// // // // // // // // //     ) {
// // // // // // // // //       setLoadingSeats(true);
// // // // // // // // //       fetchSeatsWithAvailability({
// // // // // // // // //         floorId:     form.floorId,
// // // // // // // // //         fromDate:    form.fromDate,
// // // // // // // // //         toDate:      form.toDate,
// // // // // // // // //         preferences: form.preferences,
// // // // // // // // //       })
// // // // // // // // //         .then(setSeats)
// // // // // // // // //         .catch((e) => setError(e.message))
// // // // // // // // //         .finally(() => setLoadingSeats(false));
// // // // // // // // //     }
// // // // // // // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // // // // // //   // ── Field setters ────────────────────────────────────────────────────────

// // // // // // // // //   const setSiteId = (v: string | null) =>
// // // // // // // // //     setForm((f) => ({
// // // // // // // // //       ...f,
// // // // // // // // //       siteId:         v ?? "",
// // // // // // // // //       buildingId:     "",
// // // // // // // // //       floorId:        "",
// // // // // // // // //       selectedSeatId: null,
// // // // // // // // //     }));

// // // // // // // // //   const setBuildingId = (v: string | null) =>
// // // // // // // // //     setForm((f) => ({
// // // // // // // // //       ...f,
// // // // // // // // //       buildingId:     v ?? "",
// // // // // // // // //       floorId:        "",
// // // // // // // // //       selectedSeatId: null,
// // // // // // // // //     }));

// // // // // // // // //   const setFloorId = (v: string | null) =>
// // // // // // // // //     setForm((f) => ({
// // // // // // // // //       ...f,
// // // // // // // // //       floorId:        v ?? "",
// // // // // // // // //       selectedSeatId: null,
// // // // // // // // //     }));

// // // // // // // // //   const setFromDate = (v: string) =>
// // // // // // // // //     setForm((f) => ({
// // // // // // // // //       ...f,
// // // // // // // // //       fromDate: v,
// // // // // // // // //       toDate: f.toDate < v ? v : f.toDate,
// // // // // // // // //     }));

// // // // // // // // //   const setToDate = (v: string) =>
// // // // // // // // //     setForm((f) => ({ ...f, toDate: v }));

// // // // // // // // //   const togglePreference = (key: string) =>
// // // // // // // // //     setForm((f) => ({
// // // // // // // // //       ...f,
// // // // // // // // //       preferences: f.preferences.includes(key)
// // // // // // // // //         ? f.preferences.filter((p) => p !== key)
// // // // // // // // //         : [...f.preferences, key],
// // // // // // // // //     }));

// // // // // // // // //   const clearAll = () =>
// // // // // // // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // // // // // // //   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
// // // // // // // // //   const findAvailableSeats = useCallback(async () => {
// // // // // // // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // // // // // // //     setLoadingSeats(true);
// // // // // // // // //     setError(null);

// // // // // // // // //     try {
// // // // // // // // //       const data = await fetchSeatsWithAvailability({
// // // // // // // // //         floorId:     form.floorId,
// // // // // // // // //         fromDate:    form.fromDate,
// // // // // // // // //         toDate:      form.toDate,
// // // // // // // // //         preferences: form.preferences,
// // // // // // // // //       });
// // // // // // // // //       setSeats(data);
// // // // // // // // //       navigateTo(2, form);
// // // // // // // // //     } catch (e: unknown) {
// // // // // // // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // // // // // // //     } finally {
// // // // // // // // //       setLoadingSeats(false);
// // // // // // // // //     }
// // // // // // // // //   }, [form, navigateTo]);

// // // // // // // // //   // ── Step 2: select seat ──────────────────────────────────────────────────
// // // // // // // // //   const selectSeat = (seatId: string | null) => {
// // // // // // // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // // // // // // //   };

// // // // // // // // //   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
// // // // // // // // //   const goToReview = () => {
// // // // // // // // //     if (!form.selectedSeatId) return;
// // // // // // // // //     navigateTo(3, form);
// // // // // // // // //   };

// // // // // // // // //   // ── Step 3: confirm booking ──────────────────────────────────────────────
// // // // // // // // //   const confirmBooking = useCallback(async () => {
// // // // // // // // //     if (!form.selectedSeatId) return;

// // // // // // // // //     setSubmitting(true);
// // // // // // // // //     setError(null);

// // // // // // // // //     try {
// // // // // // // // //       const result = await createBooking({
// // // // // // // // //         site_id:      Number(form.siteId),
// // // // // // // // //         building_id:  Number(form.buildingId),
// // // // // // // // //         floor_id:     Number(form.floorId),
// // // // // // // // //         seat_id:      Number(form.selectedSeatId),
// // // // // // // // //         booking_date: form.fromDate,
// // // // // // // // //       });

// // // // // // // // //       // ✅ FIX: Set confirmation state directly — do NOT navigate away.
// // // // // // // // //       // The confirmation UI is shown via the `confirmation` state flag in
// // // // // // // // //       // BookASeatPage, so we don't need a route change here.
// // // // // // // // //       // We also explicitly set step to 3 so the step indicator stays correct.
// // // // // // // // //       setConfirmation(result);
// // // // // // // // //       setStepState(3); // keep step in sync (already 3, but be explicit)

// // // // // // // // //       // Clear preferences from sessionStorage after successful booking
// // // // // // // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}

// // // // // // // // //     } catch (err: any) {
// // // // // // // // //       const status = err?.response?.status;
// // // // // // // // //       if (status === 409) {
// // // // // // // // //         setError("You already have a booking for this seat on the selected date. Please choose a different seat or date.");
// // // // // // // // //       } else if (status === 400) {
// // // // // // // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // // // // // // //       } else if (status === 403) {
// // // // // // // // //         setError("You don't have permission to book this seat.");
// // // // // // // // //       } else if (status === 404) {
// // // // // // // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // // // // // // //       } else {
// // // // // // // // //         setError(err?.response?.data?.message ?? err?.message ?? "Failed to confirm booking. Please try again.");
// // // // // // // // //       }
// // // // // // // // //     } finally {
// // // // // // // // //       setSubmitting(false);
// // // // // // // // //     }
// // // // // // // // //   }, [form]);

// // // // // // // // //   // ── Navigation helpers ───────────────────────────────────────────────────
// // // // // // // // //   const goBack = () => {
// // // // // // // // //     const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// // // // // // // // //     navigateTo(prevStep, form);
// // // // // // // // //   };

// // // // // // // // //   // ✅ FIX: resetForm now explicitly calls setStepState(1) so the step
// // // // // // // // //   // resets in memory even though useState() only reads its initialiser once.
// // // // // // // // //   const resetForm = () => {
// // // // // // // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // // // // // //     setForm(DEFAULT_STATE);
// // // // // // // // //     setStepState(1);      // ← THE FIX: force step back to 1 in React state
// // // // // // // // //     setBuildings([]);
// // // // // // // // //     setFloors([]);
// // // // // // // // //     setSeats([]);
// // // // // // // // //     setConfirmation(null);
// // // // // // // // //     setError(null);
// // // // // // // // //     router.push("/book"); // clean URL
// // // // // // // // //   };

// // // // // // // // //   // ── Derived ──────────────────────────────────────────────────────────────
// // // // // // // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // // // // // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // // // // // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // // // // // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // // // // // // //   const dayCount = (() => {
// // // // // // // // //     if (!form.fromDate || !form.toDate) return 0;
// // // // // // // // //     const diff =
// // // // // // // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // // // // // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // // // // // // //     return Math.round(diff / 86_400_000) + 1;
// // // // // // // // //   })();

// // // // // // // // //   const step1Valid =
// // // // // // // // //     !!form.siteId &&
// // // // // // // // //     !!form.buildingId &&
// // // // // // // // //     !!form.floorId &&
// // // // // // // // //     !!form.fromDate &&
// // // // // // // // //     !!form.toDate;

// // // // // // // // //   return {
// // // // // // // // //     step,
// // // // // // // // //     form,
// // // // // // // // //     sites,
// // // // // // // // //     buildings,
// // // // // // // // //     floors,
// // // // // // // // //     seats,
// // // // // // // // //     availablePreferences,
// // // // // // // // //     confirmation,
// // // // // // // // //     error,
// // // // // // // // //     loadingSites,
// // // // // // // // //     loadingBuildings,
// // // // // // // // //     loadingFloors,
// // // // // // // // //     loadingSeats,
// // // // // // // // //     loadingPreferences,
// // // // // // // // //     submitting,
// // // // // // // // //     selectedSite,
// // // // // // // // //     selectedBuilding,
// // // // // // // // //     selectedFloor,
// // // // // // // // //     selectedSeat,
// // // // // // // // //     dayCount,
// // // // // // // // //     step1Valid,
// // // // // // // // //     setSiteId,
// // // // // // // // //     setBuildingId,
// // // // // // // // //     setFloorId,
// // // // // // // // //     setFromDate,
// // // // // // // // //     setToDate,
// // // // // // // // //     togglePreference,
// // // // // // // // //     clearAll,
// // // // // // // // //     findAvailableSeats,
// // // // // // // // //     selectSeat,
// // // // // // // // //     goToReview,
// // // // // // // // //     confirmBooking,
// // // // // // // // //     goBack,
// // // // // // // // //     resetForm,
// // // // // // // // //   };
// // // // // // // // // }

// // // // // // // // "use client";

// // // // // // // // import { useCallback, useEffect, useState } from "react";
// // // // // // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // // // // // import {
// // // // // // // //   BookingFormState,
// // // // // // // //   BookingStep,
// // // // // // // //   Building,
// // // // // // // //   CreateBookingResponse,
// // // // // // // //   Floor,
// // // // // // // //   Preference,
// // // // // // // //   Seat,
// // // // // // // //   Site,
// // // // // // // // } from "../types/Bookingform.types";

// // // // // // // // import {
// // // // // // // //   createBooking,
// // // // // // // //   fetchBuildings,
// // // // // // // //   fetchFloors,
// // // // // // // //   fetchPreferences,
// // // // // // // //   fetchSeatsWithAvailability,
// // // // // // // //   fetchSites,
// // // // // // // // } from "../services/Bookingform.service";

// // // // // // // // function todayIso(): string {
// // // // // // // //   return new Date().toISOString().slice(0, 10);
// // // // // // // // }

// // // // // // // // function plusDaysIso(n: number): string {
// // // // // // // //   const d = new Date();
// // // // // // // //   d.setDate(d.getDate() + n);
// // // // // // // //   return d.toISOString().slice(0, 10);
// // // // // // // // }

// // // // // // // // const DEFAULT_STATE: BookingFormState = {
// // // // // // // //   siteId: "",
// // // // // // // //   buildingId: "",
// // // // // // // //   floorId: "",
// // // // // // // //   fromDate: todayIso(),
// // // // // // // //   toDate: plusDaysIso(2),
// // // // // // // //   preferences: [],
// // // // // // // //   selectedSeatId: null,
// // // // // // // // };

// // // // // // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // // // // // function buildUrl(step: number, form: BookingFormState): string {
// // // // // // // //   const params = new URLSearchParams();
// // // // // // // //   params.set("step", String(step));
// // // // // // // //   if (form.siteId)         params.set("siteId",    form.siteId);
// // // // // // // //   if (form.buildingId)     params.set("buildingId", form.buildingId);
// // // // // // // //   if (form.floorId)        params.set("floorId",    form.floorId);
// // // // // // // //   if (form.fromDate)       params.set("fromDate",   form.fromDate);
// // // // // // // //   if (form.toDate)         params.set("toDate",     form.toDate);
// // // // // // // //   if (form.selectedSeatId) params.set("seatId",     form.selectedSeatId);
// // // // // // // //   // preferences stored in sessionStorage (too long for URL)
// // // // // // // //   return `/book?${params.toString()}`;
// // // // // // // // }

// // // // // // // // export function useBookingForm() {
// // // // // // // //   const router       = useRouter();
// // // // // // // //   const searchParams = useSearchParams();

// // // // // // // //   // ── Read initial state from URL ──────────────────────────────────────────
// // // // // // // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // // // // // //   const [form, setForm] = useState<BookingFormState>({
// // // // // // // //     siteId:         searchParams.get("siteId")     ?? "",
// // // // // // // //     buildingId:     searchParams.get("buildingId") ?? "",
// // // // // // // //     floorId:        searchParams.get("floorId")    ?? "",
// // // // // // // //     fromDate:       searchParams.get("fromDate")   ?? todayIso(),
// // // // // // // //     toDate:         searchParams.get("toDate")     ?? plusDaysIso(2),
// // // // // // // //     selectedSeatId: searchParams.get("seatId")     ?? null,
// // // // // // // //     preferences:    [], // restored from sessionStorage below
// // // // // // // //   });

// // // // // // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // // // // // //   const [sites, setSites]                               = useState<Site[]>([]);
// // // // // // // //   const [buildings, setBuildings]                       = useState<Building[]>([]);
// // // // // // // //   const [floors, setFloors]                             = useState<Floor[]>([]);
// // // // // // // //   const [seats, setSeats]                               = useState<Seat[]>([]);
// // // // // // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // // // // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // // // // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // // // // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // // // // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // // // // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // // // // // //   const [submitting,         setSubmitting]         = useState(false);

// // // // // // // //   const [error,        setError]        = useState<string | null>(null);
// // // // // // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // // // // // //   // ── Restore preferences from sessionStorage (client only) ───────────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     try {
// // // // // // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // // // // // //       if (saved) {
// // // // // // // //         const prefs = JSON.parse(saved) as string[];
// // // // // // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // // // // // //       }
// // // // // // // //     } catch {}
// // // // // // // //   }, []);

// // // // // // // //   // ── Persist preferences to sessionStorage whenever they change ───────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     try {
// // // // // // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // // // // // //     } catch {}
// // // // // // // //   }, [form.preferences]);

// // // // // // // //   // ── Navigate to new URL whenever step or key form fields change ──────────
// // // // // // // //   const navigateTo = useCallback((nextStep: BookingStep, nextForm: BookingFormState) => {
// // // // // // // //     setStepState(nextStep);
// // // // // // // //     router.push(buildUrl(nextStep, nextForm));
// // // // // // // //   }, [router]);

// // // // // // // //   // ── Load sites on mount ──────────────────────────────────────────────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     setLoadingSites(true);
// // // // // // // //     fetchSites()
// // // // // // // //       .then(setSites)
// // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // //       .finally(() => setLoadingSites(false));
// // // // // // // //   }, []);

// // // // // // // //   // ── Load preferences on mount ────────────────────────────────────────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     setLoadingPreferences(true);
// // // // // // // //     fetchPreferences()
// // // // // // // //       .then(setAvailablePreferences)
// // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // //       .finally(() => setLoadingPreferences(false));
// // // // // // // //   }, []);

// // // // // // // //   // ── Load buildings when siteId changes ──────────────────────────────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // // // // // //     setBuildings([]);
// // // // // // // //     setFloors([]);
// // // // // // // //     setLoadingBuildings(true);
// // // // // // // //     fetchBuildings(form.siteId)
// // // // // // // //       .then(setBuildings)
// // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // //       .finally(() => setLoadingBuildings(false));
// // // // // // // //   }, [form.siteId]);

// // // // // // // //   // ── Load floors when buildingId changes ─────────────────────────────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (!form.buildingId) { setFloors([]); return; }
// // // // // // // //     setFloors([]);
// // // // // // // //     setLoadingFloors(true);
// // // // // // // //     fetchFloors(form.buildingId)
// // // // // // // //       .then(setFloors)
// // // // // // // //       .catch((e) => setError(e.message))
// // // // // // // //       .finally(() => setLoadingFloors(false));
// // // // // // // //   }, [form.buildingId]);

// // // // // // // //   // ── Helper: map preference keys → numeric amenity IDs ───────────────────
// // // // // // // //   //
// // // // // // // //   //  The backend expects numeric amenity IDs as repeated query params
// // // // // // // //   //  (e.g. amenity_ids=1&amenity_ids=3). The form stores human-readable
// // // // // // // //   //  preference *keys* (e.g. "window_seat"). This helper resolves them
// // // // // // // //   //  using the loaded availablePreferences list.
// // // // // // // //   //
// // // // // // // //   //  NOTE: Preference.id is typed as `string` in the domain model but the
// // // // // // // //   //  backend wants numbers — we parseInt here so the service layer stays
// // // // // // // //   //  clean and does not need to know about preference keys at all.
// // // // // // // //   const resolveAmenityIds = useCallback(
// // // // // // // //     (preferenceKeys: string[]): number[] => {
// // // // // // // //       return preferenceKeys
// // // // // // // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // // // // // // //         .filter((id): id is string => id !== undefined)
// // // // // // // //         .map((id) => parseInt(id, 10))
// // // // // // // //         .filter((id) => !isNaN(id));
// // // // // // // //     },
// // // // // // // //     [availablePreferences]
// // // // // // // //   );

// // // // // // // //   // ── Re-fetch seats when landing on step 2 (e.g. after refresh) ──────────
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (
// // // // // // // //       step === 2 &&
// // // // // // // //       seats.length === 0 &&
// // // // // // // //       form.floorId &&
// // // // // // // //       form.fromDate &&
// // // // // // // //       form.toDate
// // // // // // // //     ) {
// // // // // // // //       setLoadingSeats(true);
// // // // // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // // // // //       fetchSeatsWithAvailability({
// // // // // // // //         floorId:     form.floorId,
// // // // // // // //         fromDate:    form.fromDate,
// // // // // // // //         toDate:      form.toDate,
// // // // // // // //         preferences: form.preferences,
// // // // // // // //         amenityIds,                     // ← FIX: pass resolved IDs
// // // // // // // //       })
// // // // // // // //         .then(setSeats)
// // // // // // // //         .catch((e) => setError(e.message))
// // // // // // // //         .finally(() => setLoadingSeats(false));
// // // // // // // //     }
// // // // // // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // // // // //   // ── Field setters ────────────────────────────────────────────────────────

// // // // // // // //   const setSiteId = (v: string | null) =>
// // // // // // // //     setForm((f) => ({
// // // // // // // //       ...f,
// // // // // // // //       siteId:         v ?? "",
// // // // // // // //       buildingId:     "",
// // // // // // // //       floorId:        "",
// // // // // // // //       selectedSeatId: null,
// // // // // // // //     }));

// // // // // // // //   const setBuildingId = (v: string | null) =>
// // // // // // // //     setForm((f) => ({
// // // // // // // //       ...f,
// // // // // // // //       buildingId:     v ?? "",
// // // // // // // //       floorId:        "",
// // // // // // // //       selectedSeatId: null,
// // // // // // // //     }));

// // // // // // // //   const setFloorId = (v: string | null) =>
// // // // // // // //     setForm((f) => ({
// // // // // // // //       ...f,
// // // // // // // //       floorId:        v ?? "",
// // // // // // // //       selectedSeatId: null,
// // // // // // // //     }));

// // // // // // // //   const setFromDate = (v: string) =>
// // // // // // // //     setForm((f) => ({
// // // // // // // //       ...f,
// // // // // // // //       fromDate: v,
// // // // // // // //       toDate: f.toDate < v ? v : f.toDate,
// // // // // // // //     }));

// // // // // // // //   const setToDate = (v: string) =>
// // // // // // // //     setForm((f) => ({ ...f, toDate: v }));

// // // // // // // //   const togglePreference = (key: string) =>
// // // // // // // //     setForm((f) => ({
// // // // // // // //       ...f,
// // // // // // // //       preferences: f.preferences.includes(key)
// // // // // // // //         ? f.preferences.filter((p) => p !== key)
// // // // // // // //         : [...f.preferences, key],
// // // // // // // //     }));

// // // // // // // //   const clearAll = () =>
// // // // // // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // // // // // //   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
// // // // // // // //   const findAvailableSeats = useCallback(async () => {
// // // // // // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // // // // // //     setLoadingSeats(true);
// // // // // // // //     setError(null);

// // // // // // // //     try {
// // // // // // // //       // ── FIX: resolve preference keys → numeric amenity IDs before the
// // // // // // // //       //         API call so the backend can score preference matches and
// // // // // // // //       //         return the correct preferenceMatchStatus on each seat.
// // // // // // // //       const amenityIds = resolveAmenityIds(form.preferences);

// // // // // // // //       const data = await fetchSeatsWithAvailability({
// // // // // // // //         floorId:     form.floorId,
// // // // // // // //         fromDate:    form.fromDate,
// // // // // // // //         toDate:      form.toDate,
// // // // // // // //         preferences: form.preferences,
// // // // // // // //         amenityIds,                     // ← FIX: was never passed before
// // // // // // // //       });
// // // // // // // //       setSeats(data);
// // // // // // // //       navigateTo(2, form);
// // // // // // // //     } catch (e: unknown) {
// // // // // // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // // // // // //     } finally {
// // // // // // // //       setLoadingSeats(false);
// // // // // // // //     }
// // // // // // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // // // // // //   // ── Step 2: select seat ──────────────────────────────────────────────────
// // // // // // // //   const selectSeat = (seatId: string | null) => {
// // // // // // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // // // // // //   };

// // // // // // // //   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
// // // // // // // //   const goToReview = () => {
// // // // // // // //     if (!form.selectedSeatId) return;
// // // // // // // //     navigateTo(3, form);
// // // // // // // //   };

// // // // // // // //   // ── Step 3: confirm booking ──────────────────────────────────────────────
// // // // // // // //   const confirmBooking = useCallback(async () => {
// // // // // // // //     if (!form.selectedSeatId) return;

// // // // // // // //     setSubmitting(true);
// // // // // // // //     setError(null);

// // // // // // // //     try {
// // // // // // // //       const result = await createBooking({
// // // // // // // //         site_id:      Number(form.siteId),
// // // // // // // //         building_id:  Number(form.buildingId),
// // // // // // // //         floor_id:     Number(form.floorId),
// // // // // // // //         seat_id:      Number(form.selectedSeatId),
// // // // // // // //         booking_date: form.fromDate,
// // // // // // // //       });

// // // // // // // //       setConfirmation(result);
// // // // // // // //       setStepState(3);

// // // // // // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}

// // // // // // // //     } catch (err: any) {
// // // // // // // //       const status = err?.response?.status;
// // // // // // // //       if (status === 409) {
// // // // // // // //         setError("You already have a booking for this seat on the selected date. Please choose a different seat or date.");
// // // // // // // //       } else if (status === 400) {
// // // // // // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // // // // // //       } else if (status === 403) {
// // // // // // // //         setError("You don't have permission to book this seat.");
// // // // // // // //       } else if (status === 404) {
// // // // // // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // // // // // //       } else {
// // // // // // // //         setError(err?.response?.data?.message ?? err?.message ?? "Failed to confirm booking. Please try again.");
// // // // // // // //       }
// // // // // // // //     } finally {
// // // // // // // //       setSubmitting(false);
// // // // // // // //     }
// // // // // // // //   }, [form]);

// // // // // // // //   // ── Navigation helpers ───────────────────────────────────────────────────
// // // // // // // //   const goBack = () => {
// // // // // // // //     const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// // // // // // // //     navigateTo(prevStep, form);
// // // // // // // //   };

// // // // // // // //   const resetForm = () => {
// // // // // // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // // // // //     setForm(DEFAULT_STATE);
// // // // // // // //     setStepState(1);
// // // // // // // //     setBuildings([]);
// // // // // // // //     setFloors([]);
// // // // // // // //     setSeats([]);
// // // // // // // //     setConfirmation(null);
// // // // // // // //     setError(null);
// // // // // // // //     router.push("/book");
// // // // // // // //   };

// // // // // // // //   // ── Derived ──────────────────────────────────────────────────────────────
// // // // // // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // // // // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // // // // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // // // // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // // // // // //   const dayCount = (() => {
// // // // // // // //     if (!form.fromDate || !form.toDate) return 0;
// // // // // // // //     const diff =
// // // // // // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // // // // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // // // // // //     return Math.round(diff / 86_400_000) + 1;
// // // // // // // //   })();

// // // // // // // //   const step1Valid =
// // // // // // // //     !!form.siteId &&
// // // // // // // //     !!form.buildingId &&
// // // // // // // //     !!form.floorId &&
// // // // // // // //     !!form.fromDate &&
// // // // // // // //     !!form.toDate;

// // // // // // // //   return {
// // // // // // // //     step,
// // // // // // // //     form,
// // // // // // // //     sites,
// // // // // // // //     buildings,
// // // // // // // //     floors,
// // // // // // // //     seats,
// // // // // // // //     availablePreferences,
// // // // // // // //     confirmation,
// // // // // // // //     error,
// // // // // // // //     loadingSites,
// // // // // // // //     loadingBuildings,
// // // // // // // //     loadingFloors,
// // // // // // // //     loadingSeats,
// // // // // // // //     loadingPreferences,
// // // // // // // //     submitting,
// // // // // // // //     selectedSite,
// // // // // // // //     selectedBuilding,
// // // // // // // //     selectedFloor,
// // // // // // // //     selectedSeat,
// // // // // // // //     dayCount,
// // // // // // // //     step1Valid,
// // // // // // // //     setSiteId,
// // // // // // // //     setBuildingId,
// // // // // // // //     setFloorId,
// // // // // // // //     setFromDate,
// // // // // // // //     setToDate,
// // // // // // // //     togglePreference,
// // // // // // // //     clearAll,
// // // // // // // //     findAvailableSeats,
// // // // // // // //     selectSeat,
// // // // // // // //     goToReview,
// // // // // // // //     confirmBooking,
// // // // // // // //     goBack,
// // // // // // // //     resetForm,
// // // // // // // //   };
// // // // // // // // }

// // // // // // // "use client";

// // // // // // // import { useCallback, useEffect, useState } from "react";
// // // // // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // // // // import {
// // // // // // //   BookingFormState,
// // // // // // //   BookingStep,
// // // // // // //   Building,
// // // // // // //   CreateBookingResponse,
// // // // // // //   Floor,
// // // // // // //   Preference,
// // // // // // //   Seat,
// // // // // // //   Site,
// // // // // // // } from "../types/Bookingform.types";

// // // // // // // import {
// // // // // // //   createBooking,
// // // // // // //   fetchBuildings,
// // // // // // //   fetchFloors,
// // // // // // //   fetchPreferences,
// // // // // // //   fetchSeatsWithAvailability,
// // // // // // //   fetchSites,
// // // // // // // } from "../services/Bookingform.service";

// // // // // // // function todayIso(): string {
// // // // // // //   return new Date().toISOString().slice(0, 10);
// // // // // // // }

// // // // // // // function plusDaysIso(n: number): string {
// // // // // // //   const d = new Date();
// // // // // // //   d.setDate(d.getDate() + n);
// // // // // // //   return d.toISOString().slice(0, 10);
// // // // // // // }

// // // // // // // const DEFAULT_STATE: BookingFormState = {
// // // // // // //   siteId: "",
// // // // // // //   buildingId: "",
// // // // // // //   floorId: "",
// // // // // // //   fromDate: todayIso(),
// // // // // // //   toDate: plusDaysIso(2),
// // // // // // //   preferences: [],
// // // // // // //   selectedSeatId: null,
// // // // // // // };

// // // // // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // // // // function buildUrl(step: number, form: BookingFormState): string {
// // // // // // //   const params = new URLSearchParams();
// // // // // // //   params.set("step", String(step));
// // // // // // //   if (form.siteId)         params.set("siteId",      form.siteId);
// // // // // // //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// // // // // // //   if (form.floorId)        params.set("floorId",      form.floorId);
// // // // // // //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// // // // // // //   if (form.toDate)         params.set("toDate",       form.toDate);
// // // // // // //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// // // // // // //   return `/book?${params.toString()}`;
// // // // // // // }

// // // // // // // export function useBookingForm() {
// // // // // // //   const router       = useRouter();
// // // // // // //   const searchParams = useSearchParams();

// // // // // // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // // // // //   const [form, setForm] = useState<BookingFormState>({
// // // // // // //     siteId:         searchParams.get("siteId")     ?? "",
// // // // // // //     buildingId:     searchParams.get("buildingId") ?? "",
// // // // // // //     floorId:        searchParams.get("floorId")    ?? "",
// // // // // // //     fromDate:       searchParams.get("fromDate")   ?? todayIso(),
// // // // // // //     toDate:         searchParams.get("toDate")     ?? plusDaysIso(2),
// // // // // // //     selectedSeatId: searchParams.get("seatId")     ?? null,
// // // // // // //     preferences:    [],
// // // // // // //   });

// // // // // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // // // // //   const [sites, setSites]                               = useState<Site[]>([]);
// // // // // // //   const [buildings, setBuildings]                       = useState<Building[]>([]);
// // // // // // //   const [floors, setFloors]                             = useState<Floor[]>([]);
// // // // // // //   const [seats, setSeats]                               = useState<Seat[]>([]);
// // // // // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // // // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // // // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // // // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // // // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // // // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // // // // //   const [submitting,         setSubmitting]         = useState(false);

// // // // // // //   const [error,        setError]        = useState<string | null>(null);
// // // // // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // // // // //   // ── Restore preferences from sessionStorage ──────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     try {
// // // // // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // // // // //       if (saved) {
// // // // // // //         const prefs = JSON.parse(saved) as string[];
// // // // // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // // // // //       }
// // // // // // //     } catch {}
// // // // // // //   }, []);

// // // // // // //   useEffect(() => {
// // // // // // //     try {
// // // // // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // // // // //     } catch {}
// // // // // // //   }, [form.preferences]);

// // // // // // //   // ── Navigate helper ──────────────────────────────────────────────────────
// // // // // // //   const navigateTo = useCallback(
// // // // // // //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// // // // // // //       setStepState(nextStep);
// // // // // // //       router.push(buildUrl(nextStep, nextForm));
// // // // // // //     },
// // // // // // //     [router]
// // // // // // //   );

// // // // // // //   // ── Load sites ───────────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     setLoadingSites(true);
// // // // // // //     fetchSites()
// // // // // // //       .then(setSites)
// // // // // // //       .catch((e) => setError(e.message))
// // // // // // //       .finally(() => setLoadingSites(false));
// // // // // // //   }, []);

// // // // // // //   // ── Load preferences ─────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     setLoadingPreferences(true);
// // // // // // //     fetchPreferences()
// // // // // // //       .then(setAvailablePreferences)
// // // // // // //       .catch((e) => setError(e.message))
// // // // // // //       .finally(() => setLoadingPreferences(false));
// // // // // // //   }, []);

// // // // // // //   // ── Load buildings ───────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // // // // //     setBuildings([]);
// // // // // // //     setFloors([]);
// // // // // // //     setLoadingBuildings(true);
// // // // // // //     fetchBuildings(form.siteId)
// // // // // // //       .then(setBuildings)
// // // // // // //       .catch((e) => setError(e.message))
// // // // // // //       .finally(() => setLoadingBuildings(false));
// // // // // // //   }, [form.siteId]);

// // // // // // //   // ── Load floors ──────────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     if (!form.buildingId) { setFloors([]); return; }
// // // // // // //     setFloors([]);
// // // // // // //     setLoadingFloors(true);
// // // // // // //     fetchFloors(form.buildingId)
// // // // // // //       .then(setFloors)
// // // // // // //       .catch((e) => setError(e.message))
// // // // // // //       .finally(() => setLoadingFloors(false));
// // // // // // //   }, [form.buildingId]);

// // // // // // //   // ── Resolve preference keys → numeric amenity IDs ────────────────────────
// // // // // // //   const resolveAmenityIds = useCallback(
// // // // // // //     (preferenceKeys: string[]): number[] => {
// // // // // // //       return preferenceKeys
// // // // // // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // // // // // //         .filter((id): id is string => id !== undefined)
// // // // // // //         .map((id) => parseInt(id, 10))
// // // // // // //         .filter((id) => !isNaN(id));
// // // // // // //     },
// // // // // // //     [availablePreferences]
// // // // // // //   );

// // // // // // //   // ── Re-fetch seats on step 2 refresh ────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     if (
// // // // // // //       step === 2 &&
// // // // // // //       seats.length === 0 &&
// // // // // // //       form.floorId &&
// // // // // // //       form.fromDate &&
// // // // // // //       form.toDate
// // // // // // //     ) {
// // // // // // //       setLoadingSeats(true);
// // // // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // // // //       fetchSeatsWithAvailability({
// // // // // // //         floorId:     form.floorId,
// // // // // // //         fromDate:    form.fromDate,
// // // // // // //         toDate:      form.toDate,
// // // // // // //         preferences: form.preferences,
// // // // // // //         amenityIds,
// // // // // // //       })
// // // // // // //         .then(setSeats)
// // // // // // //         .catch((e) => setError(e.message))
// // // // // // //         .finally(() => setLoadingSeats(false));
// // // // // // //     }
// // // // // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // // // //   // ── Field setters ────────────────────────────────────────────────────────

// // // // // // //   const setSiteId = (v: string | null) =>
// // // // // // //     setForm((f) => ({
// // // // // // //       ...f,
// // // // // // //       siteId:         v ?? "",
// // // // // // //       buildingId:     "",
// // // // // // //       floorId:        "",
// // // // // // //       selectedSeatId: null,
// // // // // // //     }));

// // // // // // //   const setBuildingId = (v: string | null) =>
// // // // // // //     setForm((f) => ({
// // // // // // //       ...f,
// // // // // // //       buildingId:     v ?? "",
// // // // // // //       floorId:        "",
// // // // // // //       selectedSeatId: null,
// // // // // // //     }));

// // // // // // //   const setFloorId = (v: string | null) =>
// // // // // // //     setForm((f) => ({
// // // // // // //       ...f,
// // // // // // //       floorId:        v ?? "",
// // // // // // //       selectedSeatId: null,
// // // // // // //     }));

// // // // // // //   const setFromDate = (v: string) =>
// // // // // // //     setForm((f) => ({
// // // // // // //       ...f,
// // // // // // //       fromDate: v,
// // // // // // //       toDate: f.toDate < v ? v : f.toDate,
// // // // // // //     }));

// // // // // // //   const setToDate = (v: string) =>
// // // // // // //     setForm((f) => ({ ...f, toDate: v }));

// // // // // // //   const togglePreference = (key: string) =>
// // // // // // //     setForm((f) => ({
// // // // // // //       ...f,
// // // // // // //       preferences: f.preferences.includes(key)
// // // // // // //         ? f.preferences.filter((p) => p !== key)
// // // // // // //         : [...f.preferences, key],
// // // // // // //     }));

// // // // // // //   const clearAll = () =>
// // // // // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // // // // //   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
// // // // // // //   const findAvailableSeats = useCallback(async () => {
// // // // // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // // // // //     setLoadingSeats(true);
// // // // // // //     setError(null);

// // // // // // //     try {
// // // // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // // // //       const data = await fetchSeatsWithAvailability({
// // // // // // //         floorId:     form.floorId,
// // // // // // //         fromDate:    form.fromDate,
// // // // // // //         toDate:      form.toDate,
// // // // // // //         preferences: form.preferences,
// // // // // // //         amenityIds,
// // // // // // //       });
// // // // // // //       setSeats(data);
// // // // // // //       navigateTo(2, form);
// // // // // // //     } catch (e: unknown) {
// // // // // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // // // // //     } finally {
// // // // // // //       setLoadingSeats(false);
// // // // // // //     }
// // // // // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // // // // //   // ── Step 2: select seat ──────────────────────────────────────────────────
// // // // // // //   const selectSeat = (seatId: string | null) => {
// // // // // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // // // // //   };

// // // // // // //   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
// // // // // // //   const goToReview = () => {
// // // // // // //     if (!form.selectedSeatId) return;
// // // // // // //     navigateTo(3, form);
// // // // // // //   };

// // // // // // //   // ── Step 3: confirm booking ──────────────────────────────────────────────
// // // // // // //   const confirmBooking = useCallback(async () => {
// // // // // // //     if (!form.selectedSeatId) return;

// // // // // // //     setSubmitting(true);
// // // // // // //     setError(null);

// // // // // // //     try {
// // // // // // //       const result = await createBooking({
// // // // // // //         site_id:      Number(form.siteId),
// // // // // // //         building_id:  Number(form.buildingId),
// // // // // // //         floor_id:     Number(form.floorId),
// // // // // // //         seat_id:      Number(form.selectedSeatId),
// // // // // // //         booking_date: form.fromDate,
// // // // // // //       });

// // // // // // //       setConfirmation(result);
// // // // // // //       setStepState(3);

// // // // // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // // // //     } catch (err: any) {
// // // // // // //       const status = err?.response?.status;
// // // // // // //       if (status === 409) {
// // // // // // //         setError("You already have a booking for this seat on the selected date. Please choose a different seat or date.");
// // // // // // //       } else if (status === 400) {
// // // // // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // // // // //       } else if (status === 403) {
// // // // // // //         setError("You don't have permission to book this seat.");
// // // // // // //       } else if (status === 404) {
// // // // // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // // // // //       } else {
// // // // // // //         setError(
// // // // // // //           err?.response?.data?.message ??
// // // // // // //           err?.message ??
// // // // // // //           "Failed to confirm booking. Please try again."
// // // // // // //         );
// // // // // // //       }
// // // // // // //     } finally {
// // // // // // //       setSubmitting(false);
// // // // // // //     }
// // // // // // //   }, [form]);

// // // // // // //   // ── Navigation helpers ───────────────────────────────────────────────────
// // // // // // //   // const goBack = () => {
// // // // // // //   //   const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// // // // // // //   //   navigateTo(prevStep, form);
// // // // // // //   // };
// // // // // // //   const goBack = () => {
// // // // // // //   const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// // // // // // //   const clearedForm = prevStep < 2
// // // // // // //     ? { ...form, selectedSeatId: null }  // going back to step 1, clear seat
// // // // // // //     : form;                              // step 2→3 back, keep seat
// // // // // // //   setForm(clearedForm);
// // // // // // //   navigateTo(prevStep, clearedForm);
// // // // // // // };

// // // // // // //   const resetForm = () => {
// // // // // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // // // //     setForm(DEFAULT_STATE);
// // // // // // //     setStepState(1);
// // // // // // //     setBuildings([]);
// // // // // // //     setFloors([]);
// // // // // // //     setSeats([]);
// // // // // // //     setConfirmation(null);
// // // // // // //     setError(null);
// // // // // // //     router.push("/book");
// // // // // // //   };

// // // // // // //   // ── Derived ──────────────────────────────────────────────────────────────
// // // // // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // // // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // // // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // // // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // // // // //   const dayCount = (() => {
// // // // // // //     if (!form.fromDate || !form.toDate) return 0;
// // // // // // //     const diff =
// // // // // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // // // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // // // // //     return Math.round(diff / 86_400_000) + 1;
// // // // // // //   })();

// // // // // // //   const step1Valid =
// // // // // // //     !!form.siteId &&
// // // // // // //     !!form.buildingId &&
// // // // // // //     !!form.floorId &&
// // // // // // //     !!form.fromDate &&
// // // // // // //     !!form.toDate;

// // // // // // //   return {
// // // // // // //     step,
// // // // // // //     form,
// // // // // // //     sites,
// // // // // // //     buildings,
// // // // // // //     floors,
// // // // // // //     seats,
// // // // // // //     availablePreferences,
// // // // // // //     confirmation,
// // // // // // //     error,
// // // // // // //     loadingSites,
// // // // // // //     loadingBuildings,
// // // // // // //     loadingFloors,
// // // // // // //     loadingSeats,
// // // // // // //     loadingPreferences,
// // // // // // //     submitting,
// // // // // // //     selectedSite,
// // // // // // //     selectedBuilding,
// // // // // // //     selectedFloor,
// // // // // // //     selectedSeat,
// // // // // // //     dayCount,
// // // // // // //     step1Valid,
// // // // // // //     setSiteId,
// // // // // // //     setBuildingId,
// // // // // // //     setFloorId,
// // // // // // //     setFromDate,
// // // // // // //     setToDate,
// // // // // // //     togglePreference,
// // // // // // //     clearAll,
// // // // // // //     findAvailableSeats,
// // // // // // //     selectSeat,
// // // // // // //     goToReview,
// // // // // // //     confirmBooking,
// // // // // // //     goBack,
// // // // // // //     resetForm,
// // // // // // //   };
// // // // // // // }

// // // // // // "use client";

// // // // // // import { useCallback, useEffect, useState } from "react";
// // // // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // // // import {
// // // // // //   BookingFormState,
// // // // // //   BookingStep,
// // // // // //   Building,
// // // // // //   CreateBookingResponse,
// // // // // //   Floor,
// // // // // //   Preference,
// // // // // //   Seat,
// // // // // //   Site,
// // // // // // } from "../types/Bookingform.types";

// // // // // // import {
// // // // // //   createBooking,
// // // // // //   fetchBuildings,
// // // // // //   fetchFloors,
// // // // // //   fetchPreferences,
// // // // // //   fetchSeatsWithAvailability,
// // // // // //   fetchSites,
// // // // // // } from "../services/Bookingform.service";
// // // // // // import { cancelBooking } from "@/features/bookings/services/bookings.service";



// // // // // // function todayIso(): string {
// // // // // //   return new Date().toISOString().slice(0, 10);
// // // // // // }

// // // // // // function plusDaysIso(n: number): string {
// // // // // //   const d = new Date();
// // // // // //   d.setDate(d.getDate() + n);
// // // // // //   return d.toISOString().slice(0, 10);
// // // // // // }

// // // // // // const DEFAULT_STATE: BookingFormState = {
// // // // // //   siteId: "",
// // // // // //   buildingId: "",
// // // // // //   floorId: "",
// // // // // //   fromDate: todayIso(),
// // // // // //   toDate: plusDaysIso(2),
// // // // // //   preferences: [],
// // // // // //   selectedSeatId: null,
// // // // // // };

// // // // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // // // function buildUrl(step: number, form: BookingFormState): string {
// // // // // //   const params = new URLSearchParams();
// // // // // //   params.set("step", String(step));
// // // // // //   if (form.siteId)         params.set("siteId",      form.siteId);
// // // // // //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// // // // // //   if (form.floorId)        params.set("floorId",      form.floorId);
// // // // // //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// // // // // //   if (form.toDate)         params.set("toDate",       form.toDate);
// // // // // //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// // // // // //   return `/book?${params.toString()}`;
// // // // // // }

// // // // // // export function useBookingForm() {
// // // // // //   const router       = useRouter();
// // // // // //   // const searchParams = useSearchParams();

// // // // // //   // // ── Modify-mode params (injected by MyBookingsPage redirect) ─────────────
// // // // // //   // const modifyBookingId = searchParams.get("modifyBookingId"); // existing booking ID
// // // // // //   // const modifyDate      = searchParams.get("date");            // pre-fill date
// // // // // //  // const isModifyMode    = Boolean(modifyBookingId);

// // // // // //   // In your booking page component
// // // // // // const searchParams = useSearchParams();

// // // // // // const modifyBookingId = searchParams.get("modifyBookingId");
// // // // // //   const isModifyMode    = Boolean(modifyBookingId);
// // // // // // const prefillLocation = searchParams.get("location");   // e.g. "HQ Mumbai"
// // // // // // const prefillFloor    = searchParams.get("floor");      // e.g. "Floor 3"
// // // // // // const prefillSeat     = searchParams.get("seat");       // e.g. "A-12"

// // // // // // // Single date (today's behaviour)
// // // // // // const prefillDate     = searchParams.get("date");

// // // // // // // Multi-date range (ready for when you add range picker)
// // // // // // const prefillFromDate = searchParams.get("fromDate");
// // // // // // const prefillToDate   = searchParams.get("toDate");

// // // // // // // Use whichever is relevant based on your booking mode:
// // // // // // const isMultiDate = prefillFromDate !== prefillToDate; // or based on a toggle

// // // // // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // // // //   const [form, setForm] = useState<BookingFormState>({
// // // // // //     siteId:         searchParams.get("siteId")     ?? "",
// // // // // //     buildingId:     searchParams.get("buildingId") ?? "",
// // // // // //     floorId:        searchParams.get("floorId")    ?? "",
// // // // // //     // If coming from modify redirect, use modifyDate for both dates;
// // // // // //     // otherwise fall back to URL params or defaults.
// // // // // //     fromDate:       prefillFromDate ?? searchParams.get("fromDate") ?? todayIso(),
// // // // // //     toDate:         prefillToDate ?? searchParams.get("toDate")   ?? plusDaysIso(2),
// // // // // //     selectedSeatId: searchParams.get("seatId") ?? null,
// // // // // //     preferences:    [],
// // // // // //   });

// // // // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // // // //   const [sites, setSites]                               = useState<Site[]>([]);
// // // // // //   const [buildings, setBuildings]                       = useState<Building[]>([]);
// // // // // //   const [floors, setFloors]                             = useState<Floor[]>([]);
// // // // // //   const [seats, setSeats]                               = useState<Seat[]>([]);
// // // // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // // // //   const [submitting,         setSubmitting]         = useState(false);

// // // // // //   const [error,        setError]        = useState<string | null>(null);
// // // // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // // // //   // ── Restore preferences from sessionStorage ──────────────────────────────
// // // // // //   useEffect(() => {
// // // // // //     try {
// // // // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // // // //       if (saved) {
// // // // // //         const prefs = JSON.parse(saved) as string[];
// // // // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // // // //       }
// // // // // //     } catch {}
// // // // // //   }, []);

// // // // // //   useEffect(() => {
// // // // // //     try {
// // // // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // // // //     } catch {}
// // // // // //   }, [form.preferences]);

// // // // // //   // ── Navigate helper ──────────────────────────────────────────────────────
// // // // // //   const navigateTo = useCallback(
// // // // // //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// // // // // //       setStepState(nextStep);
// // // // // //       router.push(buildUrl(nextStep, nextForm));
// // // // // //     },
// // // // // //     [router]
// // // // // //   );

// // // // // //   // ── Load sites ───────────────────────────────────────────────────────────
// // // // // //   useEffect(() => {
// // // // // //     setLoadingSites(true);
// // // // // //     fetchSites()
// // // // // //       .then(setSites)
// // // // // //       .catch((e) => setError(e.message))
// // // // // //       .finally(() => setLoadingSites(false));
// // // // // //   }, []);

// // // // // //   // ── Load preferences ─────────────────────────────────────────────────────
// // // // // //   useEffect(() => {
// // // // // //     setLoadingPreferences(true);
// // // // // //     fetchPreferences()
// // // // // //       .then(setAvailablePreferences)
// // // // // //       .catch((e) => setError(e.message))
// // // // // //       .finally(() => setLoadingPreferences(false));
// // // // // //   }, []);

// // // // // //   // ── Load buildings ───────────────────────────────────────────────────────
// // // // // //   useEffect(() => {
// // // // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // // // //     setBuildings([]);
// // // // // //     setFloors([]);
// // // // // //     setLoadingBuildings(true);
// // // // // //     fetchBuildings(form.siteId)
// // // // // //       .then(setBuildings)
// // // // // //       .catch((e) => setError(e.message))
// // // // // //       .finally(() => setLoadingBuildings(false));
// // // // // //   }, [form.siteId]);

// // // // // //   // ── Load floors ──────────────────────────────────────────────────────────
// // // // // //   useEffect(() => {
// // // // // //     if (!form.buildingId) { setFloors([]); return; }
// // // // // //     setFloors([]);
// // // // // //     setLoadingFloors(true);
// // // // // //     fetchFloors(form.buildingId)
// // // // // //       .then(setFloors)
// // // // // //       .catch((e) => setError(e.message))
// // // // // //       .finally(() => setLoadingFloors(false));
// // // // // //   }, [form.buildingId]);

// // // // // //   // ── Resolve preference keys → numeric amenity IDs ────────────────────────
// // // // // //   const resolveAmenityIds = useCallback(
// // // // // //     (preferenceKeys: string[]): number[] => {
// // // // // //       return preferenceKeys
// // // // // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // // // // //         .filter((id): id is string => id !== undefined)
// // // // // //         .map((id) => parseInt(id, 10))
// // // // // //         .filter((id) => !isNaN(id));
// // // // // //     },
// // // // // //     [availablePreferences]
// // // // // //   );

// // // // // //   // ── Re-fetch seats on step 2 refresh ────────────────────────────────────
// // // // // //   useEffect(() => {
// // // // // //     if (
// // // // // //       step === 2 &&
// // // // // //       seats.length === 0 &&
// // // // // //       form.floorId &&
// // // // // //       form.fromDate &&
// // // // // //       form.toDate
// // // // // //     ) {
// // // // // //       setLoadingSeats(true);
// // // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // // //       fetchSeatsWithAvailability({
// // // // // //         floorId:     form.floorId,
// // // // // //         fromDate:    form.fromDate,
// // // // // //         toDate:      form.toDate,
// // // // // //         preferences: form.preferences,
// // // // // //         amenityIds,
// // // // // //       })
// // // // // //         .then(setSeats)
// // // // // //         .catch((e) => setError(e.message))
// // // // // //         .finally(() => setLoadingSeats(false));
// // // // // //     }
// // // // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // // //   // ── Field setters ────────────────────────────────────────────────────────

// // // // // //   const setSiteId = (v: string | null) =>
// // // // // //     setForm((f) => ({
// // // // // //       ...f,
// // // // // //       siteId:         v ?? "",
// // // // // //       buildingId:     "",
// // // // // //       floorId:        "",
// // // // // //       selectedSeatId: null,
// // // // // //     }));

// // // // // //   const setBuildingId = (v: string | null) =>
// // // // // //     setForm((f) => ({
// // // // // //       ...f,
// // // // // //       buildingId:     v ?? "",
// // // // // //       floorId:        "",
// // // // // //       selectedSeatId: null,
// // // // // //     }));

// // // // // //   const setFloorId = (v: string | null) =>
// // // // // //     setForm((f) => ({
// // // // // //       ...f,
// // // // // //       floorId:        v ?? "",
// // // // // //       selectedSeatId: null,
// // // // // //     }));

// // // // // //   const setFromDate = (v: string) =>
// // // // // //     setForm((f) => ({
// // // // // //       ...f,
// // // // // //       fromDate: v,
// // // // // //       // In modify mode keep fromDate === toDate (single day booking)
// // // // // //       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
// // // // // //     }));

// // // // // //   const setToDate = (v: string) =>
// // // // // //     setForm((f) => ({ ...f, toDate: v }));

// // // // // //   const togglePreference = (key: string) =>
// // // // // //     setForm((f) => ({
// // // // // //       ...f,
// // // // // //       preferences: f.preferences.includes(key)
// // // // // //         ? f.preferences.filter((p) => p !== key)
// // // // // //         : [...f.preferences, key],
// // // // // //     }));

// // // // // //   const clearAll = () =>
// // // // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // // // //   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
// // // // // //   const findAvailableSeats = useCallback(async () => {
// // // // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // // // //     setLoadingSeats(true);
// // // // // //     setError(null);

// // // // // //     try {
// // // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // // //       const data = await fetchSeatsWithAvailability({
// // // // // //         floorId:     form.floorId,
// // // // // //         fromDate:    form.fromDate,
// // // // // //         toDate:      form.toDate,
// // // // // //         preferences: form.preferences,
// // // // // //         amenityIds,
// // // // // //       });
// // // // // //       setSeats(data);
// // // // // //       navigateTo(2, form);
// // // // // //     } catch (e: unknown) {
// // // // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // // // //     } finally {
// // // // // //       setLoadingSeats(false);
// // // // // //     }
// // // // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // // // //   // ── Step 2: select seat ──────────────────────────────────────────────────
// // // // // //   const selectSeat = (seatId: string | null) => {
// // // // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // // // //   };

// // // // // //   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
// // // // // //   const goToReview = () => {
// // // // // //     if (!form.selectedSeatId) return;
// // // // // //     navigateTo(3, form);
// // // // // //   };

// // // // // //   // ── Step 3: confirm booking ──────────────────────────────────────────────
// // // // // //   const confirmBooking = useCallback(async () => {
// // // // // //     if (!form.selectedSeatId) return;

// // // // // //     setSubmitting(true);
// // // // // //     setError(null);

// // // // // //     try {
// // // // // //       // ── Modify mode: cancel the original booking first ──────────────────
// // // // // //       if (isModifyMode && modifyBookingId) {
// // // // // //         try {
// // // // // //           await cancelBooking(modifyBookingId, "Modified by user");
// // // // // //         } catch (cancelErr: any) {
// // // // // //           // If the original booking is already cancelled / not found, continue.
// // // // // //           // Any other error should surface to the user.
// // // // // //           const status = cancelErr?.response?.status;
// // // // // //           if (status !== 404 && status !== 409) {
// // // // // //             throw new Error(
// // // // // //               cancelErr?.response?.data?.message ??
// // // // // //               "Failed to cancel the original booking before modifying. Please try again."
// // // // // //             );
// // // // // //           }
// // // // // //         }
// // // // // //       }

// // // // // //       // ── Create the new booking ──────────────────────────────────────────
// // // // // //       const result = await createBooking({
// // // // // //         site_id:      Number(form.siteId),
// // // // // //         building_id:  Number(form.buildingId),
// // // // // //         floor_id:     Number(form.floorId),
// // // // // //         seat_id:      Number(form.selectedSeatId),
// // // // // //         booking_date: form.fromDate,
// // // // // //       });

// // // // // //       setConfirmation(result);
// // // // // //       setStepState(3);

// // // // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // // //     } catch (err: any) {
// // // // // //       const status = err?.response?.status;
// // // // // //       if (status === 409) {
// // // // // //         setError("This seat is already booked for the selected date. Please choose a different seat.");
// // // // // //       } else if (status === 400) {
// // // // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // // // //       } else if (status === 403) {
// // // // // //         setError("You don't have permission to book this seat.");
// // // // // //       } else if (status === 404) {
// // // // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // // // //       } else {
// // // // // //         setError(
// // // // // //           err?.response?.data?.message ??
// // // // // //           err?.message ??
// // // // // //           "Failed to confirm booking. Please try again."
// // // // // //         );
// // // // // //       }
// // // // // //     } finally {
// // // // // //       setSubmitting(false);
// // // // // //     }
// // // // // //   }, [form, isModifyMode, modifyBookingId]);

// // // // // //   // ── Navigation helpers ───────────────────────────────────────────────────
// // // // // //   const goBack = () => {
// // // // // //     const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// // // // // //     const clearedForm = prevStep < 2
// // // // // //       ? { ...form, selectedSeatId: null }
// // // // // //       : form;
// // // // // //     setForm(clearedForm);
// // // // // //     navigateTo(prevStep, clearedForm);
// // // // // //   };

// // // // // //   const resetForm = () => {
// // // // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // // //     setForm(DEFAULT_STATE);
// // // // // //     setStepState(1);
// // // // // //     setBuildings([]);
// // // // // //     setFloors([]);
// // // // // //     setSeats([]);
// // // // // //     setConfirmation(null);
// // // // // //     setError(null);
// // // // // //     router.push("/book");
// // // // // //   };

// // // // // //   // ── Derived ──────────────────────────────────────────────────────────────
// // // // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // // // //   const dayCount = (() => {
// // // // // //     if (!form.fromDate || !form.toDate) return 0;
// // // // // //     const diff =
// // // // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // // // //     return Math.round(diff / 86_400_000) + 1;
// // // // // //   })();

// // // // // //   const step1Valid =
// // // // // //     !!form.siteId &&
// // // // // //     !!form.buildingId &&
// // // // // //     !!form.floorId &&
// // // // // //     !!form.fromDate &&
// // // // // //     !!form.toDate;

// // // // // //   return {
// // // // // //     step,
// // // // // //     form,
// // // // // //     sites,
// // // // // //     buildings,
// // // // // //     floors,
// // // // // //     seats,
// // // // // //     availablePreferences,
// // // // // //     confirmation,
// // // // // //     error,
// // // // // //     loadingSites,
// // // // // //     loadingBuildings,
// // // // // //     loadingFloors,
// // // // // //     loadingSeats,
// // // // // //     loadingPreferences,
// // // // // //     submitting,
// // // // // //     selectedSite,
// // // // // //     selectedBuilding,
// // // // // //     selectedFloor,
// // // // // //     selectedSeat,
// // // // // //     dayCount,
// // // // // //     step1Valid,
// // // // // //     // ── Modify mode ────────────────────────────────────────────────────────
// // // // // //     isModifyMode,
// // // // // //     modifyBookingId,
// // // // // //     setSiteId,
// // // // // //     setBuildingId,
// // // // // //     setFloorId,
// // // // // //     setFromDate,
// // // // // //     setToDate,
// // // // // //     togglePreference,
// // // // // //     clearAll,
// // // // // //     findAvailableSeats,
// // // // // //     selectSeat,
// // // // // //     goToReview,
// // // // // //     confirmBooking,
// // // // // //     goBack,
// // // // // //     resetForm,
// // // // // //   };
// // // // // // }

// // // // // "use client";

// // // // // import { useCallback, useEffect, useState } from "react";
// // // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // // import {
// // // // //   BookingFormState,
// // // // //   BookingStep,
// // // // //   Building,
// // // // //   CreateBookingResponse,
// // // // //   Floor,
// // // // //   Preference,
// // // // //   Seat,
// // // // //   Site,
// // // // // } from "../types/Bookingform.types";

// // // // // import {
// // // // //   createBooking,
// // // // //   fetchBuildings,
// // // // //   fetchFloors,
// // // // //   fetchPreferences,
// // // // //   fetchSeatsWithAvailability,
// // // // //   fetchSites,
// // // // // } from "../services/Bookingform.service";
// // // // // import { cancelBooking } from "@/features/bookings/services/bookings.service";

// // // // // function todayIso(): string {
// // // // //   return new Date().toISOString().slice(0, 10);
// // // // // }

// // // // // function plusDaysIso(n: number): string {
// // // // //   const d = new Date();
// // // // //   d.setDate(d.getDate() + n);
// // // // //   return d.toISOString().slice(0, 10);
// // // // // }

// // // // // const DEFAULT_STATE: BookingFormState = {
// // // // //   siteId: "",
// // // // //   buildingId: "",
// // // // //   floorId: "",
// // // // //   fromDate: todayIso(),
// // // // //   toDate: plusDaysIso(2),
// // // // //   preferences: [],
// // // // //   selectedSeatId: null,
// // // // // };

// // // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // // function buildUrl(step: number, form: BookingFormState): string {
// // // // //   const params = new URLSearchParams();
// // // // //   params.set("step", String(step));
// // // // //   if (form.siteId)         params.set("siteId",      form.siteId);
// // // // //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// // // // //   if (form.floorId)        params.set("floorId",      form.floorId);
// // // // //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// // // // //   if (form.toDate)         params.set("toDate",       form.toDate);
// // // // //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// // // // //   return `/book?${params.toString()}`;
// // // // // }

// // // // // export function useBookingForm() {
// // // // //   const router       = useRouter();
// // // // //   // const searchParams = useSearchParams();

// // // // //   // // ── Modify-mode params (injected by MyBookingsPage redirect) ──────────────
// // // // //   // const modifyBookingId = searchParams.get("modifyBookingId") ?? null;
// // // // //   // const isModifyMode    = Boolean(modifyBookingId);

// // // // //   // // ── Prefill params from modify redirect ────────────────────────────────────
// // // // //   // // These are human-readable names (e.g. "HQ Mumbai", "Floor 3") used to
// // // // //   // // resolve IDs once the lists load. siteId/buildingId/floorId URL params
// // // // //   // // take priority when already present (deep-link or back-navigation).
// // // // //   // const prefillLocationName = searchParams.get("location") ?? null;
// // // // //   // const prefillFloorName    = searchParams.get("floor")    ?? null;
// // // // //   // const prefillSeat         = searchParams.get("seat")     ?? null;

// // // // //   // // ── Date params ────────────────────────────────────────────────────────────
// // // // //   // // fromDate / toDate come directly from the URL (set by handleModify or manual nav).
// // // // //   // // Single-date modify links set both to the same value; multi-date selects differ.
// // // // //   // const prefillFromDate = searchParams.get("fromDate") ?? null;
// // // // //   // const prefillToDate   = searchParams.get("toDate")   ?? null;

// // // // //   // const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // // //   // const [form, setForm] = useState<BookingFormState>({
// // // // //   //   // ID-based params take priority (back-nav / deep links); otherwise start empty
// // // // //   //   // and let the name-resolution effects below fill them in.
// // // // //   //   siteId:         searchParams.get("siteId")     ?? "",
// // // // //   //   buildingId:     searchParams.get("buildingId") ?? "",
// // // // //   //   floorId:        searchParams.get("floorId")    ?? "",
// // // // //   //   fromDate:       prefillFromDate ?? todayIso(),
// // // // //   //   toDate:         prefillToDate   ?? (isModifyMode ? (prefillFromDate ?? todayIso()) : plusDaysIso(2)),
// // // // //   //   selectedSeatId: searchParams.get("seatId") ?? null,
// // // // //   //   preferences:    [],
// // // // //   // });


// // // // //   const searchParams = useSearchParams();

// // // // // // ── Modify-mode params ────────────────────────────────────────────────────
// // // // // const modifyBookingId  = searchParams.get("modifyBookingId");
// // // // // const isModifyMode     = Boolean(modifyBookingId);

// // // // // // ── Prefill by name (from MyBookings redirect) ────────────────────────────
// // // // // const prefillLocationName = searchParams.get("locationName") ?? null;
// // // // // const prefillFloorName    = searchParams.get("floorName")    ?? null;
// // // // // const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null;

// // // // // // ── Prefill dates ─────────────────────────────────────────────────────────
// // // // // const prefillFromDate = searchParams.get("fromDate") ?? null;
// // // // // const prefillToDate   = searchParams.get("toDate")   ?? null;

// // // // // const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // // // const [form, setForm] = useState<BookingFormState>({
// // // // //   siteId:         "",   // resolved below once sites load
// // // // //   buildingId:     "",   // resolved below once buildings load
// // // // //   floorId:        "",   // resolved below once floors load
// // // // //   fromDate:       prefillFromDate ?? todayIso(),
// // // // //   toDate:         prefillToDate   ?? plusDaysIso(2),
// // // // //   selectedSeatId: null, // resolved below once seats load
// // // // //   preferences:    [],
// // // // // });

// // // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // // //   const [sites, setSites]                               = useState<Site[]>([]);
// // // // //   const [buildings, setBuildings]                       = useState<Building[]>([]);
// // // // //   const [floors, setFloors]                             = useState<Floor[]>([]);
// // // // //   const [seats, setSeats]                               = useState<Seat[]>([]);
// // // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // // //   const [submitting,         setSubmitting]         = useState(false);

// // // // //   const [error,        setError]        = useState<string | null>(null);
// // // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // // //   // ── Restore preferences from sessionStorage ──────────────────────────────
// // // // //   useEffect(() => {
// // // // //     try {
// // // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // // //       if (saved) {
// // // // //         const prefs = JSON.parse(saved) as string[];
// // // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // // //       }
// // // // //     } catch {}
// // // // //   }, []);

// // // // //   useEffect(() => {
// // // // //     try {
// // // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // // //     } catch {}
// // // // //   }, [form.preferences]);

// // // // //   // ── Navigate helper ──────────────────────────────────────────────────────
// // // // //   const navigateTo = useCallback(
// // // // //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// // // // //       setStepState(nextStep);
// // // // //       router.push(buildUrl(nextStep, nextForm));
// // // // //     },
// // // // //     [router]
// // // // //   );

// // // // //   // ── Load sites ───────────────────────────────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     setLoadingSites(true);
// // // // //     fetchSites()
// // // // //       .then(setSites)
// // // // //       .catch((e) => setError(e.message))
// // // // //       .finally(() => setLoadingSites(false));
// // // // //   }, []);

// // // // //   // ── Load preferences ─────────────────────────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     setLoadingPreferences(true);
// // // // //     fetchPreferences()
// // // // //       .then(setAvailablePreferences)
// // // // //       .catch((e) => setError(e.message))
// // // // //       .finally(() => setLoadingPreferences(false));
// // // // //   }, []);

// // // // //   // ── Resolve prefill location name → siteId once sites load ───────────────
// // // // //   // Only runs when we have a name to resolve and no siteId already in the URL.
// // // // //   useEffect(() => {
// // // // //     if (!prefillLocationName || form.siteId || sites.length === 0) return;
// // // // //     const match = sites.find(
// // // // //       (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase()
// // // // //     );
// // // // //     if (match) {
// // // // //       setForm((f) => ({
// // // // //         ...f,
// // // // //         siteId:     match.id,
// // // // //         buildingId: "",   // reset downstream; building resolution runs next
// // // // //         floorId:    "",
// // // // //       }));
// // // // //     }
// // // // //   }, [sites, prefillLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // //   // ── Load buildings ───────────────────────────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // // //     setBuildings([]);
// // // // //     setFloors([]);
// // // // //     setLoadingBuildings(true);
// // // // //     fetchBuildings(form.siteId)
// // // // //       .then(setBuildings)
// // // // //       .catch((e) => setError(e.message))
// // // // //       .finally(() => setLoadingBuildings(false));
// // // // //   }, [form.siteId]);

// // // // //   // ── Resolve prefill location name → buildingId once buildings load ────────
// // // // //   // The location param maps to the building label in the UI (e.g. "HQ Mumbai").
// // // // //   useEffect(() => {
// // // // //     if (!prefillLocationName || form.buildingId || buildings.length === 0) return;
// // // // //     const match = buildings.find(
// // // // //       (b) => b.name.toLowerCase() === prefillLocationName.toLowerCase()
// // // // //     );
// // // // //     if (match) {
// // // // //       setForm((f) => ({ ...f, buildingId: match.id, floorId: "" }));
// // // // //     }
// // // // //   }, [buildings, prefillLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // //   // ── Load floors ──────────────────────────────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     if (!form.buildingId) { setFloors([]); return; }
// // // // //     setFloors([]);
// // // // //     setLoadingFloors(true);
// // // // //     fetchFloors(form.buildingId)
// // // // //       .then(setFloors)
// // // // //       .catch((e) => setError(e.message))
// // // // //       .finally(() => setLoadingFloors(false));
// // // // //   }, [form.buildingId]);

// // // // //   // ── Resolve prefill floor name → floorId once floors load ────────────────
// // // // //   useEffect(() => {
// // // // //     if (!prefillFloorName || form.floorId || floors.length === 0) return;
// // // // //     const match = floors.find(
// // // // //       (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase()
// // // // //     );
// // // // //     if (match) {
// // // // //       setForm((f) => ({ ...f, floorId: match.id }));
// // // // //     }
// // // // //   }, [floors, prefillFloorName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // //   // ── Resolve prefill seat label → selectedSeatId once seats load ───────────
// // // // //   useEffect(() => {
// // // // //     if (!prefillSeat || form.selectedSeatId || seats.length === 0) return;
// // // // //     const match = seats.find(
// // // // //       (s) => s.name?.toLowerCase() === prefillSeat.toLowerCase() ||
// // // // //              s.label?.toLowerCase() === prefillSeat.toLowerCase()
// // // // //     );
// // // // //     if (match) {
// // // // //       setForm((f) => ({ ...f, selectedSeatId: match.id }));
// // // // //     }
// // // // //   }, [seats, prefillSeat]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // //   // ── Resolve preference keys → numeric amenity IDs ────────────────────────
// // // // //   const resolveAmenityIds = useCallback(
// // // // //     (preferenceKeys: string[]): number[] => {
// // // // //       return preferenceKeys
// // // // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // // // //         .filter((id): id is string => id !== undefined)
// // // // //         .map((id) => parseInt(id, 10))
// // // // //         .filter((id) => !isNaN(id));
// // // // //     },
// // // // //     [availablePreferences]
// // // // //   );

// // // // //   // ── Re-fetch seats on step 2 refresh ────────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     if (
// // // // //       step === 2 &&
// // // // //       seats.length === 0 &&
// // // // //       form.floorId &&
// // // // //       form.fromDate &&
// // // // //       form.toDate
// // // // //     ) {
// // // // //       setLoadingSeats(true);
// // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // //       fetchSeatsWithAvailability({
// // // // //         floorId:     form.floorId,
// // // // //         fromDate:    form.fromDate,
// // // // //         toDate:      form.toDate,
// // // // //         preferences: form.preferences,
// // // // //         amenityIds,
// // // // //       })
// // // // //         .then(setSeats)
// // // // //         .catch((e) => setError(e.message))
// // // // //         .finally(() => setLoadingSeats(false));
// // // // //     }
// // // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // // //   // ── Field setters ────────────────────────────────────────────────────────

// // // // //   const setSiteId = (v: string | null) =>
// // // // //     setForm((f) => ({
// // // // //       ...f,
// // // // //       siteId:         v ?? "",
// // // // //       buildingId:     "",
// // // // //       floorId:        "",
// // // // //       selectedSeatId: null,
// // // // //     }));

// // // // //   const setBuildingId = (v: string | null) =>
// // // // //     setForm((f) => ({
// // // // //       ...f,
// // // // //       buildingId:     v ?? "",
// // // // //       floorId:        "",
// // // // //       selectedSeatId: null,
// // // // //     }));

// // // // //   const setFloorId = (v: string | null) =>
// // // // //     setForm((f) => ({
// // // // //       ...f,
// // // // //       floorId:        v ?? "",
// // // // //       selectedSeatId: null,
// // // // //     }));

// // // // //   const setFromDate = (v: string) =>
// // // // //     setForm((f) => ({
// // // // //       ...f,
// // // // //       fromDate: v,
// // // // //       // In modify mode keep fromDate === toDate (single-day booking);
// // // // //       // otherwise clamp toDate up if it's now before fromDate.
// // // // //       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
// // // // //     }));

// // // // //   const setToDate = (v: string) =>
// // // // //     setForm((f) => ({ ...f, toDate: v }));

// // // // //   const togglePreference = (key: string) =>
// // // // //     setForm((f) => ({
// // // // //       ...f,
// // // // //       preferences: f.preferences.includes(key)
// // // // //         ? f.preferences.filter((p) => p !== key)
// // // // //         : [...f.preferences, key],
// // // // //     }));

// // // // //   const clearAll = () =>
// // // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // // //   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
// // // // //   const findAvailableSeats = useCallback(async () => {
// // // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // // //     setLoadingSeats(true);
// // // // //     setError(null);

// // // // //     try {
// // // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // // //       const data = await fetchSeatsWithAvailability({
// // // // //         floorId:     form.floorId,
// // // // //         fromDate:    form.fromDate,
// // // // //         toDate:      form.toDate,
// // // // //         preferences: form.preferences,
// // // // //         amenityIds,
// // // // //       });
// // // // //       setSeats(data);
// // // // //       navigateTo(2, form);
// // // // //     } catch (e: unknown) {
// // // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // // //     } finally {
// // // // //       setLoadingSeats(false);
// // // // //     }
// // // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // // //   // ── Step 2: select seat ──────────────────────────────────────────────────
// // // // //   const selectSeat = (seatId: string | null) => {
// // // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // // //   };

// // // // //   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
// // // // //   const goToReview = () => {
// // // // //     if (!form.selectedSeatId) return;
// // // // //     navigateTo(3, form);
// // // // //   };

// // // // //   // ── Step 3: confirm booking ──────────────────────────────────────────────
// // // // //   const confirmBooking = useCallback(async () => {
// // // // //     if (!form.selectedSeatId) return;

// // // // //     setSubmitting(true);
// // // // //     setError(null);

// // // // //     try {
// // // // //       // ── Modify mode: cancel the original booking first ──────────────────
// // // // //       if (isModifyMode && modifyBookingId) {
// // // // //         try {
// // // // //           await cancelBooking(modifyBookingId, "Modified by user");
// // // // //         } catch (cancelErr: any) {
// // // // //           // If the original booking is already cancelled / not found, continue.
// // // // //           const status = cancelErr?.response?.status;
// // // // //           if (status !== 404 && status !== 409) {
// // // // //             throw new Error(
// // // // //               cancelErr?.response?.data?.message ??
// // // // //               "Failed to cancel the original booking before modifying. Please try again."
// // // // //             );
// // // // //           }
// // // // //         }
// // // // //       }

// // // // //       // ── Create the new booking ──────────────────────────────────────────
// // // // //       const result = await createBooking({
// // // // //         site_id:      Number(form.siteId),
// // // // //         building_id:  Number(form.buildingId),
// // // // //         floor_id:     Number(form.floorId),
// // // // //         seat_id:      Number(form.selectedSeatId),
// // // // //         booking_date: form.fromDate,
// // // // //       });

// // // // //       setConfirmation(result);
// // // // //       setStepState(3);

// // // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // //     } catch (err: any) {
// // // // //       const status = err?.response?.status;
// // // // //       if (status === 409) {
// // // // //         setError("This seat is already booked for the selected date. Please choose a different seat.");
// // // // //       } else if (status === 400) {
// // // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // // //       } else if (status === 403) {
// // // // //         setError("You don't have permission to book this seat.");
// // // // //       } else if (status === 404) {
// // // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // // //       } else {
// // // // //         setError(
// // // // //           err?.response?.data?.message ??
// // // // //           err?.message ??
// // // // //           "Failed to confirm booking. Please try again."
// // // // //         );
// // // // //       }
// // // // //     } finally {
// // // // //       setSubmitting(false);
// // // // //     }
// // // // //   }, [form, isModifyMode, modifyBookingId]);

// // // // //   // ── Navigation helpers ───────────────────────────────────────────────────
// // // // //   const goBack = () => {
// // // // //     const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// // // // //     const clearedForm = prevStep < 2
// // // // //       ? { ...form, selectedSeatId: null }
// // // // //       : form;
// // // // //     setForm(clearedForm);
// // // // //     navigateTo(prevStep, clearedForm);
// // // // //   };

// // // // //   const resetForm = () => {
// // // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // // //     setForm(DEFAULT_STATE);
// // // // //     setStepState(1);
// // // // //     setBuildings([]);
// // // // //     setFloors([]);
// // // // //     setSeats([]);
// // // // //     setConfirmation(null);
// // // // //     setError(null);
// // // // //     router.push("/book");
// // // // //   };

// // // // //   // ── Derived ──────────────────────────────────────────────────────────────
// // // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // // //   const isMultiDate = form.fromDate !== form.toDate;

// // // // //   const dayCount = (() => {
// // // // //     if (!form.fromDate || !form.toDate) return 0;
// // // // //     const diff =
// // // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // // //     return Math.round(diff / 86_400_000) + 1;
// // // // //   })();

// // // // //   const step1Valid =
// // // // //     !!form.siteId &&
// // // // //     !!form.buildingId &&
// // // // //     !!form.floorId &&
// // // // //     !!form.fromDate &&
// // // // //     !!form.toDate;

// // // // //   return {
// // // // //     step,
// // // // //     form,
// // // // //     sites,
// // // // //     buildings,
// // // // //     floors,
// // // // //     seats,
// // // // //     availablePreferences,
// // // // //     confirmation,
// // // // //     error,
// // // // //     loadingSites,
// // // // //     loadingBuildings,
// // // // //     loadingFloors,
// // // // //     loadingSeats,
// // // // //     loadingPreferences,
// // // // //     submitting,
// // // // //     selectedSite,
// // // // //     selectedBuilding,
// // // // //     selectedFloor,
// // // // //     selectedSeat,
// // // // //     dayCount,
// // // // //     step1Valid,
// // // // //     isMultiDate,
// // // // //     // ── Modify mode ────────────────────────────────────────────────────────
// // // // //     isModifyMode,
// // // // //     modifyBookingId,
// // // // //     setSiteId,
// // // // //     setBuildingId,
// // // // //     setFloorId,
// // // // //     setFromDate,
// // // // //     setToDate,
// // // // //     togglePreference,
// // // // //     clearAll,
// // // // //     findAvailableSeats,
// // // // //     selectSeat,
// // // // //     goToReview,
// // // // //     confirmBooking,
// // // // //     goBack,
// // // // //     resetForm,
// // // // //   };
// // // // // }

// // // // "use client";

// // // // import { useCallback, useEffect, useState } from "react";
// // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // import {
// // // //   BookingFormState,
// // // //   BookingStep,
// // // //   Building,
// // // //   CreateBookingResponse,
// // // //   Floor,
// // // //   Preference,
// // // //   Seat,
// // // //   Site,
// // // // } from "../types/Bookingform.types";

// // // // import {
// // // //   createBooking,
// // // //   fetchBuildings,
// // // //   fetchFloors,
// // // //   fetchPreferences,
// // // //   fetchSeatsWithAvailability,
// // // //   fetchSites,
// // // // } from "../services/Bookingform.service";
// // // // import { cancelBooking } from "@/features/bookings/services/bookings.service";


// // // // function todayIso(): string {
// // // //   return new Date().toISOString().slice(0, 10);
// // // // }

// // // // function plusDaysIso(n: number): string {
// // // //   const d = new Date();
// // // //   d.setDate(d.getDate() + n);
// // // //   return d.toISOString().slice(0, 10);
// // // // }

// // // // const DEFAULT_STATE: BookingFormState = {
// // // //   siteId:         "",
// // // //   buildingId:     "",
// // // //   floorId:        "",
// // // //   fromDate:       todayIso(),
// // // //   toDate:         plusDaysIso(2),
// // // //   preferences:    [],
// // // //   selectedSeatId: null,
// // // // };

// // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // function buildUrl(step: number, form: BookingFormState): string {
// // // //   const params = new URLSearchParams();
// // // //   params.set("step", String(step));
// // // //   if (form.siteId)         params.set("siteId",      form.siteId);
// // // //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// // // //   if (form.floorId)        params.set("floorId",      form.floorId);
// // // //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// // // //   if (form.toDate)         params.set("toDate",       form.toDate);
// // // //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// // // //   return `/book?${params.toString()}`;
// // // // }

// // // // export function useBookingForm() {
// // // //   const router       = useRouter();
// // // //   const searchParams = useSearchParams();

// // // //   // ── Modify-mode params ──────────────────────────────────────────────────
// // // //   const modifyBookingId = searchParams.get("modifyBookingId");
// // // //   const isModifyMode    = Boolean(modifyBookingId);

// // // //   // ── Prefill by display name (injected by MyBookingsPage redirect) ───────
// // // //   // These are human-readable strings, NOT IDs.
// // // //   // We resolve them → IDs once the relevant data loads (see effects below).
// // // //   const prefillLocationName = searchParams.get("locationName") ?? null; // matches Site.name
// // // //   const prefillFloorName    = searchParams.get("floorName")    ?? null; // matches Floor.name
// // // //   const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null; // matches Seat.label

// // // //   // ── Prefill dates ───────────────────────────────────────────────────────
// // // //   const prefillFromDate = searchParams.get("fromDate") ?? null;
// // // //   const prefillToDate   = searchParams.get("toDate")   ?? null;

// // // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // //   // IDs are initially blank; they get resolved by the name-resolution effects.
// // // //   // If the URL already carries explicit siteId/buildingId/floorId (e.g. from
// // // //   // an internal step navigation), we honour those directly.
// // // //   const [form, setForm] = useState<BookingFormState>({
// // // //     siteId:         searchParams.get("siteId")     ?? "",
// // // //     buildingId:     searchParams.get("buildingId") ?? "",
// // // //     floorId:        searchParams.get("floorId")    ?? "",
// // // //     fromDate:       prefillFromDate ?? todayIso(),
// // // //     toDate:         prefillToDate   ?? plusDaysIso(2),
// // // //     selectedSeatId: searchParams.get("seatId")     ?? null,
// // // //     preferences:    [],
// // // //   });

// // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // //   const [sites,                setSites]                = useState<Site[]>([]);
// // // //   const [buildings,            setBuildings]            = useState<Building[]>([]);
// // // //   const [floors,               setFloors]               = useState<Floor[]>([]);
// // // //   const [seats,                setSeats]                = useState<Seat[]>([]);
// // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // //   const [submitting,         setSubmitting]         = useState(false);

// // // //   const [error,        setError]        = useState<string | null>(null);
// // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // //   // ── Restore preferences from sessionStorage ──────────────────────────────
// // // //   useEffect(() => {
// // // //     try {
// // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // //       if (saved) {
// // // //         const prefs = JSON.parse(saved) as string[];
// // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // //       }
// // // //     } catch {}
// // // //   }, []);

// // // //   useEffect(() => {
// // // //     try {
// // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // //     } catch {}
// // // //   }, [form.preferences]);

// // // //   // ── Navigate helper ──────────────────────────────────────────────────────
// // // //   const navigateTo = useCallback(
// // // //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// // // //       setStepState(nextStep);
// // // //       router.push(buildUrl(nextStep, nextForm));
// // // //     },
// // // //     [router],
// // // //   );

// // // //   // ── Load sites ───────────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     setLoadingSites(true);
// // // //     fetchSites()
// // // //       .then(setSites)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingSites(false));
// // // //   }, []);

// // // //   // ── Load preferences ─────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     setLoadingPreferences(true);
// // // //     fetchPreferences()
// // // //       .then(setAvailablePreferences)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingPreferences(false));
// // // //   }, []);

// // // //   // ── Load buildings ───────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // //     setBuildings([]);
// // // //     setFloors([]);
// // // //     setLoadingBuildings(true);
// // // //     fetchBuildings(form.siteId)
// // // //       .then(setBuildings)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingBuildings(false));
// // // //   }, [form.siteId]);

// // // //   // ── Load floors ──────────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     if (!form.buildingId) { setFloors([]); return; }
// // // //     setFloors([]);
// // // //     setLoadingFloors(true);
// // // //     fetchFloors(form.buildingId)
// // // //       .then(setFloors)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingFloors(false));
// // // //   }, [form.buildingId]);

// // // //   // ── Prefill resolution: locationName → siteId ────────────────────────────
// // // //   // Runs once sites are loaded. Skipped if siteId is already set (e.g. step
// // // //   // navigation URLs already carry the explicit ID).
// // // //   useEffect(() => {
// // // //     if (!prefillLocationName || sites.length === 0 || form.siteId) return;
// // // //     const match = sites.find(
// // // //       (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({
// // // //         ...f,
// // // //         siteId:     match.id,
// // // //         buildingId: "",  // reset downstream
// // // //         floorId:    "",
// // // //       }));
// // // //     }
// // // //   }, [sites, prefillLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Auto-select building when there is exactly one ───────────────────────
// // // //   // The booking card stores location (site name) and floor name but NOT
// // // //   // building name. When a site has only one building we resolve it
// // // //   // automatically. Multiple buildings → user picks manually on step 1.
// // // //   useEffect(() => {
// // // //     if (!prefillLocationName || buildings.length !== 1 || form.buildingId) return;
// // // //     setForm((f) => ({ ...f, buildingId: buildings[0].id }));
// // // //   }, [buildings, prefillLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Prefill resolution: floorName → floorId ──────────────────────────────
// // // //   // Runs once floors are loaded (which happens after siteId + buildingId set).
// // // //   useEffect(() => {
// // // //     if (!prefillFloorName || floors.length === 0 || form.floorId) return;
// // // //     const match = floors.find(
// // // //       (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
// // // //     }
// // // //   }, [floors, prefillFloorName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Prefill resolution: seatLabel → selectedSeatId ───────────────────────
// // // //   // Runs once seats are loaded (step 2). Skipped if already resolved.
// // // //   useEffect(() => {
// // // //     if (!prefillSeatLabel || seats.length === 0 || form.selectedSeatId) return;
// // // //     const match = seats.find(
// // // //       (s) => s.label.toLowerCase() === prefillSeatLabel.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({ ...f, selectedSeatId: match.id }));
// // // //     }
// // // //   }, [seats, prefillSeatLabel]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Resolve preference keys → numeric amenity IDs ────────────────────────
// // // //   const resolveAmenityIds = useCallback(
// // // //     (preferenceKeys: string[]): number[] => {
// // // //       return preferenceKeys
// // // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // // //         .filter((id): id is string => id !== undefined)
// // // //         .map((id) => parseInt(id, 10))
// // // //         .filter((id) => !isNaN(id));
// // // //     },
// // // //     [availablePreferences],
// // // //   );

// // // //   // ── Re-fetch seats on step 2 refresh ─────────────────────────────────────
// // // //   useEffect(() => {
// // // //     if (
// // // //       step === 2 &&
// // // //       seats.length === 0 &&
// // // //       form.floorId &&
// // // //       form.fromDate &&
// // // //       form.toDate
// // // //     ) {
// // // //       setLoadingSeats(true);
// // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // //       fetchSeatsWithAvailability({
// // // //         floorId:     form.floorId,
// // // //         fromDate:    form.fromDate,
// // // //         toDate:      form.toDate,
// // // //         preferences: form.preferences,
// // // //         amenityIds,
// // // //       })
// // // //         .then(setSeats)
// // // //         .catch((e) => setError(e.message))
// // // //         .finally(() => setLoadingSeats(false));
// // // //     }
// // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Field setters ─────────────────────────────────────────────────────────

// // // //   const setSiteId = (v: string | null) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       siteId:         v ?? "",
// // // //       buildingId:     "",
// // // //       floorId:        "",
// // // //       selectedSeatId: null,
// // // //     }));

// // // //   const setBuildingId = (v: string | null) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       buildingId:     v ?? "",
// // // //       floorId:        "",
// // // //       selectedSeatId: null,
// // // //     }));

// // // //   const setFloorId = (v: string | null) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       floorId:        v ?? "",
// // // //       selectedSeatId: null,
// // // //     }));

// // // //   const setFromDate = (v: string) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       fromDate: v,
// // // //       // In modify mode keep fromDate === toDate (single-day booking)
// // // //       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
// // // //     }));

// // // //   const setToDate = (v: string) =>
// // // //     setForm((f) => ({ ...f, toDate: v }));

// // // //   const togglePreference = (key: string) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       preferences: f.preferences.includes(key)
// // // //         ? f.preferences.filter((p) => p !== key)
// // // //         : [...f.preferences, key],
// // // //     }));

// // // //   const clearAll = () =>
// // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // //   // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
// // // //   const findAvailableSeats = useCallback(async () => {
// // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // //     setLoadingSeats(true);
// // // //     setError(null);

// // // //     try {
// // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // //       const data = await fetchSeatsWithAvailability({
// // // //         floorId:     form.floorId,
// // // //         fromDate:    form.fromDate,
// // // //         toDate:      form.toDate,
// // // //         preferences: form.preferences,
// // // //         amenityIds,
// // // //       });
// // // //       setSeats(data);
// // // //       navigateTo(2, form);
// // // //     } catch (e: unknown) {
// // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // //     } finally {
// // // //       setLoadingSeats(false);
// // // //     }
// // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // //   // ── Step 2: select seat ───────────────────────────────────────────────────
// // // //   const selectSeat = (seatId: string | null) => {
// // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // //   };

// // // //   // ── Step 2 → Step 3 ───────────────────────────────────────────────────────
// // // //   const goToReview = () => {
// // // //     if (!form.selectedSeatId) return;
// // // //     navigateTo(3, form);
// // // //   };

// // // //   // ── Step 3: confirm booking ───────────────────────────────────────────────
// // // //   const confirmBooking = useCallback(async () => {
// // // //     if (!form.selectedSeatId) return;

// // // //     setSubmitting(true);
// // // //     setError(null);

// // // //     try {
// // // //       // Modify mode: cancel the original booking first
// // // //       if (isModifyMode && modifyBookingId) {
// // // //         try {
// // // //           await cancelBooking(modifyBookingId, "Modified by user");
// // // //         } catch (cancelErr: any) {
// // // //           // If already cancelled / not found, continue.
// // // //           const status = cancelErr?.response?.status;
// // // //           if (status !== 404 && status !== 409) {
// // // //             throw new Error(
// // // //               cancelErr?.response?.data?.message ??
// // // //               "Failed to cancel the original booking before modifying. Please try again.",
// // // //             );
// // // //           }
// // // //         }
// // // //       }

// // // //       // Create the new booking
// // // //       const result = await createBooking({
// // // //         site_id:      Number(form.siteId),
// // // //         building_id:  Number(form.buildingId),
// // // //         floor_id:     Number(form.floorId),
// // // //         seat_id:      Number(form.selectedSeatId),
// // // //         booking_date: form.fromDate,
// // // //       });

// // // //       setConfirmation(result);
// // // //       setStepState(3);

// // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // //     } catch (err: any) {
// // // //       const status = err?.response?.status;
// // // //       if (status === 409) {
// // // //         setError("This seat is already booked for the selected date. Please choose a different seat.");
// // // //       } else if (status === 400) {
// // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // //       } else if (status === 403) {
// // // //         setError("You don't have permission to book this seat.");
// // // //       } else if (status === 404) {
// // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // //       } else {
// // // //         setError(
// // // //           err?.response?.data?.message ??
// // // //           err?.message ??
// // // //           "Failed to confirm booking. Please try again.",
// // // //         );
// // // //       }
// // // //     } finally {
// // // //       setSubmitting(false);
// // // //     }
// // // //   }, [form, isModifyMode, modifyBookingId]);

// // // //   // ── Navigation helpers ────────────────────────────────────────────────────
// // // //   const goBack = () => {
// // // //     const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
// // // //     const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
// // // //     setForm(clearedForm);
// // // //     navigateTo(prevStep, clearedForm);
// // // //   };

// // // //   const resetForm = () => {
// // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // //     setForm(DEFAULT_STATE);
// // // //     setStepState(1);
// // // //     setBuildings([]);
// // // //     setFloors([]);
// // // //     setSeats([]);
// // // //     setConfirmation(null);
// // // //     setError(null);
// // // //     router.push("/book");
// // // //   };

// // // //   // ── Derived ───────────────────────────────────────────────────────────────
// // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // //   const dayCount = (() => {
// // // //     if (!form.fromDate || !form.toDate) return 0;
// // // //     const diff =
// // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // //     return Math.round(diff / 86_400_000) + 1;
// // // //   })();

// // // //   const step1Valid =
// // // //     !!form.siteId     &&
// // // //     !!form.buildingId &&
// // // //     !!form.floorId    &&
// // // //     !!form.fromDate   &&
// // // //     !!form.toDate;

// // // //   return {
// // // //     step,
// // // //     form,
// // // //     sites,
// // // //     buildings,
// // // //     floors,
// // // //     seats,
// // // //     availablePreferences,
// // // //     confirmation,
// // // //     error,
// // // //     loadingSites,
// // // //     loadingBuildings,
// // // //     loadingFloors,
// // // //     loadingSeats,
// // // //     loadingPreferences,
// // // //     submitting,
// // // //     selectedSite,
// // // //     selectedBuilding,
// // // //     selectedFloor,
// // // //     selectedSeat,
// // // //     dayCount,
// // // //     step1Valid,
// // // //     // Modify mode
// // // //     isModifyMode,
// // // //     modifyBookingId,
// // // //     // Setters
// // // //     setSiteId,
// // // //     setBuildingId,
// // // //     setFloorId,
// // // //     setFromDate,
// // // //     setToDate,
// // // //     togglePreference,
// // // //     clearAll,
// // // //     findAvailableSeats,
// // // //     selectSeat,
// // // //     goToReview,
// // // //     confirmBooking,
// // // //     goBack,
// // // //     resetForm,
// // // //   };
// // // // }


// // // // "use client";

// // // // import { useCallback, useEffect, useState } from "react";
// // // // import { useRouter, useSearchParams } from "next/navigation";
// // // // import {
// // // //   BookingFormState,
// // // //   BookingStep,
// // // //   Building,
// // // //   CreateBookingResponse,
// // // //   Floor,
// // // //   Preference,
// // // //   Seat,
// // // //   Site,
// // // // } from "../types/Bookingform.types";

// // // // import {
// // // //   createBooking,
// // // //   fetchBuildings,
// // // //   fetchFloors,
// // // //   fetchPreferences,
// // // //   fetchSeatsWithAvailability,
// // // //   fetchSites,
// // // // } from "../services/Bookingform.service";
// // // // import { cancelBooking } from "@/features/bookings/services/bookings.service";


// // // // function todayIso(): string {
// // // //   return new Date().toISOString().slice(0, 10);
// // // // }

// // // // function plusDaysIso(n: number): string {
// // // //   const d = new Date();
// // // //   d.setDate(d.getDate() + n);
// // // //   return d.toISOString().slice(0, 10);
// // // // }

// // // // const DEFAULT_STATE: BookingFormState = {
// // // //   siteId:         "",
// // // //   buildingId:     "",
// // // //   floorId:        "",
// // // //   fromDate:       todayIso(),
// // // //   toDate:         plusDaysIso(2),
// // // //   preferences:    [],
// // // //   selectedSeatId: null,
// // // // };

// // // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // // function buildUrl(step: number, form: BookingFormState): string {
// // // //   const params = new URLSearchParams();
// // // //   params.set("step", String(step));
// // // //   if (form.siteId)         params.set("siteId",      form.siteId);
// // // //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// // // //   if (form.floorId)        params.set("floorId",      form.floorId);
// // // //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// // // //   if (form.toDate)         params.set("toDate",       form.toDate);
// // // //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// // // //   return `/book?${params.toString()}`;
// // // // }

// // // // export function useBookingForm() {
// // // //   const router       = useRouter();
// // // //   const searchParams = useSearchParams();

// // // //   // ── Modify-mode params ──────────────────────────────────────────────────
// // // //   const modifyBookingId = searchParams.get("modifyBookingId");
// // // //   const isModifyMode    = Boolean(modifyBookingId);

// // // //   // ── Prefill by display name (injected by MyBookingsPage redirect) ───────
// // // //   // These are human-readable strings, NOT IDs.
// // // //   // We resolve them → IDs once the relevant data loads (see effects below).
// // // //   const prefillLocationName = searchParams.get("locationName") ?? null; // matches Site.name
// // // //   const prefillBuildingName = searchParams.get("buildingName") ?? null; // matches Building.name
// // // //   const prefillFloorName    = searchParams.get("floorName")    ?? null; // matches Floor.name
// // // //   const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null; // matches Seat.label

// // // //   // ── Prefill dates ───────────────────────────────────────────────────────
// // // //   const prefillFromDate = searchParams.get("fromDate") ?? null;
// // // //   const prefillToDate   = searchParams.get("toDate")   ?? null;

// // // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // // //   // IDs are initially blank; they get resolved by the name-resolution effects.
// // // //   // If the URL already carries explicit siteId/buildingId/floorId (e.g. from
// // // //   // an internal step navigation), we honour those directly.
// // // //   const [form, setForm] = useState<BookingFormState>({
// // // //     siteId:         searchParams.get("siteId")     ?? "",
// // // //     buildingId:     searchParams.get("buildingId") ?? "",
// // // //     floorId:        searchParams.get("floorId")    ?? "",
// // // //     fromDate:       prefillFromDate ?? todayIso(),
// // // //     toDate:         prefillToDate   ?? plusDaysIso(2),
// // // //     selectedSeatId: searchParams.get("seatId")     ?? null,
// // // //     preferences:    [],
// // // //   });

// // // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // // //   const [sites,                setSites]                = useState<Site[]>([]);
// // // //   const [buildings,            setBuildings]            = useState<Building[]>([]);
// // // //   const [floors,               setFloors]               = useState<Floor[]>([]);
// // // //   const [seats,                setSeats]                = useState<Seat[]>([]);
// // // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // // //   const [submitting,         setSubmitting]         = useState(false);

// // // //   const [error,        setError]        = useState<string | null>(null);
// // // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // // //   // ── Restore preferences from sessionStorage ──────────────────────────────
// // // //   useEffect(() => {
// // // //     try {
// // // //       const saved = sessionStorage.getItem("bookingPreferences");
// // // //       if (saved) {
// // // //         const prefs = JSON.parse(saved) as string[];
// // // //         setForm((f) => ({ ...f, preferences: prefs }));
// // // //       }
// // // //     } catch {}
// // // //   }, []);

// // // //   useEffect(() => {
// // // //     try {
// // // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // // //     } catch {}
// // // //   }, [form.preferences]);

// // // //   // ── Navigate helper ──────────────────────────────────────────────────────
// // // //   const navigateTo = useCallback(
// // // //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// // // //       setStepState(nextStep);
// // // //       router.push(buildUrl(nextStep, nextForm));
// // // //     },
// // // //     [router],
// // // //   );

// // // //   // ── Load sites ───────────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     setLoadingSites(true);
// // // //     fetchSites()
// // // //       .then(setSites)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingSites(false));
// // // //   }, []);

// // // //   // ── Load preferences ─────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     setLoadingPreferences(true);
// // // //     fetchPreferences()
// // // //       .then(setAvailablePreferences)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingPreferences(false));
// // // //   }, []);

// // // //   // ── Load buildings ───────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // // //     setBuildings([]);
// // // //     setFloors([]);
// // // //     setLoadingBuildings(true);
// // // //     fetchBuildings(form.siteId)
// // // //       .then(setBuildings)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingBuildings(false));
// // // //   }, [form.siteId]);

// // // //   // ── Load floors ──────────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     if (!form.buildingId) { setFloors([]); return; }
// // // //     setFloors([]);
// // // //     setLoadingFloors(true);
// // // //     fetchFloors(form.buildingId)
// // // //       .then(setFloors)
// // // //       .catch((e) => setError(e.message))
// // // //       .finally(() => setLoadingFloors(false));
// // // //   }, [form.buildingId]);

// // // //   // ── Prefill resolution: locationName → siteId ────────────────────────────
// // // //   // Runs once sites are loaded. Skipped if siteId is already set (e.g. step
// // // //   // navigation URLs already carry the explicit ID).
// // // //   useEffect(() => {
// // // //     if (!prefillLocationName || sites.length === 0 || form.siteId) return;
// // // //     const match = sites.find(
// // // //       (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({
// // // //         ...f,
// // // //         siteId:     match.id,
// // // //         buildingId: "",  // reset downstream
// // // //         floorId:    "",
// // // //       }));
// // // //     }
// // // //   }, [sites, prefillLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Prefill resolution: buildingName → buildingId ────────────────────────
// // // //   // Runs once buildings are loaded (triggered after siteId resolves).
// // // //   // Skipped if buildingId is already set.
// // // //   useEffect(() => {
// // // //     if (!prefillBuildingName || buildings.length === 0 || form.buildingId) return;
// // // //     const match = buildings.find(
// // // //       (b) => b.name.toLowerCase() === prefillBuildingName.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({
// // // //         ...f,
// // // //         buildingId:     match.id,
// // // //         floorId:        "",
// // // //         selectedSeatId: null,
// // // //       }));
// // // //     }
// // // //   }, [buildings, prefillBuildingName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Auto-select building when there is exactly one (non-modify mode) ──────
// // // //   // Only fires when no buildingName prefill is present (i.e. not modify mode).
// // // //   // Multiple buildings in modify mode are handled by the effect above.
// // // //   useEffect(() => {
// // // //     if (!prefillLocationName || prefillBuildingName || buildings.length !== 1 || form.buildingId) return;
// // // //     setForm((f) => ({ ...f, buildingId: buildings[0].id }));
// // // //   }, [buildings, prefillLocationName, prefillBuildingName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Prefill resolution: floorName → floorId ──────────────────────────────
// // // //   // Runs once floors are loaded (which happens after siteId + buildingId set).
// // // //   useEffect(() => {
// // // //     if (!prefillFloorName || floors.length === 0 || form.floorId) return;
// // // //     const match = floors.find(
// // // //       (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
// // // //     }
// // // //   }, [floors, prefillFloorName]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Prefill resolution: seatLabel → selectedSeatId ───────────────────────
// // // //   // Runs once seats are loaded (step 2). Skipped if already resolved.
// // // //   useEffect(() => {
// // // //     if (!prefillSeatLabel || seats.length === 0 || form.selectedSeatId) return;
// // // //     const match = seats.find(
// // // //       (s) => s.label.toLowerCase() === prefillSeatLabel.toLowerCase(),
// // // //     );
// // // //     if (match) {
// // // //       setForm((f) => ({ ...f, selectedSeatId: match.id }));
// // // //     }
// // // //   }, [seats, prefillSeatLabel]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Resolve preference keys → numeric amenity IDs ────────────────────────
// // // //   const resolveAmenityIds = useCallback(
// // // //     (preferenceKeys: string[]): number[] => {
// // // //       return preferenceKeys
// // // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // // //         .filter((id): id is string => id !== undefined)
// // // //         .map((id) => parseInt(id, 10))
// // // //         .filter((id) => !isNaN(id));
// // // //     },
// // // //     [availablePreferences],
// // // //   );

// // // //   // ── Re-fetch seats on step 2 refresh ─────────────────────────────────────
// // // //   useEffect(() => {
// // // //     if (
// // // //       step === 2 &&
// // // //       seats.length === 0 &&
// // // //       form.floorId &&
// // // //       form.fromDate &&
// // // //       form.toDate
// // // //     ) {
// // // //       setLoadingSeats(true);
// // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // //       fetchSeatsWithAvailability({
// // // //         floorId:     form.floorId,
// // // //         fromDate:    form.fromDate,
// // // //         toDate:      form.toDate,
// // // //         preferences: form.preferences,
// // // //         amenityIds,
// // // //       })
// // // //         .then(setSeats)
// // // //         .catch((e) => setError(e.message))
// // // //         .finally(() => setLoadingSeats(false));
// // // //     }
// // // //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// // // //   // ── Field setters ─────────────────────────────────────────────────────────

// // // //   const setSiteId = (v: string | null) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       siteId:         v ?? "",
// // // //       buildingId:     "",
// // // //       floorId:        "",
// // // //       selectedSeatId: null,
// // // //     }));

// // // //   const setBuildingId = (v: string | null) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       buildingId:     v ?? "",
// // // //       floorId:        "",
// // // //       selectedSeatId: null,
// // // //     }));

// // // //   const setFloorId = (v: string | null) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       floorId:        v ?? "",
// // // //       selectedSeatId: null,
// // // //     }));

// // // //   const setFromDate = (v: string) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       fromDate: v,
// // // //       // In modify mode keep fromDate === toDate (single-day booking)
// // // //       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
// // // //     }));

// // // //   const setToDate = (v: string) =>
// // // //     setForm((f) => ({ ...f, toDate: v }));

// // // //   const togglePreference = (key: string) =>
// // // //     setForm((f) => ({
// // // //       ...f,
// // // //       preferences: f.preferences.includes(key)
// // // //         ? f.preferences.filter((p) => p !== key)
// // // //         : [...f.preferences, key],
// // // //     }));

// // // //   const clearAll = () =>
// // // //     setForm((f) => ({ ...f, preferences: [] }));

// // // //   // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
// // // //   const findAvailableSeats = useCallback(async () => {
// // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // //     setLoadingSeats(true);
// // // //     setError(null);

// // // //     try {
// // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // //       const data = await fetchSeatsWithAvailability({
// // // //         floorId:     form.floorId,
// // // //         fromDate:    form.fromDate,
// // // //         toDate:      form.toDate,
// // // //         preferences: form.preferences,
// // // //         amenityIds,
// // // //       });
// // // //       setSeats(data);
// // // //       navigateTo(2, form);
// // // //     } catch (e: unknown) {
// // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // //     } finally {
// // // //       setLoadingSeats(false);
// // // //     }
// // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // //   // ── Step 2: select seat ───────────────────────────────────────────────────
// // // //   const selectSeat = (seatId: string | null) => {
// // // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // // //   };

// // // //   // ── Step 2 → Step 3 ───────────────────────────────────────────────────────
// // // //   const goToReview = () => {
// // // //     if (!form.selectedSeatId) return;
// // // //     navigateTo(3, form);
// // // //   };

// // // //   // ── Step 3: confirm booking ───────────────────────────────────────────────
// // // //   const confirmBooking = useCallback(async () => {
// // // //     if (!form.selectedSeatId) return;

// // // //     setSubmitting(true);
// // // //     setError(null);

// // // //     try {
// // // //       // Modify mode: cancel the original booking first
// // // //       if (isModifyMode && modifyBookingId) {
// // // //         try {
// // // //           await cancelBooking(modifyBookingId, "Modified by user");
// // // //         } catch (cancelErr: any) {
// // // //           // If already cancelled / not found, continue.
// // // //           const status = cancelErr?.response?.status;
// // // //           if (status !== 404 && status !== 409) {
// // // //             throw new Error(
// // // //               cancelErr?.response?.data?.message ??
// // // //               "Failed to cancel the original booking before modifying. Please try again.",
// // // //             );
// // // //           }
// // // //         }
// // // //       }

// // // //       // Create the new booking
// // // //       const result = await createBooking({
// // // //         site_id:      Number(form.siteId),
// // // //         building_id:  Number(form.buildingId),
// // // //         floor_id:     Number(form.floorId),
// // // //         seat_id:      Number(form.selectedSeatId),
// // // //         booking_date: form.fromDate,
// // // //       });

// // // //       setConfirmation(result);
// // // //       setStepState(3);

// // // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // //     } catch (err: any) {
// // // //       const status = err?.response?.status;
// // // //       if (status === 409) {
// // // //         setError("This seat is already booked for the selected date. Please choose a different seat.");
// // // //       } else if (status === 400) {
// // // //         setError("Invalid booking details. Please go back and check your selection.");
// // // //       } else if (status === 403) {
// // // //         setError("You don't have permission to book this seat.");
// // // //       } else if (status === 404) {
// // // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // // //       } else {
// // // //         setError(
// // // //           err?.response?.data?.message ??
// // // //           err?.message ??
// // // //           "Failed to confirm booking. Please try again.",
// // // //         );
// // // //       }
// // // //     } finally {
// // // //       setSubmitting(false);
// // // //     }
// // // //   }, [form, isModifyMode, modifyBookingId]);

// // // //   // ── Navigation helpers ────────────────────────────────────────────────────
// // // //   const goBack = () => {
// // // //     const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
// // // //     const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
// // // //     setForm(clearedForm);
// // // //     navigateTo(prevStep, clearedForm);
// // // //   };

// // // //   const resetForm = () => {
// // // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // // //     setForm(DEFAULT_STATE);
// // // //     setStepState(1);
// // // //     setBuildings([]);
// // // //     setFloors([]);
// // // //     setSeats([]);
// // // //     setConfirmation(null);
// // // //     setError(null);
// // // //     router.push("/book");
// // // //   };

// // // //   // ── Derived ───────────────────────────────────────────────────────────────
// // // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // // //   const dayCount = (() => {
// // // //     if (!form.fromDate || !form.toDate) return 0;
// // // //     const diff =
// // // //       new Date(form.toDate + "T00:00:00").getTime() -
// // // //       new Date(form.fromDate + "T00:00:00").getTime();
// // // //     return Math.round(diff / 86_400_000) + 1;
// // // //   })();

// // // //   const step1Valid =
// // // //     !!form.siteId     &&
// // // //     !!form.buildingId &&
// // // //     !!form.floorId    &&
// // // //     !!form.fromDate   &&
// // // //     !!form.toDate;

// // // //   return {
// // // //     step,
// // // //     form,
// // // //     sites,
// // // //     buildings,
// // // //     floors,
// // // //     seats,
// // // //     availablePreferences,
// // // //     confirmation,
// // // //     error,
// // // //     loadingSites,
// // // //     loadingBuildings,
// // // //     loadingFloors,
// // // //     loadingSeats,
// // // //     loadingPreferences,
// // // //     submitting,
// // // //     selectedSite,
// // // //     selectedBuilding,
// // // //     selectedFloor,
// // // //     selectedSeat,
// // // //     dayCount,
// // // //     step1Valid,
// // // //     // Modify mode
// // // //     isModifyMode,
// // // //     modifyBookingId,
// // // //     // Setters
// // // //     setSiteId,
// // // //     setBuildingId,
// // // //     setFloorId,
// // // //     setFromDate,
// // // //     setToDate,
// // // //     togglePreference,
// // // //     clearAll,
// // // //     findAvailableSeats,
// // // //     selectSeat,
// // // //     goToReview,
// // // //     confirmBooking,
// // // //     goBack,
// // // //     resetForm,
// // // //   };
// // // // }

// // // "use client";

// // // import { useCallback, useEffect, useState } from "react";
// // // import { useRouter, useSearchParams } from "next/navigation";
// // // import {
// // //   BookingFormState,
// // //   BookingStep,
// // //   Building,
// // //   CreateBookingResponse,
// // //   Floor,
// // //   Preference,
// // //   Seat,
// // //   Site,
// // // } from "../types/Bookingform.types";

// // // import {
// // //   createBooking,
// // //   fetchBuildings,
// // //   fetchFloors,
// // //   fetchPreferences,
// // //   fetchSeatsWithAvailability,
// // //   fetchSites,
// // // } from "../services/Bookingform.service";
// // // import { cancelBooking } from "@/features/bookings/services/bookings.service";


// // // function todayIso(): string {
// // //   return new Date().toISOString().slice(0, 10);
// // // }

// // // function plusDaysIso(n: number): string {
// // //   const d = new Date();
// // //   d.setDate(d.getDate() + n);
// // //   return d.toISOString().slice(0, 10);
// // // }

// // // // const DEFAULT_STATE: BookingFormState = {
// // // //   siteId:         "",
// // // //   buildingId:     "",
// // // //   floorId:        "",
// // // //   fromDate:       todayIso(),
// // // //   toDate:         plusDaysIso(2),
// // // //   preferences:    [],
// // // //   selectedSeatId: null,
// // // // };
// // // const DEFAULT_STATE: BookingFormState = {
// // //   siteId:         "",
// // //   buildingId:     "",
// // //   floorId:        "",
// // //   fromDate:       todayIso(),
// // //   toDate:         todayIso(),       // ← both default to today
// // //   preferences:    [],
// // //   selectedSeatId: null,
// // // };
// // // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // // function buildUrl(step: number, form: BookingFormState): string {
// // //   const params = new URLSearchParams();
// // //   params.set("step", String(step));
// // //   if (form.siteId)         params.set("siteId",      form.siteId);
// // //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// // //   if (form.floorId)        params.set("floorId",      form.floorId);
// // //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// // //   if (form.toDate)         params.set("toDate",       form.toDate);
// // //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// // //   return `/book?${params.toString()}`;
// // // }

// // // export function useBookingForm() {
// // //   const router       = useRouter();
// // //   const searchParams = useSearchParams();

// // //   // ── Modify-mode params ──────────────────────────────────────────────────
// // //   const modifyBookingId = searchParams.get("modifyBookingId");
// // //   const isModifyMode    = Boolean(modifyBookingId);

// // //   // ── Prefill by display name (injected by MyBookingsPage redirect) ───────
// // //   const prefillLocationName = searchParams.get("locationName") ?? null;
// // //   const prefillBuildingName = searchParams.get("buildingName") ?? null;
// // //   const prefillFloorName    = searchParams.get("floorName")    ?? null;
// // //   const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null;

// // //   // ── Prefill dates ───────────────────────────────────────────────────────
// // //   const prefillFromDate = searchParams.get("fromDate") ?? null;
// // //   const prefillToDate   = searchParams.get("toDate")   ?? null;

// // //   // ── Prefill preferences (comma-separated preference keys) ───────────────
// // //   // e.g. "window,dualMonitor" passed from MyBookingsPage via URL
// // //   const prefillPreferencesParam = searchParams.get("preferences") ?? null;
// // //   const prefillPreferences: string[] = prefillPreferencesParam
// // //     ? prefillPreferencesParam.split(",").filter(Boolean)
// // //     : [];

// // //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// // //   // ── Initial form state ──────────────────────────────────────────────────
// // //   // For modify mode: toDate should equal fromDate (single-day booking).
// // //   // Preferences: use URL-prefilled values if present (passed from MyBookingsPage),
// // //   // otherwise fall back to sessionStorage (restored in effect below).
// // //   const initialFromDate = prefillFromDate ?? todayIso();
// // //   // const initialToDate   = isModifyMode
// // //   //   ? initialFromDate                          // modify = single day
// // //   //   : (prefillToDate ?? plusDaysIso(2));
// // // const initialToDate =
// // //   prefillToDate              // 1. use whatever URL passed (modify OR fresh booking)
// // //   ?? (isModifyMode
// // //     ? initialFromDate        // 2. modify with no URL toDate → single-day
// // //     : todayIso());       // 3. fresh booking default
// // //   const [form, setForm] = useState<BookingFormState>({
// // //     siteId:         searchParams.get("siteId")     ?? "",
// // //     buildingId:     searchParams.get("buildingId") ?? "",
// // //     floorId:        searchParams.get("floorId")    ?? "",
// // //     fromDate:       initialFromDate,
// // //     toDate:         initialToDate,
// // //     selectedSeatId: searchParams.get("seatId")     ?? null,
// // //     // Use URL-passed preferences immediately (synchronous), avoids the
// // //     // async sessionStorage flash that caused preferences to appear blank.
// // //     preferences:    prefillPreferences,
// // //   });

// // //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// // //   const [sites,                setSites]                = useState<Site[]>([]);
// // //   const [buildings,            setBuildings]            = useState<Building[]>([]);
// // //   const [floors,               setFloors]               = useState<Floor[]>([]);
// // //   const [seats,                setSeats]                = useState<Seat[]>([]);
// // //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// // //   const [loadingSites,       setLoadingSites]       = useState(false);
// // //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// // //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// // //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// // //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// // //   const [submitting,         setSubmitting]         = useState(false);

// // //   const [error,        setError]        = useState<string | null>(null);
// // //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// // //   // ── Restore preferences from sessionStorage ──────────────────────────────
// // //   // Only restore from sessionStorage when:
// // //   //   • No preferences were passed via URL (i.e. not a modify-mode redirect), AND
// // //   //   • We're not in modify mode at all (fresh session navigation)
// // //   // This prevents sessionStorage from overwriting the URL-passed preferences.
// // //   // useEffect(() => {
// // //   //   if (prefillPreferences.length > 0) return; // URL already provided preferences — skip
// // //   //   try {
// // //   //     const saved = sessionStorage.getItem("bookingPreferences");
// // //   //     if (saved) {
// // //   //       const prefs = JSON.parse(saved) as string[];
// // //   //       if (prefs.length > 0) {
// // //   //         setForm((f) => ({ ...f, preferences: prefs }));
// // //   //       }
// // //   //     }
// // //   //   } catch {}
// // //   // // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   // }, []); // run once on mount
// // // useEffect(() => {
// // //   if (prefillPreferences.length > 0) return; // URL provided prefs — skip
// // //   if (!isModifyMode) {
// // //     // Fresh booking: clear any leftover preferences from a previous session
// // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // //     return;
// // //   }
// // //   // Modify mode but no prefs in URL — try sessionStorage as fallback
// // //   try {
// // //     const saved = sessionStorage.getItem("bookingPreferences");
// // //     if (saved) {
// // //       const prefs = JSON.parse(saved) as string[];
// // //       if (prefs.length > 0) {
// // //         setForm((f) => ({ ...f, preferences: prefs }));
// // //       }
// // //     }
// // //   } catch {}
// // // }, []); // eslint-disable-line react-hooks/exhaustive-deps

// // //   useEffect(() => {
// // //     try {
// // //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// // //     } catch {}
// // //   }, [form.preferences]);

// // //   // ── Navigate helper ──────────────────────────────────────────────────────
// // //   const navigateTo = useCallback(
// // //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// // //       setStepState(nextStep);
// // //       router.push(buildUrl(nextStep, nextForm));
// // //     },
// // //     [router],
// // //   );

// // //   // ── Load sites ───────────────────────────────────────────────────────────
// // //   useEffect(() => {
// // //     setLoadingSites(true);
// // //     fetchSites()
// // //       .then(setSites)
// // //       .catch((e) => setError(e.message))
// // //       .finally(() => setLoadingSites(false));
// // //   }, []);

// // //   // ── Load preferences ─────────────────────────────────────────────────────
// // //   useEffect(() => {
// // //     setLoadingPreferences(true);
// // //     fetchPreferences()
// // //       .then(setAvailablePreferences)
// // //       .catch((e) => setError(e.message))
// // //       .finally(() => setLoadingPreferences(false));
// // //   }, []);

// // //   // ── Load buildings ───────────────────────────────────────────────────────
// // //   useEffect(() => {
// // //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// // //     setBuildings([]);
// // //     setFloors([]);
// // //     setLoadingBuildings(true);
// // //     fetchBuildings(form.siteId)
// // //       .then(setBuildings)
// // //       .catch((e) => setError(e.message))
// // //       .finally(() => setLoadingBuildings(false));
// // //   }, [form.siteId]);

// // //   // ── Load floors ──────────────────────────────────────────────────────────
// // //   useEffect(() => {
// // //     if (!form.buildingId) { setFloors([]); return; }
// // //     setFloors([]);
// // //     setLoadingFloors(true);
// // //     fetchFloors(form.buildingId)
// // //       .then(setFloors)
// // //       .catch((e) => setError(e.message))
// // //       .finally(() => setLoadingFloors(false));
// // //   }, [form.buildingId]);

// // //   // ── Prefill resolution: locationName → siteId ────────────────────────────
// // //   useEffect(() => {
// // //     if (!prefillLocationName || sites.length === 0 || form.siteId) return;
// // //     const match = sites.find(
// // //       (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase(),
// // //     );
// // //     if (match) {
// // //       setForm((f) => ({
// // //         ...f,
// // //         siteId:     match.id,
// // //         buildingId: "",
// // //         floorId:    "",
// // //       }));
// // //     }
// // //   // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [sites, prefillLocationName]);

// // //   // ── Prefill resolution: buildingName → buildingId ────────────────────────
// // //   useEffect(() => {
// // //     if (!prefillBuildingName || buildings.length === 0 || form.buildingId) return;
// // //     const match = buildings.find(
// // //       (b) => b.name.toLowerCase() === prefillBuildingName.toLowerCase(),
// // //     );
// // //     if (match) {
// // //       setForm((f) => ({
// // //         ...f,
// // //         buildingId:     match.id,
// // //         floorId:        "",
// // //         selectedSeatId: null,
// // //       }));
// // //     }
// // //   // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [buildings, prefillBuildingName]);

// // //   // ── Auto-select building when there is exactly one (non-modify mode) ──────
// // //   useEffect(() => {
// // //     if (!prefillLocationName || prefillBuildingName || buildings.length !== 1 || form.buildingId) return;
// // //     setForm((f) => ({ ...f, buildingId: buildings[0].id }));
// // //   // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [buildings, prefillLocationName, prefillBuildingName]);

// // //   // ── Prefill resolution: floorName → floorId ──────────────────────────────
// // //   useEffect(() => {
// // //     if (!prefillFloorName || floors.length === 0 || form.floorId) return;
// // //     const match = floors.find(
// // //       (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
// // //     );
// // //     if (match) {
// // //       setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
// // //     }
// // //   // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [floors, prefillFloorName]);

// // //   // ── Prefill resolution: seatLabel → selectedSeatId ───────────────────────
// // //   useEffect(() => {
// // //     if (!prefillSeatLabel || seats.length === 0 || form.selectedSeatId) return;
// // //     const match = seats.find(
// // //       (s) => s.label.toLowerCase() === prefillSeatLabel.toLowerCase(),
// // //     );
// // //     if (match) {
// // //       setForm((f) => ({ ...f, selectedSeatId: match.id }));
// // //     }
// // //   // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [seats, prefillSeatLabel]);

// // //   // ── Resolve preference keys → numeric amenity IDs ────────────────────────
// // //   const resolveAmenityIds = useCallback(
// // //     (preferenceKeys: string[]): number[] => {
// // //       return preferenceKeys
// // //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// // //         .filter((id): id is string => id !== undefined)
// // //         .map((id) => parseInt(id, 10))
// // //         .filter((id) => !isNaN(id));
// // //     },
// // //     [availablePreferences],
// // //   );

// // // useEffect(() => {
// // //   if (prefillPreferences.length === 0) return;
// // //   if (availablePreferences.length === 0) return; // not loaded yet
// // //   // Re-apply prefill once preferences are loaded, filtering to only valid keys
// // //   const validKeys = prefillPreferences.filter((k) =>
// // //     availablePreferences.some((p) => p.key === k)
// // //   );
// // //   if (validKeys.length > 0) {
// // //     setForm((f) => ({ ...f, preferences: validKeys }));
// // //   }
// // // // eslint-disable-next-line react-hooks/exhaustive-deps
// // // }, [availablePreferences]);

// // //   // ── Re-fetch seats on step 2 refresh ─────────────────────────────────────
// // //   useEffect(() => {
// // //     if (
// // //       step === 2 &&
// // //       seats.length === 0 &&
// // //       form.floorId &&
// // //       form.fromDate &&
// // //       form.toDate
// // //     ) {
// // //       setLoadingSeats(true);
// // //       const amenityIds = resolveAmenityIds(form.preferences);
// // //       fetchSeatsWithAvailability({
// // //         floorId:     form.floorId,
// // //         fromDate:    form.fromDate,
// // //         toDate:      form.toDate,
// // //         preferences: form.preferences,
// // //         amenityIds,
// // //       })
// // //         .then(setSeats)
// // //         .catch((e) => setError(e.message))
// // //         .finally(() => setLoadingSeats(false));
// // //     }
// // //   // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [step]);

// // //   // ── Field setters ─────────────────────────────────────────────────────────

// // //   const setSiteId = (v: string | null) =>
// // //     setForm((f) => ({
// // //       ...f,
// // //       siteId:         v ?? "",
// // //       buildingId:     "",
// // //       floorId:        "",
// // //       selectedSeatId: null,
// // //     }));

// // //   const setBuildingId = (v: string | null) =>
// // //     setForm((f) => ({
// // //       ...f,
// // //       buildingId:     v ?? "",
// // //       floorId:        "",
// // //       selectedSeatId: null,
// // //     }));

// // //   const setFloorId = (v: string | null) =>
// // //     setForm((f) => ({
// // //       ...f,
// // //       floorId:        v ?? "",
// // //       selectedSeatId: null,
// // //     }));

// // //   const setFromDate = (v: string) =>
// // //     setForm((f) => ({
// // //       ...f,
// // //       fromDate: v,
// // //       // In modify mode keep fromDate === toDate (single-day booking).
// // //       // In normal mode, clamp toDate up if it would go before fromDate.
// // //       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
// // //     }));

// // //   const setToDate = (v: string) =>
// // //     setForm((f) => ({ ...f, toDate: v }));

// // //   const togglePreference = (key: string) =>
// // //     setForm((f) => ({
// // //       ...f,
// // //       preferences: f.preferences.includes(key)
// // //         ? f.preferences.filter((p) => p !== key)
// // //         : [...f.preferences, key],
// // //     }));

// // //   const clearAll = () =>
// // //     setForm((f) => ({ ...f, preferences: [] }));

// // //   // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
// // // //   const findAvailableSeats = useCallback(async () => {
// // // //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// // // //     setLoadingSeats(true);
// // // //     setError(null);

// // // //     try {
// // // //       const amenityIds = resolveAmenityIds(form.preferences);
// // // //       const data = await fetchSeatsWithAvailability({
// // // //         floorId:     form.floorId,
// // // //         fromDate:    form.fromDate,
// // // //         toDate:      form.toDate,
// // // //         preferences: form.preferences,
// // // //         amenityIds,
// // // //       });
// // // //       console.log("amenityIds resolved:", amenityIds);
// // // // console.log("form.preferences:", form.preferences);
// // // // console.log("availablePreferences:", availablePreferences);
// // // //       setSeats(data);
// // // //       navigateTo(2, form);
// // // //     } catch (e: unknown) {
// // // //       setError(e instanceof Error ? e.message : "Failed to load seats");
// // // //     } finally {
// // // //       setLoadingSeats(false);
// // // //     }
// // // //   }, [form, resolveAmenityIds, navigateTo]);

// // // const findAvailableSeats = useCallback(async () => {
// // //   if (!form.floorId || !form.fromDate || !form.toDate) return;
// // //   setLoadingSeats(true);
// // //   setError(null);
// // //   try {
// // //     const amenityIds = resolveAmenityIds(form.preferences);
// // //     const data = await fetchSeatsWithAvailability({
// // //       floorId:       form.floorId,
// // //       fromDate:      form.fromDate,
// // //       toDate:        form.toDate,
// // //       preferences:   form.preferences,
// // //       amenityIds,
// // //       currentSeatId: searchParams.get("seatId") ?? undefined, // ← ADD THIS
// // //     });
// // //     setSeats(data);
// // //     navigateTo(2, form);
// // //   } catch (e: unknown) {
// // //     setError(e instanceof Error ? e.message : "Failed to load seats");
// // //   } finally {
// // //     setLoadingSeats(false);
// // //   }
// // // }, [form, resolveAmenityIds, navigateTo, searchParams]);

// // //   // ── Step 2: select seat ───────────────────────────────────────────────────
// // //   const selectSeat = (seatId: string | null) => {
// // //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// // //   };

// // //   // ── Step 2 → Step 3 ───────────────────────────────────────────────────────
// // //   const goToReview = () => {
// // //     if (!form.selectedSeatId) return;
// // //     navigateTo(3, form);
// // //   };

// // //   // ── Step 3: confirm booking ───────────────────────────────────────────────
// // //   const confirmBooking = useCallback(async () => {
// // //     if (!form.selectedSeatId) return;

// // //     setSubmitting(true);
// // //     setError(null);

// // //     try {
// // //       // Modify mode: cancel the original booking first
// // //       if (isModifyMode && modifyBookingId) {
// // //         try {
// // //           await cancelBooking(modifyBookingId, "Modified by user");
// // //         } catch (cancelErr: any) {
// // //           const status = cancelErr?.response?.status;
// // //           if (status !== 404 && status !== 409) {
// // //             throw new Error(
// // //               cancelErr?.response?.data?.message ??
// // //               "Failed to cancel the original booking before modifying. Please try again.",
// // //             );
// // //           }
// // //         }
// // //       }

// // //       const result = await createBooking({
// // //         site_id:      Number(form.siteId),
// // //         building_id:  Number(form.buildingId),
// // //         floor_id:     Number(form.floorId),
// // //         seat_id:      Number(form.selectedSeatId),
// // //         booking_date: form.fromDate,
// // //       });

// // //       setConfirmation(result);
// // //       setStepState(3);

// // //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // //     } catch (err: any) {
// // //       const status = err?.response?.status;
// // //       if (status === 409) {
// // //         setError("This seat is already booked for the selected date. Please choose a different seat.");
// // //       } else if (status === 400) {
// // //         setError("Invalid booking details. Please go back and check your selection.");
// // //       } else if (status === 403) {
// // //         setError("You don't have permission to book this seat.");
// // //       } else if (status === 404) {
// // //         setError("The selected seat is no longer available. Please go back and choose another.");
// // //       } else {
// // //         setError(
// // //           err?.response?.data?.message ??
// // //           err?.message ??
// // //           "Failed to confirm booking. Please try again.",
// // //         );
// // //       }
// // //     } finally {
// // //       setSubmitting(false);
// // //     }
// // //   }, [form, isModifyMode, modifyBookingId]);

// // //   // ── Navigation helpers ────────────────────────────────────────────────────
// // //   const goBack = () => {
// // //     const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
// // //     const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
// // //     setForm(clearedForm);
// // //     navigateTo(prevStep, clearedForm);
// // //   };

// // //   const resetForm = () => {
// // //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// // //     setForm(DEFAULT_STATE);
// // //     setStepState(1);
// // //     setBuildings([]);
// // //     setFloors([]);
// // //     setSeats([]);
// // //     setConfirmation(null);
// // //     setError(null);
// // //     router.push("/book");
// // //   };

// // //   // ── Derived ───────────────────────────────────────────────────────────────
// // //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// // //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// // //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// // //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// // //   const dayCount = (() => {
// // //     if (!form.fromDate || !form.toDate) return 0;
// // //     const diff =
// // //       new Date(form.toDate + "T00:00:00").getTime() -
// // //       new Date(form.fromDate + "T00:00:00").getTime();
// // //     return Math.round(diff / 86_400_000) + 1;
// // //   })();

// // //   const step1Valid =
// // //     !!form.siteId     &&
// // //     !!form.buildingId &&
// // //     !!form.floorId    &&
// // //     !!form.fromDate   &&
// // //     !!form.toDate;

// // //   return {
// // //     step,
// // //     form,
// // //     sites,
// // //     buildings,
// // //     floors,
// // //     seats,
// // //     availablePreferences,
// // //     confirmation,
// // //     error,
// // //     loadingSites,
// // //     loadingBuildings,
// // //     loadingFloors,
// // //     loadingSeats,
// // //     loadingPreferences,
// // //     submitting,
// // //     selectedSite,
// // //     selectedBuilding,
// // //     selectedFloor,
// // //     selectedSeat,
// // //     dayCount,
// // //     step1Valid,
// // //     isModifyMode,
// // //     modifyBookingId,
// // //     setSiteId,
// // //     setBuildingId,
// // //     setFloorId,
// // //     setFromDate,
// // //     setToDate,
// // //     togglePreference,
// // //     clearAll,
// // //     findAvailableSeats,
// // //     selectSeat,
// // //     goToReview,
// // //     confirmBooking,
// // //     goBack,
// // //     resetForm,
// // //   };
// // // }

// // "use client";

// // import { useCallback, useEffect, useState } from "react";
// // import { useRouter, useSearchParams } from "next/navigation";
// // import {
// //   BookingFormState,
// //   BookingStep,
// //   Building,
// //   CreateBookingResponse,
// //   Floor,
// //   Preference,
// //   Seat,
// //   Site,
// // } from "../types/Bookingform.types";

// // import {
// //   createBooking,
// //   fetchBuildings,
// //   fetchFloors,
// //   fetchPreferences,
// //   fetchSeatsWithAvailability,
// //   fetchSites,
// // } from "../services/Bookingform.service";
// // import { cancelBooking } from "@/features/bookings/services/bookings.service";

// // // ── Date helpers ──────────────────────────────────────────────────────────────

// // function todayIso(): string {
// //   return new Date().toISOString().slice(0, 10);
// // }

// // // ── Default state (both dates = today, everything else empty) ─────────────────

// // const DEFAULT_STATE: BookingFormState = {
// //   siteId:         "",
// //   buildingId:     "",
// //   floorId:        "",
// //   fromDate:       todayIso(),
// //   toDate:         todayIso(),   // ← today, not +2 days
// //   preferences:    [],
// //   selectedSeatId: null,
// // };

// // // ── URL builder ───────────────────────────────────────────────────────────────
// // // URL params are the single source of truth — no sessionStorage, no localStorage.
// // // This keeps state shareable, refresh-safe, and back-button compatible.

// // function buildUrl(step: number, form: BookingFormState): string {
// //   const params = new URLSearchParams();
// //   params.set("step", String(step));
// //   if (form.siteId)         params.set("siteId",      form.siteId);
// //   if (form.buildingId)     params.set("buildingId",   form.buildingId);
// //   if (form.floorId)        params.set("floorId",      form.floorId);
// //   if (form.fromDate)       params.set("fromDate",     form.fromDate);
// //   if (form.toDate)         params.set("toDate",       form.toDate);
// //   if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
// //   if (form.preferences.length > 0)
// //     params.set("preferences", form.preferences.join(","));
// //   return `/book?${params.toString()}`;
// // }

// // // ── Hook ──────────────────────────────────────────────────────────────────────

// // export function useBookingForm() {
// //   const router       = useRouter();
// //   const searchParams = useSearchParams();

// //   // ── Read every param once up-front ─────────────────────────────────────────

// //   const modifyBookingId = searchParams.get("modifyBookingId");
// //   const isModifyMode    = Boolean(modifyBookingId);

// //   const prefillLocationName = searchParams.get("locationName") ?? null;
// //   const prefillBuildingName = searchParams.get("buildingName") ?? null;
// //   const prefillFloorName    = searchParams.get("floorName")    ?? null;
// //   const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null;

// //   const prefillFromDate = searchParams.get("fromDate") ?? null;
// //   const prefillToDate   = searchParams.get("toDate")   ?? null;

// //   // Preferences arrive as a comma-separated param — e.g. "window,dualMonitor"
// //   const prefillPreferencesParam = searchParams.get("preferences") ?? null;
// //   const prefillPreferences: string[] = prefillPreferencesParam
// //     ? prefillPreferencesParam.split(",").filter(Boolean)
// //     : [];

// //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// //   // ── Detect a clean /book navigation (sidebar click, no params) ─────────────
// //   // When there are no meaningful params it means the user clicked "Book a Seat"
// //   // freshly — start with DEFAULT_STATE rather than carrying over prior values.

// //   const hasAnyParam = Boolean(
// //     searchParams.get("modifyBookingId") ||
// //     searchParams.get("step")            ||
// //     searchParams.get("siteId")          ||
// //     searchParams.get("fromDate")
// //   );

// //   // ── Derive initial values ───────────────────────────────────────────────────

// //   const initialFromDate = prefillFromDate ?? todayIso();
// //   const initialToDate   = prefillToDate ?? (isModifyMode ? initialFromDate : todayIso());

// //   // ── State ───────────────────────────────────────────────────────────────────

// //   const [form, setForm] = useState<BookingFormState>(() => {
// //     // Fresh /book navigation — use clean defaults immediately
// //     if (!hasAnyParam) return { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };

// //     return {
// //       siteId:         searchParams.get("siteId")     ?? "",
// //       buildingId:     searchParams.get("buildingId") ?? "",
// //       floorId:        searchParams.get("floorId")    ?? "",
// //       fromDate:       initialFromDate,
// //       toDate:         initialToDate,
// //       selectedSeatId: searchParams.get("seatId")     ?? null,
// //       preferences:    prefillPreferences,
// //     };
// //   });

// //   const [step, setStepState] = useState<BookingStep>(() =>
// //     hasAnyParam ? stepFromUrl : 1
// //   );

// //   const [sites,                setSites]                = useState<Site[]>([]);
// //   const [buildings,            setBuildings]            = useState<Building[]>([]);
// //   const [floors,               setFloors]               = useState<Floor[]>([]);
// //   const [seats,                setSeats]                = useState<Seat[]>([]);
// //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// //   const [loadingSites,       setLoadingSites]       = useState(false);
// //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// //   const [submitting,         setSubmitting]         = useState(false);

// //   const [error,        setError]        = useState<string | null>(null);
// //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// //   // ── Reset when URL becomes param-free (sidebar "Book a Seat" click) ─────────
// //   // useSearchParams() gives a stable reference per navigation, so serialising
// //   // it as a string is the correct dependency for detecting param changes.

// //   useEffect(() => {
// //     if (hasAnyParam) return;

// //     // Clean navigation — reset everything to defaults
// //     setForm({ ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() });
// //     setStepState(1);
// //     setBuildings([]);
// //     setFloors([]);
// //     setSeats([]);
// //     setConfirmation(null);
// //     setError(null);
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [searchParams.toString()]);

// //   // ── Re-apply preferences once the available list has loaded ──────────────────
// //   // Needed because prefillPreferences arrives as string keys, but we want to
// //   // validate them against the loaded preference list to discard stale/invalid keys.

// //   useEffect(() => {
// //     if (prefillPreferences.length === 0) return;
// //     if (availablePreferences.length === 0) return;

// //     const validKeys = prefillPreferences.filter((k) =>
// //       availablePreferences.some((p) => p.key === k)
// //     );
// //     if (validKeys.length > 0) {
// //       setForm((f) => ({ ...f, preferences: validKeys }));
// //     }
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [availablePreferences]);

// //   // ── Navigate helper ──────────────────────────────────────────────────────────

// //   const navigateTo = useCallback(
// //     (nextStep: BookingStep, nextForm: BookingFormState) => {
// //       setStepState(nextStep);
// //       router.push(buildUrl(nextStep, nextForm));
// //     },
// //     [router],
// //   );

// //   // ── Data fetching ────────────────────────────────────────────────────────────

// //   useEffect(() => {
// //     setLoadingSites(true);
// //     fetchSites()
// //       .then(setSites)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingSites(false));
// //   }, []);

// //   useEffect(() => {
// //     setLoadingPreferences(true);
// //     fetchPreferences()
// //       .then(setAvailablePreferences)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingPreferences(false));
// //   }, []);

// //   useEffect(() => {
// //     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
// //     setBuildings([]);
// //     setFloors([]);
// //     setLoadingBuildings(true);
// //     fetchBuildings(form.siteId)
// //       .then(setBuildings)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingBuildings(false));
// //   }, [form.siteId]);

// //   useEffect(() => {
// //     if (!form.buildingId) { setFloors([]); return; }
// //     setFloors([]);
// //     setLoadingFloors(true);
// //     fetchFloors(form.buildingId)
// //       .then(setFloors)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingFloors(false));
// //   }, [form.buildingId]);

// //   // ── Prefill resolution: display names → IDs ───────────────────────────────
// //   // MyBookingsPage passes human-readable names in the URL because it doesn't
// //   // have access to the ID maps. These effects resolve them once the lists load.

// //   useEffect(() => {
// //     if (!prefillLocationName || sites.length === 0 || form.siteId) return;
// //     const match = sites.find(
// //       (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase(),
// //     );
// //     if (match) setForm((f) => ({ ...f, siteId: match.id, buildingId: "", floorId: "" }));
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [sites, prefillLocationName]);

// //   useEffect(() => {
// //     if (!prefillBuildingName || buildings.length === 0 || form.buildingId) return;
// //     const match = buildings.find(
// //       (b) => b.name.toLowerCase() === prefillBuildingName.toLowerCase(),
// //     );
// //     if (match) setForm((f) => ({ ...f, buildingId: match.id, floorId: "", selectedSeatId: null }));
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [buildings, prefillBuildingName]);

// //   // Auto-select building when there is exactly one (and no explicit prefill)
// //   useEffect(() => {
// //     if (!prefillLocationName || prefillBuildingName || buildings.length !== 1 || form.buildingId) return;
// //     setForm((f) => ({ ...f, buildingId: buildings[0].id }));
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [buildings, prefillLocationName, prefillBuildingName]);

// //   useEffect(() => {
// //     if (!prefillFloorName || floors.length === 0 || form.floorId) return;
// //     const match = floors.find(
// //       (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
// //     );
// //     if (match) setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [floors, prefillFloorName]);

// //   useEffect(() => {
// //     if (!prefillSeatLabel || seats.length === 0 || form.selectedSeatId) return;
// //     const match = seats.find(
// //       (s) => s.label.toLowerCase() === prefillSeatLabel.toLowerCase(),
// //     );
// //     if (match) setForm((f) => ({ ...f, selectedSeatId: match.id }));
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [seats, prefillSeatLabel]);

// //   // ── Re-fetch seats on step 2 refresh ─────────────────────────────────────────

// //   useEffect(() => {
// //     if (step === 2 && seats.length === 0 && form.floorId && form.fromDate && form.toDate) {
// //       setLoadingSeats(true);
// //       const amenityIds = resolveAmenityIds(form.preferences);
// //       fetchSeatsWithAvailability({
// //         floorId:       form.floorId,
// //         fromDate:      form.fromDate,
// //         toDate:        form.toDate,
// //         preferences:   form.preferences,
// //         amenityIds,
// //         currentSeatId: searchParams.get("seatId") ?? undefined,
// //       })
// //         .then(setSeats)
// //         .catch((e) => setError(e.message))
// //         .finally(() => setLoadingSeats(false));
// //     }
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [step]);

// //   // ── Preference resolver ───────────────────────────────────────────────────────

// //   const resolveAmenityIds = useCallback(
// //     (preferenceKeys: string[]): number[] =>
// //       preferenceKeys
// //         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
// //         .filter((id): id is string => id !== undefined)
// //         .map((id) => parseInt(id, 10))
// //         .filter((id) => !isNaN(id)),
// //     [availablePreferences],
// //   );

// //   // ── Field setters ─────────────────────────────────────────────────────────────

// //   const setSiteId = (v: string | null) =>
// //     setForm((f) => ({ ...f, siteId: v ?? "", buildingId: "", floorId: "", selectedSeatId: null }));

// //   const setBuildingId = (v: string | null) =>
// //     setForm((f) => ({ ...f, buildingId: v ?? "", floorId: "", selectedSeatId: null }));

// //   const setFloorId = (v: string | null) =>
// //     setForm((f) => ({ ...f, floorId: v ?? "", selectedSeatId: null }));

// //   const setFromDate = (v: string) =>
// //     setForm((f) => ({
// //       ...f,
// //       fromDate: v,
// //       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
// //     }));

// //   const setToDate = (v: string) =>
// //     setForm((f) => ({ ...f, toDate: v }));

// //   const togglePreference = (key: string) =>
// //     setForm((f) => ({
// //       ...f,
// //       preferences: f.preferences.includes(key)
// //         ? f.preferences.filter((p) => p !== key)
// //         : [...f.preferences, key],
// //     }));

// //   const clearAll = () => setForm((f) => ({ ...f, preferences: [] }));

// //   // ── Step 1 → Step 2: find available seats ─────────────────────────────────────

// //   const findAvailableSeats = useCallback(async () => {
// //     if (!form.floorId || !form.fromDate || !form.toDate) return;
// //     setLoadingSeats(true);
// //     setError(null);
// //     try {
// //       const amenityIds = resolveAmenityIds(form.preferences);
// //       const data = await fetchSeatsWithAvailability({
// //         floorId:       form.floorId,
// //         fromDate:      form.fromDate,
// //         toDate:        form.toDate,
// //         preferences:   form.preferences,
// //         amenityIds,
// //         currentSeatId: searchParams.get("seatId") ?? undefined,
// //       });
// //       setSeats(data);
// //       navigateTo(2, form);
// //     } catch (e: unknown) {
// //       setError(e instanceof Error ? e.message : "Failed to load seats");
// //     } finally {
// //       setLoadingSeats(false);
// //     }
// //   }, [form, resolveAmenityIds, navigateTo, searchParams]);

// //   // ── Step 2: select seat ───────────────────────────────────────────────────────

// //   const selectSeat = (seatId: string | null) =>
// //     setForm((f) => ({ ...f, selectedSeatId: seatId }));

// //   // ── Step 2 → Step 3: go to review ─────────────────────────────────────────────

// //   const goToReview = () => {
// //     if (!form.selectedSeatId) return;
// //     navigateTo(3, form);
// //   };

// //   // ── Step 3: confirm booking ────────────────────────────────────────────────────

// //   const confirmBooking = useCallback(async () => {
// //     if (!form.selectedSeatId) return;
// //     setSubmitting(true);
// //     setError(null);

// //     try {
// //       if (isModifyMode && modifyBookingId) {
// //         try {
// //           await cancelBooking(modifyBookingId, "Modified by user");
// //         } catch (cancelErr: any) {
// //           const status = cancelErr?.response?.status;
// //           if (status !== 404 && status !== 409) {
// //             throw new Error(
// //               cancelErr?.response?.data?.message ??
// //               "Failed to cancel the original booking before modifying. Please try again.",
// //             );
// //           }
// //         }
// //       }

// //       const result = await createBooking({
// //         site_id:      Number(form.siteId),
// //         building_id:  Number(form.buildingId),
// //         floor_id:     Number(form.floorId),
// //         seat_id:      Number(form.selectedSeatId),
// //         booking_date: form.fromDate,
// //       });

// //       setConfirmation(result);
// //       setStepState(3);
// //     } catch (err: any) {
// //       const status = err?.response?.status;
// //       if (status === 409) {
// //         setError("This seat is already booked for the selected date. Please choose a different seat.");
// //       } else if (status === 400) {
// //         setError("Invalid booking details. Please go back and check your selection.");
// //       } else if (status === 403) {
// //         setError("You don't have permission to book this seat.");
// //       } else if (status === 404) {
// //         setError("The selected seat is no longer available. Please go back and choose another.");
// //       } else {
// //         setError(
// //           err?.response?.data?.message ??
// //           err?.message ??
// //           "Failed to confirm booking. Please try again.",
// //         );
// //       }
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   }, [form, isModifyMode, modifyBookingId]);

// //   // ── Navigation helpers ────────────────────────────────────────────────────────

// //   const goBack = () => {
// //     const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
// //     const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
// //     setForm(clearedForm);
// //     navigateTo(prevStep, clearedForm);
// //   };

// //   const resetForm = () => {
// //     const fresh = { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
// //     setForm(fresh);
// //     setStepState(1);
// //     setBuildings([]);
// //     setFloors([]);
// //     setSeats([]);
// //     setConfirmation(null);
// //     setError(null);
// //     router.push("/book");
// //   };

// //   // ── Derived values ────────────────────────────────────────────────────────────

// //   const selectedSite     = sites.find((s) => s.id === form.siteId);
// //   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
// //   const selectedFloor    = floors.find((f) => f.id === form.floorId);
// //   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

// //   const dayCount = (() => {
// //     if (!form.fromDate || !form.toDate) return 0;
// //     const diff =
// //       new Date(form.toDate + "T00:00:00").getTime() -
// //       new Date(form.fromDate + "T00:00:00").getTime();
// //     return Math.round(diff / 86_400_000) + 1;
// //   })();

// //   const step1Valid =
// //     !!form.siteId     &&
// //     !!form.buildingId &&
// //     !!form.floorId    &&
// //     !!form.fromDate   &&
// //     !!form.toDate;

// //   return {
// //     step,
// //     form,
// //     sites,
// //     buildings,
// //     floors,
// //     seats,
// //     availablePreferences,
// //     confirmation,
// //     error,
// //     loadingSites,
// //     loadingBuildings,
// //     loadingFloors,
// //     loadingSeats,
// //     loadingPreferences,
// //     submitting,
// //     selectedSite,
// //     selectedBuilding,
// //     selectedFloor,
// //     selectedSeat,
// //     dayCount,
// //     step1Valid,
// //     isModifyMode,
// //     modifyBookingId,
// //     setSiteId,
// //     setBuildingId,
// //     setFloorId,
// //     setFromDate,
// //     setToDate,
// //     togglePreference,
// //     clearAll,
// //     findAvailableSeats,
// //     selectSeat,
// //     goToReview,
// //     confirmBooking,
// //     goBack,
// //     resetForm,
// //   };
// // }

// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import {
//   BookingFormState,
//   BookingStep,
//   Building,
//   CreateBookingResponse,
//   Floor,
//   Preference,
//   Seat,
//   Site,
// } from "../types/Bookingform.types";

// import {
//   createBooking,
//   modifyBooking,
//   fetchBuildings,
//   fetchFloors,
//   fetchPreferences,
//   fetchSeatsWithAvailability,
//   fetchSites,
// } from "../services/Bookingform.service";

// // ── Date helpers ──────────────────────────────────────────────────────────────

// function todayIso(): string {
//   return new Date().toISOString().slice(0, 10);
// }

// // ── Default state ─────────────────────────────────────────────────────────────

// const DEFAULT_STATE: BookingFormState = {
//   siteId:         "",
//   buildingId:     "",
//   floorId:        "",
//   fromDate:       todayIso(),
//   toDate:         todayIso(),
//   preferences:    [],
//   selectedSeatId: null,
// };

// // ── URL builder — URL params are the single source of truth ──────────────────
// // No sessionStorage, no localStorage. State lives in the URL so it is
// // shareable, survives page refresh, and works with the browser back button.

// function buildUrl(step: number, form: BookingFormState): string {
//   const params = new URLSearchParams();
//   params.set("step", String(step));
//   if (form.siteId)                 params.set("siteId",      form.siteId);
//   if (form.buildingId)             params.set("buildingId",   form.buildingId);
//   if (form.floorId)                params.set("floorId",      form.floorId);
//   if (form.fromDate)               params.set("fromDate",     form.fromDate);
//   if (form.toDate)                 params.set("toDate",       form.toDate);
//   if (form.selectedSeatId)         params.set("seatId",       form.selectedSeatId);
//   if (form.preferences.length > 0) params.set("preferences",  form.preferences.join(","));
//   return `/book?${params.toString()}`;
// }

// // ── Hook ──────────────────────────────────────────────────────────────────────

// export function useBookingForm() {
//   const router       = useRouter();
//   const searchParams = useSearchParams();

//   // ── Read params once up-front ───────────────────────────────────────────────

//   const modifyBookingId = searchParams.get("modifyBookingId");
//   const isModifyMode    = Boolean(modifyBookingId);

//   const prefillLocationName = searchParams.get("locationName") ?? null;
//   const prefillBuildingName = searchParams.get("buildingName") ?? null;
//   const prefillFloorName    = searchParams.get("floorName")    ?? null;
//   const prefillSeatLabel    = searchParams.get("seatLabel")    ?? null;

//   const prefillFromDate = searchParams.get("fromDate") ?? null;
//   const prefillToDate   = searchParams.get("toDate")   ?? null;

//   // Preferences travel as a comma-separated URL param — e.g. "window,dualMonitor"
//   const prefillPreferencesParam = searchParams.get("preferences") ?? null;
//   const prefillPreferences: string[] = prefillPreferencesParam
//     ? prefillPreferencesParam.split(",").filter(Boolean)
//     : [];

//   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

//   // ── Detect a clean /book navigation (sidebar "Book a Seat" click) ──────────
//   // A sidebar click pushes /book with zero params → reset to defaults.
//   // Modify-mode and step-based navigation always carry at least one param.

//   const hasAnyParam = Boolean(
//     searchParams.get("modifyBookingId") ||
//     searchParams.get("step")            ||
//     searchParams.get("siteId")          ||
//     searchParams.get("fromDate")
//   );

//   // ── Initial form values ─────────────────────────────────────────────────────

//   const initialFromDate = prefillFromDate ?? todayIso();
//   const initialToDate   = prefillToDate ?? (isModifyMode ? initialFromDate : todayIso());

//   // ── State ───────────────────────────────────────────────────────────────────

//   const [form, setForm] = useState<BookingFormState>(() => {
//     if (!hasAnyParam) return { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
//     return {
//       siteId:         searchParams.get("siteId")     ?? "",
//       buildingId:     searchParams.get("buildingId") ?? "",
//       floorId:        searchParams.get("floorId")    ?? "",
//       fromDate:       initialFromDate,
//       toDate:         initialToDate,
//       selectedSeatId: searchParams.get("seatId")     ?? null,
//       preferences:    prefillPreferences,
//     };
//   });

//   const [step, setStepState] = useState<BookingStep>(() =>
//     hasAnyParam ? stepFromUrl : 1
//   );

//   const [sites,                setSites]                = useState<Site[]>([]);
//   const [buildings,            setBuildings]            = useState<Building[]>([]);
//   const [floors,               setFloors]               = useState<Floor[]>([]);
//   const [seats,                setSeats]                = useState<Seat[]>([]);
//   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

//   const [loadingSites,       setLoadingSites]       = useState(false);
//   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
//   const [loadingFloors,      setLoadingFloors]      = useState(false);
//   const [loadingSeats,       setLoadingSeats]       = useState(false);
//   const [loadingPreferences, setLoadingPreferences] = useState(false);
//   const [submitting,         setSubmitting]         = useState(false);

//   const [error,        setError]        = useState<string | null>(null);
//   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

//   // ── Reset on clean /book navigation ─────────────────────────────────────────

//   useEffect(() => {
//     if (hasAnyParam) return;
//     setForm({ ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() });
//     setStepState(1);
//     setBuildings([]);
//     setFloors([]);
//     setSeats([]);
//     setConfirmation(null);
//     setError(null);
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [searchParams.toString()]);

//   // ── Re-validate prefill preferences once the list is loaded ─────────────────

//   useEffect(() => {
//     if (prefillPreferences.length === 0) return;
//     if (availablePreferences.length === 0) return;
//     const validKeys = prefillPreferences.filter((k) =>
//       availablePreferences.some((p) => p.key === k)
//     );
//     if (validKeys.length > 0) {
//       setForm((f) => ({ ...f, preferences: validKeys }));
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [availablePreferences]);

//   // ── Navigate helper ──────────────────────────────────────────────────────────

//   const navigateTo = useCallback(
//     (nextStep: BookingStep, nextForm: BookingFormState) => {
//       setStepState(nextStep);
//       router.push(buildUrl(nextStep, nextForm));
//     },
//     [router],
//   );

//   // ── Data fetching ────────────────────────────────────────────────────────────

//   useEffect(() => {
//     setLoadingSites(true);
//     fetchSites()
//       .then(setSites)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingSites(false));
//   }, []);

//   useEffect(() => {
//     setLoadingPreferences(true);
//     fetchPreferences()
//       .then(setAvailablePreferences)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingPreferences(false));
//   }, []);

//   useEffect(() => {
//     if (!form.siteId) { setBuildings([]); setFloors([]); return; }
//     setBuildings([]);
//     setFloors([]);
//     setLoadingBuildings(true);
//     fetchBuildings(form.siteId)
//       .then(setBuildings)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingBuildings(false));
//   }, [form.siteId]);

//   useEffect(() => {
//     if (!form.buildingId) { setFloors([]); return; }
//     setFloors([]);
//     setLoadingFloors(true);
//     fetchFloors(form.buildingId)
//       .then(setFloors)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingFloors(false));
//   }, [form.buildingId]);

//   // ── Prefill resolution: display names → IDs ──────────────────────────────────

//   useEffect(() => {
//     if (!prefillLocationName || sites.length === 0 || form.siteId) return;
//     const match = sites.find(
//       (s) => s.name.toLowerCase() === prefillLocationName.toLowerCase(),
//     );
//     if (match) setForm((f) => ({ ...f, siteId: match.id, buildingId: "", floorId: "" }));
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sites, prefillLocationName]);

//   useEffect(() => {
//     if (!prefillBuildingName || buildings.length === 0 || form.buildingId) return;
//     const match = buildings.find(
//       (b) => b.name.toLowerCase() === prefillBuildingName.toLowerCase(),
//     );
//     if (match) setForm((f) => ({ ...f, buildingId: match.id, floorId: "", selectedSeatId: null }));
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [buildings, prefillBuildingName]);

//   // Auto-select building when only one exists
//   useEffect(() => {
//     if (!prefillLocationName || prefillBuildingName || buildings.length !== 1 || form.buildingId) return;
//     setForm((f) => ({ ...f, buildingId: buildings[0].id }));
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [buildings, prefillLocationName, prefillBuildingName]);

//   useEffect(() => {
//     if (!prefillFloorName || floors.length === 0 || form.floorId) return;
//     const match = floors.find(
//       (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
//     );
//     if (match) setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [floors, prefillFloorName]);

//   useEffect(() => {
//     if (!prefillSeatLabel || seats.length === 0 || form.selectedSeatId) return;
//     const match = seats.find(
//       (s) => s.label.toLowerCase() === prefillSeatLabel.toLowerCase(),
//     );
//     if (match) setForm((f) => ({ ...f, selectedSeatId: match.id }));
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [seats, prefillSeatLabel]);

//   // ── Re-fetch seats on step 2 page refresh ────────────────────────────────────

//   useEffect(() => {
//     if (step === 2 && seats.length === 0 && form.floorId && form.fromDate && form.toDate) {
//       setLoadingSeats(true);
//       const amenityIds = resolveAmenityIds(form.preferences);
//       fetchSeatsWithAvailability({
//         floorId:       form.floorId,
//         fromDate:      form.fromDate,
//         toDate:        form.toDate,
//         preferences:   form.preferences,
//         amenityIds,
//         currentSeatId: searchParams.get("seatId") ?? undefined,
//       })
//         .then(setSeats)
//         .catch((e) => setError(e.message))
//         .finally(() => setLoadingSeats(false));
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [step]);

//   // ── Preference resolver ───────────────────────────────────────────────────────

//   const resolveAmenityIds = useCallback(
//     (preferenceKeys: string[]): number[] =>
//       preferenceKeys
//         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
//         .filter((id): id is string => id !== undefined)
//         .map((id) => parseInt(id, 10))
//         .filter((id) => !isNaN(id)),
//     [availablePreferences],
//   );

//   // ── Field setters ─────────────────────────────────────────────────────────────

//   const setSiteId = (v: string | null) =>
//     setForm((f) => ({ ...f, siteId: v ?? "", buildingId: "", floorId: "", selectedSeatId: null }));

//   const setBuildingId = (v: string | null) =>
//     setForm((f) => ({ ...f, buildingId: v ?? "", floorId: "", selectedSeatId: null }));

//   const setFloorId = (v: string | null) =>
//     setForm((f) => ({ ...f, floorId: v ?? "", selectedSeatId: null }));

//   const setFromDate = (v: string) =>
//     setForm((f) => ({
//       ...f,
//       fromDate: v,
//       toDate: isModifyMode ? v : f.toDate < v ? v : f.toDate,
//     }));

//   const setToDate = (v: string) =>
//     setForm((f) => ({ ...f, toDate: v }));

//   const togglePreference = (key: string) =>
//     setForm((f) => ({
//       ...f,
//       preferences: f.preferences.includes(key)
//         ? f.preferences.filter((p) => p !== key)
//         : [...f.preferences, key],
//     }));

//   const clearAll = () => setForm((f) => ({ ...f, preferences: [] }));

//   // ── Step 1 → Step 2 ───────────────────────────────────────────────────────────

//   const findAvailableSeats = useCallback(async () => {
//     if (!form.floorId || !form.fromDate || !form.toDate) return;
//     setLoadingSeats(true);
//     setError(null);
//     try {
//       const amenityIds = resolveAmenityIds(form.preferences);
//       const data = await fetchSeatsWithAvailability({
//         floorId:       form.floorId,
//         fromDate:      form.fromDate,
//         toDate:        form.toDate,
//         preferences:   form.preferences,
//         amenityIds,
//         currentSeatId: searchParams.get("seatId") ?? undefined,
//       });
//       setSeats(data);
//       navigateTo(2, form);
//     } catch (e: unknown) {
//       setError(e instanceof Error ? e.message : "Failed to load seats");
//     } finally {
//       setLoadingSeats(false);
//     }
//   }, [form, resolveAmenityIds, navigateTo, searchParams]);

//   // ── Step 2: select seat ───────────────────────────────────────────────────────

//   const selectSeat = (seatId: string | null) =>
//     setForm((f) => ({ ...f, selectedSeatId: seatId }));

//   // ── Step 2 → Step 3 ───────────────────────────────────────────────────────────

//   const goToReview = () => {
//     if (!form.selectedSeatId) return;
//     navigateTo(3, form);
//   };

//   // ── Step 3: confirm ───────────────────────────────────────────────────────────
//   // Modify mode → PATCH /bookings/{id}/modify  (single atomic call, no cancel)
//   // Normal mode → POST  /bookings

//   const confirmBooking = useCallback(async () => {
//     if (!form.selectedSeatId) return;
//     setSubmitting(true);
//     setError(null);

//     const payload = {
//       site_id:      Number(form.siteId),
//       building_id:  Number(form.buildingId),
//       floor_id:     Number(form.floorId),
//       seat_id:      Number(form.selectedSeatId),
//       booking_date: form.fromDate,
//     };

//     try {
//       let result: CreateBookingResponse;

//       if (isModifyMode && modifyBookingId) {
//         // Single PATCH — backend atomically cancels the old booking and
//         // creates the new one, preserving booking history and audit trail.
//         result = await modifyBooking(modifyBookingId, payload);
//       } else {
//         result = await createBooking(payload);
//       }

//       setConfirmation(result);
//       setStepState(3);
//     } catch (err: any) {
//       const status = err?.response?.status;
//       if (status === 409) {
//         setError("This seat is already booked for the selected date. Please choose a different seat.");
//       } else if (status === 400) {
//         setError("Invalid booking details. Please go back and check your selection.");
//       } else if (status === 403) {
//         setError("You don't have permission to book this seat.");
//       } else if (status === 404) {
//         setError(
//           isModifyMode
//             ? "The original booking could not be found. It may have already been cancelled."
//             : "The selected seat is no longer available. Please go back and choose another."
//         );
//       } else {
//         setError(
//           err?.response?.data?.message ??
//           err?.message ??
//           "Failed to confirm booking. Please try again.",
//         );
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   }, [form, isModifyMode, modifyBookingId]);

//   // ── Navigation helpers ────────────────────────────────────────────────────────

//   const goBack = () => {
//     const prevStep    = (step > 1 ? step - 1 : 1) as BookingStep;
//     const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
//     setForm(clearedForm);
//     navigateTo(prevStep, clearedForm);
//   };

//   const resetForm = () => {
//     const fresh = { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
//     setForm(fresh);
//     setStepState(1);
//     setBuildings([]);
//     setFloors([]);
//     setSeats([]);
//     setConfirmation(null);
//     setError(null);
//     router.push("/book");
//   };

//   // ── Derived values ────────────────────────────────────────────────────────────

//   const selectedSite     = sites.find((s) => s.id === form.siteId);
//   const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
//   const selectedFloor    = floors.find((f) => f.id === form.floorId);
//   const selectedSeat     = seats.find((s) => s.id === form.selectedSeatId);

//   const dayCount = (() => {
//     if (!form.fromDate || !form.toDate) return 0;
//     const diff =
//       new Date(form.toDate + "T00:00:00").getTime() -
//       new Date(form.fromDate + "T00:00:00").getTime();
//     return Math.round(diff / 86_400_000) + 1;
//   })();

//   const step1Valid =
//     !!form.siteId     &&
//     !!form.buildingId &&
//     !!form.floorId    &&
//     !!form.fromDate   &&
//     !!form.toDate;

//   return {
//     step,
//     form,
//     sites,
//     buildings,
//     floors,
//     seats,
//     availablePreferences,
//     confirmation,
//     error,
//     loadingSites,
//     loadingBuildings,
//     loadingFloors,
//     loadingSeats,
//     loadingPreferences,
//     submitting,
//     selectedSite,
//     selectedBuilding,
//     selectedFloor,
//     selectedSeat,
//     dayCount,
//     step1Valid,
//     isModifyMode,
//     modifyBookingId,
//     setSiteId,
//     setBuildingId,
//     setFloorId,
//     setFromDate,
//     setToDate,
//     togglePreference,
//     clearAll,
//     findAvailableSeats,
//     selectSeat,
//     goToReview,
//     confirmBooking,
//     goBack,
//     resetForm,
//   };
// }

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
// modifyBookingId is threaded through every step navigation so that
// isModifyMode remains true all the way to confirmBooking on step 3.
// Without it the param is dropped on the first navigateTo call and
// confirmBooking falls through to POST /bookings instead of PATCH /bookings/{id}/modify.

function buildUrl(
  step: number,
  form: BookingFormState,
  modifyBookingId?: string | null,  // ← carry through every navigation
): string {
  const params = new URLSearchParams();
  params.set("step", String(step));
  // Preserve modifyBookingId so isModifyMode stays true on steps 2 and 3
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

  // ── Read params once up-front ───────────────────────────────────────────────

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

  const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

  // ── Detect a clean /book navigation (sidebar click, no params) ─────────────

  const hasAnyParam = Boolean(
    searchParams.get("modifyBookingId") ||
    searchParams.get("step")            ||
    searchParams.get("siteId")          ||
    searchParams.get("fromDate")
  );

  // ── Initial form values ─────────────────────────────────────────────────────

  const initialFromDate = prefillFromDate ?? todayIso();
  const initialToDate   = prefillToDate ?? (isModifyMode ? initialFromDate : todayIso());

  // ── State ───────────────────────────────────────────────────────────────────

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

  const [loadingSites,       setLoadingSites]       = useState(false);
  const [loadingBuildings,   setLoadingBuildings]   = useState(false);
  const [loadingFloors,      setLoadingFloors]      = useState(false);
  const [loadingSeats,       setLoadingSeats]       = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [submitting,         setSubmitting]         = useState(false);

  const [error,        setError]        = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

  // ── Reset on clean /book navigation ─────────────────────────────────────────

  useEffect(() => {
    if (hasAnyParam) return;
    setForm({ ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() });
    setStepState(1);
    setBuildings([]);
    setFloors([]);
    setSeats([]);
    setConfirmation(null);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // ── Re-validate prefill preferences once available list loads ───────────────

  useEffect(() => {
    if (prefillPreferences.length === 0) return;
    if (availablePreferences.length === 0) return;
    const validKeys = prefillPreferences.filter((k) =>
      availablePreferences.some((p) => p.key === k)
    );
    if (validKeys.length > 0) {
      setForm((f) => ({ ...f, preferences: validKeys }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePreferences]);

  // ── Navigate helper ──────────────────────────────────────────────────────────
  // modifyBookingId is included in every URL so isModifyMode stays true
  // on steps 2 and 3 — without this it gets dropped on the first push
  // and confirmBooking calls POST /bookings instead of PATCH /bookings/{id}/modify.

  const navigateTo = useCallback(
    (nextStep: BookingStep, nextForm: BookingFormState) => {
      setStepState(nextStep);
      router.push(buildUrl(nextStep, nextForm, modifyBookingId)); // ← pass modifyBookingId
    },
    [router, modifyBookingId], // ← modifyBookingId in deps
  );

  // ── Data fetching ────────────────────────────────────────────────────────────

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

  // ── Prefill resolution: display names → IDs ──────────────────────────────────

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

  // ── Re-fetch seats on step 2 page refresh ────────────────────────────────────

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

  // ── Preference resolver ───────────────────────────────────────────────────────

  const resolveAmenityIds = useCallback(
    (preferenceKeys: string[]): number[] =>
      preferenceKeys
        .map((key) => availablePreferences.find((p) => p.key === key)?.id)
        .filter((id): id is string => id !== undefined)
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id)),
    [availablePreferences],
  );

  // ── Field setters ─────────────────────────────────────────────────────────────

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

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────────

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load seats");
    } finally {
      setLoadingSeats(false);
    }
  }, [form, resolveAmenityIds, navigateTo, searchParams]);

  // ── Step 2: select seat ───────────────────────────────────────────────────────

  const selectSeat = (seatId: string | null) =>
    setForm((f) => ({ ...f, selectedSeatId: seatId }));

  // ── Step 2 → Step 3 ───────────────────────────────────────────────────────────

  const goToReview = () => {
    if (!form.selectedSeatId) return;
    navigateTo(3, form);
  };

  // ── Step 3: confirm ───────────────────────────────────────────────────────────
  // Modify mode → PATCH /bookings/{id}/modify
  // Normal mode → POST  /bookings
  //
  // isModifyMode and modifyBookingId are derived fresh from searchParams on
  // every render, so they are always current as long as buildUrl/navigateTo
  // carry modifyBookingId through every step URL (which they now do).

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

  // ── Navigation helpers ────────────────────────────────────────────────────────

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
    setConfirmation(null);
    setError(null);
    router.push("/book");
  };

  // ── Derived values ────────────────────────────────────────────────────────────

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