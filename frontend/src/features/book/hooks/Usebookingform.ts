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

// // function todayIso(): string {
// //   return new Date().toISOString().slice(0, 10);
// // }

// // function plusDaysIso(n: number): string {
// //   const d = new Date();
// //   d.setDate(d.getDate() + n);
// //   return d.toISOString().slice(0, 10);
// // }

// // const DEFAULT_STATE: BookingFormState = {
// //   siteId: "",
// //   buildingId: "",
// //   floorId: "",
// //   fromDate: todayIso(),
// //   toDate: plusDaysIso(2),
// //   preferences: [],
// //   selectedSeatId: null,
// // };

// // // ── Helpers to read/write URL params ─────────────────────────────────────────

// // function buildUrl(step: number, form: BookingFormState): string {
// //   const params = new URLSearchParams();
// //   params.set("step", String(step));
// //   if (form.siteId)         params.set("siteId",    form.siteId);
// //   if (form.buildingId)     params.set("buildingId", form.buildingId);
// //   if (form.floorId)        params.set("floorId",    form.floorId);
// //   if (form.fromDate)       params.set("fromDate",   form.fromDate);
// //   if (form.toDate)         params.set("toDate",     form.toDate);
// //   if (form.selectedSeatId) params.set("seatId",     form.selectedSeatId);
// //   // preferences stored in sessionStorage (too long for URL)
// //   return `/book?${params.toString()}`;
// // }

// // export function useBookingForm() {
// //   const router       = useRouter();
// //   const searchParams = useSearchParams();

// //   // ── Read initial state from URL ──────────────────────────────────────────
// //   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

// //   const [form, setForm] = useState<BookingFormState>({
// //     siteId:         searchParams.get("siteId")     ?? "",
// //     buildingId:     searchParams.get("buildingId") ?? "",
// //     floorId:        searchParams.get("floorId")    ?? "",
// //     fromDate:       searchParams.get("fromDate")   ?? todayIso(),
// //     toDate:         searchParams.get("toDate")     ?? plusDaysIso(2),
// //     selectedSeatId: searchParams.get("seatId")     ?? null,
// //     preferences:    [], // restored from sessionStorage below
// //   });

// //   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

// //   const [sites, setSites]                               = useState<Site[]>([]);
// //   const [buildings, setBuildings]                       = useState<Building[]>([]);
// //   const [floors, setFloors]                             = useState<Floor[]>([]);
// //   const [seats, setSeats]                               = useState<Seat[]>([]);
// //   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

// //   const [loadingSites,       setLoadingSites]       = useState(false);
// //   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
// //   const [loadingFloors,      setLoadingFloors]      = useState(false);
// //   const [loadingSeats,       setLoadingSeats]       = useState(false);
// //   const [loadingPreferences, setLoadingPreferences] = useState(false);
// //   const [submitting,         setSubmitting]         = useState(false);

// //   const [error,        setError]        = useState<string | null>(null);
// //   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

// //   // ── Restore preferences from sessionStorage (client only) ───────────────
// //   useEffect(() => {
// //     try {
// //       const saved = sessionStorage.getItem("bookingPreferences");
// //       if (saved) {
// //         const prefs = JSON.parse(saved) as string[];
// //         setForm((f) => ({ ...f, preferences: prefs }));
// //       }
// //     } catch {}
// //   }, []);

// //   // ── Persist preferences to sessionStorage whenever they change ───────────
// //   useEffect(() => {
// //     try {
// //       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
// //     } catch {}
// //   }, [form.preferences]);

// //   // ── Navigate to new URL whenever step or key form fields change ──────────
// //   const navigateTo = useCallback((nextStep: BookingStep, nextForm: BookingFormState) => {
// //     setStepState(nextStep);
// //     router.push(buildUrl(nextStep, nextForm));
// //   }, [router]);

// //   // ── Load sites on mount ──────────────────────────────────────────────────
// //   useEffect(() => {
// //     setLoadingSites(true);
// //     fetchSites()
// //       .then(setSites)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingSites(false));
// //   }, []);

// //   // ── Load preferences on mount ────────────────────────────────────────────
// //   useEffect(() => {
// //     setLoadingPreferences(true);
// //     fetchPreferences()
// //       .then(setAvailablePreferences)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingPreferences(false));
// //   }, []);

// //   // ── Load buildings when siteId changes ──────────────────────────────────
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

// //   // ── Load floors when buildingId changes ─────────────────────────────────
// //   useEffect(() => {
// //     if (!form.buildingId) { setFloors([]); return; }
// //     setFloors([]);
// //     setLoadingFloors(true);
// //     fetchFloors(form.buildingId)
// //       .then(setFloors)
// //       .catch((e) => setError(e.message))
// //       .finally(() => setLoadingFloors(false));
// //   }, [form.buildingId]);

// //   // ── Re-fetch seats when landing on step 2 (e.g. after refresh) ──────────
// //   useEffect(() => {
// //     if (
// //       step === 2 &&
// //       seats.length === 0 &&
// //       form.floorId &&
// //       form.fromDate &&
// //       form.toDate
// //     ) {
// //       setLoadingSeats(true);
// //       fetchSeatsWithAvailability({
// //         floorId:     form.floorId,
// //         fromDate:    form.fromDate,
// //         toDate:      form.toDate,
// //         preferences: form.preferences,
// //       })
// //         .then(setSeats)
// //         .catch((e) => setError(e.message))
// //         .finally(() => setLoadingSeats(false));
// //     }
// //   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

// //   // ── Field setters ────────────────────────────────────────────────────────

// //   const setSiteId = (v: string | null) =>
// //     setForm((f) => ({
// //       ...f,
// //       siteId:         v ?? "",
// //       buildingId:     "",
// //       floorId:        "",
// //       selectedSeatId: null,
// //     }));

// //   const setBuildingId = (v: string | null) =>
// //     setForm((f) => ({
// //       ...f,
// //       buildingId:     v ?? "",
// //       floorId:        "",
// //       selectedSeatId: null,
// //     }));

// //   const setFloorId = (v: string | null) =>
// //     setForm((f) => ({
// //       ...f,
// //       floorId:        v ?? "",
// //       selectedSeatId: null,
// //     }));

// //   const setFromDate = (v: string) =>
// //     setForm((f) => ({
// //       ...f,
// //       fromDate: v,
// //       toDate: f.toDate < v ? v : f.toDate,
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

// //   const clearAll = () =>
// //     setForm((f) => ({ ...f, preferences: [] }));

// //   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
// //   const findAvailableSeats = useCallback(async () => {
// //     if (!form.floorId || !form.fromDate || !form.toDate) return;

// //     setLoadingSeats(true);
// //     setError(null);

// //     try {
// //       const data = await fetchSeatsWithAvailability({
// //         floorId:     form.floorId,
// //         fromDate:    form.fromDate,
// //         toDate:      form.toDate,
// //         preferences: form.preferences,
// //       });
// //       setSeats(data);
// //       navigateTo(2, form);
// //     } catch (e: unknown) {
// //       setError(e instanceof Error ? e.message : "Failed to load seats");
// //     } finally {
// //       setLoadingSeats(false);
// //     }
// //   }, [form, navigateTo]);

// //   // ── Step 2: select seat ──────────────────────────────────────────────────
// //   const selectSeat = (seatId: string | null) => {
// //     setForm((f) => ({ ...f, selectedSeatId: seatId }));
// //   };

// //   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
// //   const goToReview = () => {
// //     if (!form.selectedSeatId) return;
// //     navigateTo(3, form);
// //   };

// //   // ── Step 3: confirm booking ──────────────────────────────────────────────
// //   const confirmBooking = useCallback(async () => {
// //     if (!form.selectedSeatId) return;

// //     setSubmitting(true);
// //     setError(null);

// //     try {
// //       const result = await createBooking({
// //         site_id:      Number(form.siteId),
// //         building_id:  Number(form.buildingId),
// //         floor_id:     Number(form.floorId),
// //         seat_id:      Number(form.selectedSeatId),
// //         booking_date: form.fromDate,
// //       });

// //       // ✅ FIX: Set confirmation state directly — do NOT navigate away.
// //       // The confirmation UI is shown via the `confirmation` state flag in
// //       // BookASeatPage, so we don't need a route change here.
// //       // We also explicitly set step to 3 so the step indicator stays correct.
// //       setConfirmation(result);
// //       setStepState(3); // keep step in sync (already 3, but be explicit)

// //       // Clear preferences from sessionStorage after successful booking
// //       try { sessionStorage.removeItem("bookingPreferences"); } catch {}

// //     } catch (err: any) {
// //       const status = err?.response?.status;
// //       if (status === 409) {
// //         setError("You already have a booking for this seat on the selected date. Please choose a different seat or date.");
// //       } else if (status === 400) {
// //         setError("Invalid booking details. Please go back and check your selection.");
// //       } else if (status === 403) {
// //         setError("You don't have permission to book this seat.");
// //       } else if (status === 404) {
// //         setError("The selected seat is no longer available. Please go back and choose another.");
// //       } else {
// //         setError(err?.response?.data?.message ?? err?.message ?? "Failed to confirm booking. Please try again.");
// //       }
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   }, [form]);

// //   // ── Navigation helpers ───────────────────────────────────────────────────
// //   const goBack = () => {
// //     const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
// //     navigateTo(prevStep, form);
// //   };

// //   // ✅ FIX: resetForm now explicitly calls setStepState(1) so the step
// //   // resets in memory even though useState() only reads its initialiser once.
// //   const resetForm = () => {
// //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
// //     setForm(DEFAULT_STATE);
// //     setStepState(1);      // ← THE FIX: force step back to 1 in React state
// //     setBuildings([]);
// //     setFloors([]);
// //     setSeats([]);
// //     setConfirmation(null);
// //     setError(null);
// //     router.push("/book"); // clean URL
// //   };

// //   // ── Derived ──────────────────────────────────────────────────────────────
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
// //     !!form.siteId &&
// //     !!form.buildingId &&
// //     !!form.floorId &&
// //     !!form.fromDate &&
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
//   fetchBuildings,
//   fetchFloors,
//   fetchPreferences,
//   fetchSeatsWithAvailability,
//   fetchSites,
// } from "../services/Bookingform.service";

// function todayIso(): string {
//   return new Date().toISOString().slice(0, 10);
// }

// function plusDaysIso(n: number): string {
//   const d = new Date();
//   d.setDate(d.getDate() + n);
//   return d.toISOString().slice(0, 10);
// }

// const DEFAULT_STATE: BookingFormState = {
//   siteId: "",
//   buildingId: "",
//   floorId: "",
//   fromDate: todayIso(),
//   toDate: plusDaysIso(2),
//   preferences: [],
//   selectedSeatId: null,
// };

// // ── Helpers to read/write URL params ─────────────────────────────────────────

// function buildUrl(step: number, form: BookingFormState): string {
//   const params = new URLSearchParams();
//   params.set("step", String(step));
//   if (form.siteId)         params.set("siteId",    form.siteId);
//   if (form.buildingId)     params.set("buildingId", form.buildingId);
//   if (form.floorId)        params.set("floorId",    form.floorId);
//   if (form.fromDate)       params.set("fromDate",   form.fromDate);
//   if (form.toDate)         params.set("toDate",     form.toDate);
//   if (form.selectedSeatId) params.set("seatId",     form.selectedSeatId);
//   // preferences stored in sessionStorage (too long for URL)
//   return `/book?${params.toString()}`;
// }

// export function useBookingForm() {
//   const router       = useRouter();
//   const searchParams = useSearchParams();

//   // ── Read initial state from URL ──────────────────────────────────────────
//   const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

//   const [form, setForm] = useState<BookingFormState>({
//     siteId:         searchParams.get("siteId")     ?? "",
//     buildingId:     searchParams.get("buildingId") ?? "",
//     floorId:        searchParams.get("floorId")    ?? "",
//     fromDate:       searchParams.get("fromDate")   ?? todayIso(),
//     toDate:         searchParams.get("toDate")     ?? plusDaysIso(2),
//     selectedSeatId: searchParams.get("seatId")     ?? null,
//     preferences:    [], // restored from sessionStorage below
//   });

//   const [step, setStepState] = useState<BookingStep>(stepFromUrl);

//   const [sites, setSites]                               = useState<Site[]>([]);
//   const [buildings, setBuildings]                       = useState<Building[]>([]);
//   const [floors, setFloors]                             = useState<Floor[]>([]);
//   const [seats, setSeats]                               = useState<Seat[]>([]);
//   const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

//   const [loadingSites,       setLoadingSites]       = useState(false);
//   const [loadingBuildings,   setLoadingBuildings]   = useState(false);
//   const [loadingFloors,      setLoadingFloors]      = useState(false);
//   const [loadingSeats,       setLoadingSeats]       = useState(false);
//   const [loadingPreferences, setLoadingPreferences] = useState(false);
//   const [submitting,         setSubmitting]         = useState(false);

//   const [error,        setError]        = useState<string | null>(null);
//   const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

//   // ── Restore preferences from sessionStorage (client only) ───────────────
//   useEffect(() => {
//     try {
//       const saved = sessionStorage.getItem("bookingPreferences");
//       if (saved) {
//         const prefs = JSON.parse(saved) as string[];
//         setForm((f) => ({ ...f, preferences: prefs }));
//       }
//     } catch {}
//   }, []);

//   // ── Persist preferences to sessionStorage whenever they change ───────────
//   useEffect(() => {
//     try {
//       sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
//     } catch {}
//   }, [form.preferences]);

//   // ── Navigate to new URL whenever step or key form fields change ──────────
//   const navigateTo = useCallback((nextStep: BookingStep, nextForm: BookingFormState) => {
//     setStepState(nextStep);
//     router.push(buildUrl(nextStep, nextForm));
//   }, [router]);

//   // ── Load sites on mount ──────────────────────────────────────────────────
//   useEffect(() => {
//     setLoadingSites(true);
//     fetchSites()
//       .then(setSites)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingSites(false));
//   }, []);

//   // ── Load preferences on mount ────────────────────────────────────────────
//   useEffect(() => {
//     setLoadingPreferences(true);
//     fetchPreferences()
//       .then(setAvailablePreferences)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingPreferences(false));
//   }, []);

//   // ── Load buildings when siteId changes ──────────────────────────────────
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

//   // ── Load floors when buildingId changes ─────────────────────────────────
//   useEffect(() => {
//     if (!form.buildingId) { setFloors([]); return; }
//     setFloors([]);
//     setLoadingFloors(true);
//     fetchFloors(form.buildingId)
//       .then(setFloors)
//       .catch((e) => setError(e.message))
//       .finally(() => setLoadingFloors(false));
//   }, [form.buildingId]);

//   // ── Helper: map preference keys → numeric amenity IDs ───────────────────
//   //
//   //  The backend expects numeric amenity IDs as repeated query params
//   //  (e.g. amenity_ids=1&amenity_ids=3). The form stores human-readable
//   //  preference *keys* (e.g. "window_seat"). This helper resolves them
//   //  using the loaded availablePreferences list.
//   //
//   //  NOTE: Preference.id is typed as `string` in the domain model but the
//   //  backend wants numbers — we parseInt here so the service layer stays
//   //  clean and does not need to know about preference keys at all.
//   const resolveAmenityIds = useCallback(
//     (preferenceKeys: string[]): number[] => {
//       return preferenceKeys
//         .map((key) => availablePreferences.find((p) => p.key === key)?.id)
//         .filter((id): id is string => id !== undefined)
//         .map((id) => parseInt(id, 10))
//         .filter((id) => !isNaN(id));
//     },
//     [availablePreferences]
//   );

//   // ── Re-fetch seats when landing on step 2 (e.g. after refresh) ──────────
//   useEffect(() => {
//     if (
//       step === 2 &&
//       seats.length === 0 &&
//       form.floorId &&
//       form.fromDate &&
//       form.toDate
//     ) {
//       setLoadingSeats(true);
//       const amenityIds = resolveAmenityIds(form.preferences);
//       fetchSeatsWithAvailability({
//         floorId:     form.floorId,
//         fromDate:    form.fromDate,
//         toDate:      form.toDate,
//         preferences: form.preferences,
//         amenityIds,                     // ← FIX: pass resolved IDs
//       })
//         .then(setSeats)
//         .catch((e) => setError(e.message))
//         .finally(() => setLoadingSeats(false));
//     }
//   }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Field setters ────────────────────────────────────────────────────────

//   const setSiteId = (v: string | null) =>
//     setForm((f) => ({
//       ...f,
//       siteId:         v ?? "",
//       buildingId:     "",
//       floorId:        "",
//       selectedSeatId: null,
//     }));

//   const setBuildingId = (v: string | null) =>
//     setForm((f) => ({
//       ...f,
//       buildingId:     v ?? "",
//       floorId:        "",
//       selectedSeatId: null,
//     }));

//   const setFloorId = (v: string | null) =>
//     setForm((f) => ({
//       ...f,
//       floorId:        v ?? "",
//       selectedSeatId: null,
//     }));

//   const setFromDate = (v: string) =>
//     setForm((f) => ({
//       ...f,
//       fromDate: v,
//       toDate: f.toDate < v ? v : f.toDate,
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

//   const clearAll = () =>
//     setForm((f) => ({ ...f, preferences: [] }));

//   // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
//   const findAvailableSeats = useCallback(async () => {
//     if (!form.floorId || !form.fromDate || !form.toDate) return;

//     setLoadingSeats(true);
//     setError(null);

//     try {
//       // ── FIX: resolve preference keys → numeric amenity IDs before the
//       //         API call so the backend can score preference matches and
//       //         return the correct preferenceMatchStatus on each seat.
//       const amenityIds = resolveAmenityIds(form.preferences);

//       const data = await fetchSeatsWithAvailability({
//         floorId:     form.floorId,
//         fromDate:    form.fromDate,
//         toDate:      form.toDate,
//         preferences: form.preferences,
//         amenityIds,                     // ← FIX: was never passed before
//       });
//       setSeats(data);
//       navigateTo(2, form);
//     } catch (e: unknown) {
//       setError(e instanceof Error ? e.message : "Failed to load seats");
//     } finally {
//       setLoadingSeats(false);
//     }
//   }, [form, resolveAmenityIds, navigateTo]);

//   // ── Step 2: select seat ──────────────────────────────────────────────────
//   const selectSeat = (seatId: string | null) => {
//     setForm((f) => ({ ...f, selectedSeatId: seatId }));
//   };

//   // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
//   const goToReview = () => {
//     if (!form.selectedSeatId) return;
//     navigateTo(3, form);
//   };

//   // ── Step 3: confirm booking ──────────────────────────────────────────────
//   const confirmBooking = useCallback(async () => {
//     if (!form.selectedSeatId) return;

//     setSubmitting(true);
//     setError(null);

//     try {
//       const result = await createBooking({
//         site_id:      Number(form.siteId),
//         building_id:  Number(form.buildingId),
//         floor_id:     Number(form.floorId),
//         seat_id:      Number(form.selectedSeatId),
//         booking_date: form.fromDate,
//       });

//       setConfirmation(result);
//       setStepState(3);

//       try { sessionStorage.removeItem("bookingPreferences"); } catch {}

//     } catch (err: any) {
//       const status = err?.response?.status;
//       if (status === 409) {
//         setError("You already have a booking for this seat on the selected date. Please choose a different seat or date.");
//       } else if (status === 400) {
//         setError("Invalid booking details. Please go back and check your selection.");
//       } else if (status === 403) {
//         setError("You don't have permission to book this seat.");
//       } else if (status === 404) {
//         setError("The selected seat is no longer available. Please go back and choose another.");
//       } else {
//         setError(err?.response?.data?.message ?? err?.message ?? "Failed to confirm booking. Please try again.");
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   }, [form]);

//   // ── Navigation helpers ───────────────────────────────────────────────────
//   const goBack = () => {
//     const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
//     navigateTo(prevStep, form);
//   };

//   const resetForm = () => {
//     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
//     setForm(DEFAULT_STATE);
//     setStepState(1);
//     setBuildings([]);
//     setFloors([]);
//     setSeats([]);
//     setConfirmation(null);
//     setError(null);
//     router.push("/book");
//   };

//   // ── Derived ──────────────────────────────────────────────────────────────
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
//     !!form.siteId &&
//     !!form.buildingId &&
//     !!form.floorId &&
//     !!form.fromDate &&
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
  fetchBuildings,
  fetchFloors,
  fetchPreferences,
  fetchSeatsWithAvailability,
  fetchSites,
} from "../services/Bookingform.service";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_STATE: BookingFormState = {
  siteId: "",
  buildingId: "",
  floorId: "",
  fromDate: todayIso(),
  toDate: plusDaysIso(2),
  preferences: [],
  selectedSeatId: null,
};

// ── Helpers to read/write URL params ─────────────────────────────────────────

function buildUrl(step: number, form: BookingFormState): string {
  const params = new URLSearchParams();
  params.set("step", String(step));
  if (form.siteId)         params.set("siteId",      form.siteId);
  if (form.buildingId)     params.set("buildingId",   form.buildingId);
  if (form.floorId)        params.set("floorId",      form.floorId);
  if (form.fromDate)       params.set("fromDate",     form.fromDate);
  if (form.toDate)         params.set("toDate",       form.toDate);
  if (form.selectedSeatId) params.set("seatId",       form.selectedSeatId);
  return `/book?${params.toString()}`;
}

export function useBookingForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const stepFromUrl = parseInt(searchParams.get("step") ?? "1") as BookingStep;

  const [form, setForm] = useState<BookingFormState>({
    siteId:         searchParams.get("siteId")     ?? "",
    buildingId:     searchParams.get("buildingId") ?? "",
    floorId:        searchParams.get("floorId")    ?? "",
    fromDate:       searchParams.get("fromDate")   ?? todayIso(),
    toDate:         searchParams.get("toDate")     ?? plusDaysIso(2),
    selectedSeatId: searchParams.get("seatId")     ?? null,
    preferences:    [],
  });

  const [step, setStepState] = useState<BookingStep>(stepFromUrl);

  const [sites, setSites]                               = useState<Site[]>([]);
  const [buildings, setBuildings]                       = useState<Building[]>([]);
  const [floors, setFloors]                             = useState<Floor[]>([]);
  const [seats, setSeats]                               = useState<Seat[]>([]);
  const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

  const [loadingSites,       setLoadingSites]       = useState(false);
  const [loadingBuildings,   setLoadingBuildings]   = useState(false);
  const [loadingFloors,      setLoadingFloors]      = useState(false);
  const [loadingSeats,       setLoadingSeats]       = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [submitting,         setSubmitting]         = useState(false);

  const [error,        setError]        = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

  // ── Restore preferences from sessionStorage ──────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("bookingPreferences");
      if (saved) {
        const prefs = JSON.parse(saved) as string[];
        setForm((f) => ({ ...f, preferences: prefs }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("bookingPreferences", JSON.stringify(form.preferences));
    } catch {}
  }, [form.preferences]);

  // ── Navigate helper ──────────────────────────────────────────────────────
  const navigateTo = useCallback(
    (nextStep: BookingStep, nextForm: BookingFormState) => {
      setStepState(nextStep);
      router.push(buildUrl(nextStep, nextForm));
    },
    [router]
  );

  // ── Load sites ───────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingSites(true);
    fetchSites()
      .then(setSites)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSites(false));
  }, []);

  // ── Load preferences ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingPreferences(true);
    fetchPreferences()
      .then(setAvailablePreferences)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPreferences(false));
  }, []);

  // ── Load buildings ───────────────────────────────────────────────────────
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

  // ── Load floors ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!form.buildingId) { setFloors([]); return; }
    setFloors([]);
    setLoadingFloors(true);
    fetchFloors(form.buildingId)
      .then(setFloors)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingFloors(false));
  }, [form.buildingId]);

  // ── Resolve preference keys → numeric amenity IDs ────────────────────────
  const resolveAmenityIds = useCallback(
    (preferenceKeys: string[]): number[] => {
      return preferenceKeys
        .map((key) => availablePreferences.find((p) => p.key === key)?.id)
        .filter((id): id is string => id !== undefined)
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
    },
    [availablePreferences]
  );

  // ── Re-fetch seats on step 2 refresh ────────────────────────────────────
  useEffect(() => {
    if (
      step === 2 &&
      seats.length === 0 &&
      form.floorId &&
      form.fromDate &&
      form.toDate
    ) {
      setLoadingSeats(true);
      const amenityIds = resolveAmenityIds(form.preferences);
      fetchSeatsWithAvailability({
        floorId:     form.floorId,
        fromDate:    form.fromDate,
        toDate:      form.toDate,
        preferences: form.preferences,
        amenityIds,
      })
        .then(setSeats)
        .catch((e) => setError(e.message))
        .finally(() => setLoadingSeats(false));
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Field setters ────────────────────────────────────────────────────────

  const setSiteId = (v: string | null) =>
    setForm((f) => ({
      ...f,
      siteId:         v ?? "",
      buildingId:     "",
      floorId:        "",
      selectedSeatId: null,
    }));

  const setBuildingId = (v: string | null) =>
    setForm((f) => ({
      ...f,
      buildingId:     v ?? "",
      floorId:        "",
      selectedSeatId: null,
    }));

  const setFloorId = (v: string | null) =>
    setForm((f) => ({
      ...f,
      floorId:        v ?? "",
      selectedSeatId: null,
    }));

  const setFromDate = (v: string) =>
    setForm((f) => ({
      ...f,
      fromDate: v,
      toDate: f.toDate < v ? v : f.toDate,
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

  const clearAll = () =>
    setForm((f) => ({ ...f, preferences: [] }));

  // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
  const findAvailableSeats = useCallback(async () => {
    if (!form.floorId || !form.fromDate || !form.toDate) return;

    setLoadingSeats(true);
    setError(null);

    try {
      const amenityIds = resolveAmenityIds(form.preferences);
      const data = await fetchSeatsWithAvailability({
        floorId:     form.floorId,
        fromDate:    form.fromDate,
        toDate:      form.toDate,
        preferences: form.preferences,
        amenityIds,
      });
      setSeats(data);
      navigateTo(2, form);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load seats");
    } finally {
      setLoadingSeats(false);
    }
  }, [form, resolveAmenityIds, navigateTo]);

  // ── Step 2: select seat ──────────────────────────────────────────────────
  const selectSeat = (seatId: string | null) => {
    setForm((f) => ({ ...f, selectedSeatId: seatId }));
  };

  // ── Step 2 → Step 3 ──────────────────────────────────────────────────────
  const goToReview = () => {
    if (!form.selectedSeatId) return;
    navigateTo(3, form);
  };

  // ── Step 3: confirm booking ──────────────────────────────────────────────
  const confirmBooking = useCallback(async () => {
    if (!form.selectedSeatId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createBooking({
        site_id:      Number(form.siteId),
        building_id:  Number(form.buildingId),
        floor_id:     Number(form.floorId),
        seat_id:      Number(form.selectedSeatId),
        booking_date: form.fromDate,
      });

      setConfirmation(result);
      setStepState(3);

      try { sessionStorage.removeItem("bookingPreferences"); } catch {}
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setError("You already have a booking for this seat on the selected date. Please choose a different seat or date.");
      } else if (status === 400) {
        setError("Invalid booking details. Please go back and check your selection.");
      } else if (status === 403) {
        setError("You don't have permission to book this seat.");
      } else if (status === 404) {
        setError("The selected seat is no longer available. Please go back and choose another.");
      } else {
        setError(
          err?.response?.data?.message ??
          err?.message ??
          "Failed to confirm booking. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goBack = () => {
    const prevStep = (step > 1 ? step - 1 : 1) as BookingStep;
    navigateTo(prevStep, form);
  };

  const resetForm = () => {
    try { sessionStorage.removeItem("bookingPreferences"); } catch {}
    setForm(DEFAULT_STATE);
    setStepState(1);
    setBuildings([]);
    setFloors([]);
    setSeats([]);
    setConfirmation(null);
    setError(null);
    router.push("/book");
  };

  // ── Derived ──────────────────────────────────────────────────────────────
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
    !!form.siteId &&
    !!form.buildingId &&
    !!form.floorId &&
    !!form.fromDate &&
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