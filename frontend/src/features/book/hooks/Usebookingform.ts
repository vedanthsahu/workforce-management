"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/features/dashboard/hooks/usePermissions";
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
  extractApiErrorMessage,
  fetchBuildings,
  fetchEmployeeWorkPreferences,
  fetchFloors,
  fetchMyWorkPreferences,
  fetchPreferences,
  fetchSeatsWithAvailability,
  fetchSiteStatus,
  fetchSites,
  resolveFloorLayoutUrl,
} from "../services/Bookingform.service";
import { guestVisitWorkflow } from "@/features/bookings/services/bookings.service";
import { BOOKING_TOO_FAR_IN_ADVANCE_MESSAGE, maxBookableDateIso } from "../utils/constants";
import { amenityAppliesTo, BookingSpaceType } from "../utils/spaceType";

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Default state ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: BookingFormState = {
  siteId: "",
  buildingId: "",
  floorId: "",
  fromDate: todayIso(),
  toDate: todayIso(),
  preferences: [],
  selectedSeatId: null,
  spaceType: "SEAT",
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
  isAdminFlow?: boolean,
): string {
  const params = new URLSearchParams();
  params.set("step", String(step));
  if (modifyBookingId) params.set("modifyBookingId", modifyBookingId);
  if (isAdminFlow) params.set("adminFlow", "true");
  if (bookedForUserId) params.set("bookedForUserId", bookedForUserId);
  if (bookingForName) params.set("bookingForName", bookingForName);
  if (visitId) params.set("visitId", visitId);
  if (isGuestModify) params.set("isGuestModify", "true");
  if (form.siteId) params.set("siteId", form.siteId);
  if (form.buildingId) params.set("buildingId", form.buildingId);
  if (form.floorId) params.set("floorId", form.floorId);
  if (form.fromDate) params.set("fromDate", form.fromDate);
  if (form.toDate) params.set("toDate", form.toDate);
  if (form.selectedSeatId) params.set("seatId", form.selectedSeatId);
  if (form.preferences.length > 0) params.set("preferences", form.preferences.join(","));
  if (form.spaceType) params.set("spaceType", form.spaceType);
  if (guestParams?.guestId) params.set("guestId", guestParams.guestId);
  if (guestParams?.hostUserId) params.set("hostUserId", guestParams.hostUserId);
  if (guestParams?.guestType) params.set("guestType", guestParams.guestType);
  if (guestParams?.purposeOfVisit) params.set("purposeOfVisit", guestParams.purposeOfVisit);
  if (guestParams?.startTime) params.set("startTime", guestParams.startTime);
  if (guestParams?.endTime) params.set("endTime", guestParams.endTime);
  if (guestParams?.notes) params.set("notes", guestParams.notes);
  return `/book?${params.toString()}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = usePermissions();

  // ── Read params once up-front ─────────────────────────────────────────────

  const modifyBookingId = searchParams.get("modifyBookingId");
  const isModifyMode = Boolean(modifyBookingId);

  // True when reached via AdminBookingsPage's row-menu "Modify" action
  // (useAdminBookingActions.modifySeat sets ?adminFlow=true), OR when a
  // TENANT_ADMIN is booking a seat *for someone else* (isBookingForSomeone,
  // below) via Book for Someone — either way the confirmation screen should
  // route back to Admin Bookings instead of My Bookings. An admin booking a
  // seat for themself (no bookedForUserId/guestId) is unaffected.
  const adminFlowParam = searchParams.get("adminFlow") === "true";

  const prefillLocationName = searchParams.get("locationName") ?? null;
  const prefillBuildingName = searchParams.get("buildingName") ?? null;
  const prefillFloorName = searchParams.get("floorName") ?? null;
  const prefillSeatLabel = searchParams.get("seatLabel") ?? null;

  const prefillFromDate = searchParams.get("fromDate") ?? null;
  const prefillToDate = searchParams.get("toDate") ?? null;

  const bookedForUserId = searchParams.get("bookedForUserId") ?? null;
  const bookingForName = searchParams.get("bookingForName") ?? null;

  // Guest booking params — present only when coming from book-for-someone (visitor path)
  const guestId = searchParams.get("guestId") ?? null;
  const hostUserId = searchParams.get("hostUserId") ?? null;
  const guestType = searchParams.get("guestType") ?? null;
  const purposeOfVisit = searchParams.get("purposeOfVisit") ?? null;
  const guestStartTime = searchParams.get("startTime") ?? null;
  const guestEndTime = searchParams.get("endTime") ?? null;
  const guestNotes = searchParams.get("notes") ?? null;
  const visitId = searchParams.get("visitId") ?? null;
  const isGuestModify = searchParams.get("isGuestModify") === "true";
  const isGuestBooking = Boolean(guestId);
  const isAddBookingToVisit = Boolean(visitId);
  const isBookingForSomeone = Boolean(bookedForUserId || guestId);
  const isAdminFlow = adminFlowParam || (isBookingForSomeone && hasRole("TENANT_ADMIN"));

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
    searchParams.get("step") ||
    searchParams.get("siteId") ||
    searchParams.get("fromDate")
  );

  // ── Initial form values ───────────────────────────────────────────────────

  const initialFromDate = prefillFromDate ?? todayIso();
  const initialToDate = prefillToDate ?? (isModifyMode ? initialFromDate : todayIso());

  // ── State ─────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<BookingFormState>(() => {
    if (!hasAnyParam) return { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
    return {
      siteId: searchParams.get("siteId") ?? "",
      buildingId: searchParams.get("buildingId") ?? "",
      floorId: searchParams.get("floorId") ?? "",
      fromDate: initialFromDate,
      toDate: initialToDate,
      selectedSeatId: searchParams.get("seatId") ?? null,
      preferences: prefillPreferences,
      spaceType: (searchParams.get("spaceType") as BookingSpaceType | null) ?? "SEAT",
    };
  });

  const [step, setStepState] = useState<BookingStep>(() =>
    hasAnyParam ? stepFromUrl : 1
  );

  // Frozen snapshot of the original booking being modified, captured once at
  // mount (a lazy useState initializer runs exactly once, unlike reading
  // straight from searchParams — those get rewritten on every step
  // transition since navigateTo/buildUrl replace the whole query string).
  // Used below to gate "proceed" on modify screens so a no-op modification
  // (same site/building/floor/date/seat as before) can't be submitted.
  //
  // Seat is compared by label (seat_code), not seatId: `booking.seatId` is
  // optional on the Booking type and isn't always populated, whereas `seat`
  // (the label) is required — comparing by the unreliable id previously made
  // hasModification always true, since the resolved form.selectedSeatId
  // would never match an empty original seatId.
  const [originalBooking] = useState(() => ({
    siteName: prefillLocationName,
    buildingName: prefillBuildingName,
    floorName: prefillFloorName,
    fromDate: prefillFromDate,
    toDate: prefillToDate,
    seatLabel: prefillSeatLabel,
  }));

  const [sites, setSites] = useState<Site[]>([]);
  // The id of a site that's currently filled into the form (from a saved
  // preference/prefill) but confirmed INACTIVE — kept separate from `sites`
  // itself so the office select can keep *displaying* this office's name
  // (clearing the selection to blank alongside "this office is inactive"
  // told the user nothing about which office that was) while still being
  // excluded from the list of choices offered when the dropdown is opened.
  const [inactiveSiteId, setInactiveSiteId] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [availablePreferences, setAvailablePreferences] = useState<Preference[]>([]);

  // ── Floor layout URL — derived from the selected floor ───────────────────
  const [floorLayoutUrl, setFloorLayoutUrl] = useState<string | null>(null);

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CreateBookingResponse | null>(null);

  const [myPreferencesApplied, setMyPreferencesApplied] = useState(false);
  const [userPrefsSettled, setUserPrefsSettled] = useState(false);
  const [savedPreferenceNames, setSavedPreferenceNames] = useState<{
    siteName: string | null;
    buildingName: string | null;
    floorName: string | null;
  }>({ siteName: null, buildingName: null, floorName: null });

  // ── Reset on clean /book navigation ──────────────────────────────────────
  // This only fires once the URL has genuinely settled to a param-less
  // /book (searchParams is derived straight from the router, so a
  // router.push from resetForm lags a render or two behind it). Resetting
  // the preference-prefill guards here — not synchronously inside
  // resetForm — avoids a race where the auto-fill effect below wakes up
  // while hasAnyParam is still stale-true (from the just-finished booking's
  // URL), silently skips the site/building/floor fields because of that,
  // and then locks itself out permanently.

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
    setMyPreferencesApplied(false);
    setUserPrefsSettled(false);
    setSavedPreferenceNames({ siteName: null, buildingName: null, floorName: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // ── Re-sync from a deep link pushed while this page is already mounted ───
  // `form`/`step` above only read the URL through a lazy useState
  // initializer, which runs exactly once at mount. A Quick Pick (or
  // "Tomorrow's Booking") link in BookingSidebar calls router.push() to this
  // SAME /book route with a new step/seatId/location — Next.js doesn't
  // remount the page for a query-string-only navigation, so that initializer
  // never re-runs and the click silently did nothing (the URL changed, the
  // form/step didn't). This mirrors that same initial-read logic, just also
  // triggered on later URL changes, guarded to skip whenever the URL is only
  // echoing back the state this hook itself just pushed via navigateTo/goBack
  // (which always update form/step before or alongside the push).
  useEffect(() => {
    if (!hasAnyParam) return;
    const urlSeatId = searchParams.get("seatId");
    const urlStep = parseInt(searchParams.get("step") ?? "1") as BookingStep;
    if (urlSeatId === form.selectedSeatId && urlStep === step) return;

    setForm((f) => ({
      ...f,
      siteId: searchParams.get("siteId") ?? f.siteId,
      buildingId: searchParams.get("buildingId") ?? f.buildingId,
      floorId: searchParams.get("floorId") ?? f.floorId,
      fromDate: searchParams.get("fromDate") ?? f.fromDate,
      toDate: searchParams.get("toDate") ?? f.toDate,
      selectedSeatId: urlSeatId,
      spaceType: (searchParams.get("spaceType") as BookingSpaceType | null) ?? f.spaceType,
    }));
    setStepState(urlStep);
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
  // Self-booking: GET /dashboard/me, on a fresh visit or once the form's
  // location fields are actually empty (see the f.siteId check below).
  // Facilitator booking for an employee: GET /dashboard/employee/{id}, using
  // whoever bookedForUserId points at — that flow always carries a `step`/
  // `bookedForUserId` param (so hasAnyParam is always true for it) but never
  // a siteId of its own, so it must still get the location prefill.
  // Skipped for guest bookings (no work_preferences exist for a guest).
  // If the target user has never saved a preference, the form is left
  // exactly as it was (all fields blank).

  useEffect(() => {
    if (myPreferencesApplied) return;
    // Guest bookings have no work preferences to fetch; skip entirely.
    // Modify mode is allowed through so the user's current profile amenities
    // are prefilled (location fields are protected by the isModifyMode/f.siteId guard below).
    if (isGuestBooking) { setUserPrefsSettled(true); return; }
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
          siteName: prefs.siteName,
          buildingName: prefs.buildingName,
          floorName: prefs.floorName,
        });

        setForm((f) => ({
          ...f,
          // Only fill in location fields the form doesn't already have. This
          // protects modify mode (always has a site from the booking being
          // edited) and deep links like "book my favourite seat" (arrives
          // with siteId/buildingId/floorId already set) without depending on
          // hasAnyParam, which is always true for book-for-someone (it
          // always carries a `step`/`bookedForUserId` param) and would
          // otherwise block that flow's location prefill entirely.
          ...(!isModifyMode && !f.siteId && {
            siteId: prefs.siteId ?? f.siteId,
            buildingId: prefs.buildingId ?? f.buildingId,
            floorId: prefs.floorId ?? f.floorId,
          }),
          // Always apply current profile amenities; they reflect what the user
          // has set now, which is exactly what should show when modifying.
          preferences: preferenceKeys.length > 0 ? preferenceKeys : f.preferences,
        }));
      })
      .catch(() => { })
      .finally(() => setUserPrefsSettled(true));
  }, [availablePreferences, hasAnyParam, bookedForUserId, isGuestBooking, isModifyMode, myPreferencesApplied]);

  // ── Navigate helper ───────────────────────────────────────────────────────

  const guestUrlParams: GuestUrlParams | null = isGuestBooking
    ? { guestId, hostUserId, guestType, purposeOfVisit, startTime: guestStartTime, endTime: guestEndTime, notes: guestNotes }
    : null;

  const navigateTo = useCallback(
    (nextStep: BookingStep, nextForm: BookingFormState) => {
      setStepState(nextStep);
      router.push(buildUrl(nextStep, nextForm, modifyBookingId, bookedForUserId, guestUrlParams, bookingForName, visitId, isGuestModify, isAdminFlow));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, modifyBookingId, bookedForUserId, isGuestBooking, visitId, isGuestModify],
  );

  // ── Data fetching ─────────────────────────────────────────────────────────

  // The ids actually returned by the real (ACTIVE-only) fetch, tracked
  // separately from `sites` state — `sites` also ends up holding synthetic
  // entries injected below, so it can't be used on its own to tell "genuinely
  // active" apart from "we made up a placeholder for this id".
  const realSiteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoadingSites(true);
    fetchSites()
      .then((data) => {
        realSiteIdsRef.current = new Set(data.map((s) => s.id));
        setSites(data);
      })
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
  // synthetic option labeled from the name /dashboard/me already gave us.
  // Only do this once a real name is available — never fall back to a
  // "Site 4"/"Building 12"/"Floor 7" placeholder built from the raw id.
  // Guest bookings (and any flow that skips the preferences fetch) simply
  // wait for the real fetched list to resolve the name instead.

  // checkedSiteIdsRef guards against re-running this for the same missing
  // id on every render its deps happen to touch (e.g. once fetchSiteStatus
  // resolves and setSites/setForm below fire, `sites`/`form.siteId` change
  // again and would otherwise re-trigger the same check indefinitely).
  const checkedSiteIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loadingSites || !form.siteId) return;
    // realSiteIdsRef (not `sites`) is the source of truth for "genuinely in
    // the ACTIVE list" — `sites` also holds synthetic entries this same
    // effect injects below, so checking `sites` itself would immediately
    // (and permanently) look "found" the moment the very first synthetic
    // entry for this id was added, before its status was ever confirmed.
    if (realSiteIdsRef.current.has(form.siteId)) return;
    if (checkedSiteIdsRef.current.has(form.siteId)) return;
    checkedSiteIdsRef.current.add(form.siteId);

    const missingSiteId = form.siteId;
    const siteName = savedPreferenceNames.siteName;
    const injectPlaceholder = () => {
      if (!siteName) return;
      setSites((prev) =>
        prev.some((s) => s.id === missingSiteId)
          ? prev
          : [...prev, { id: missingSiteId, name: siteName, city: "", country: "", timezone: "" }]
      );
    };

    fetchSiteStatus(missingSiteId)
      .then((siteStatus) => {
        if (siteStatus === "INACTIVE") {
          // Keep the selection and inject the placeholder as usual — so the
          // office field still shows this office's name, giving the message
          // below something concrete to refer to — but flag its id so the
          // dropdown can hide it from the list of choices without clearing
          // the field, matching how the select is rendered in
          // Bookaseatpage.tsx (this option gets the `hidden` attribute
          // there, which removes it from the opened list while still
          // letting a `<select>` display its label as the current value).
          injectPlaceholder();
          setInactiveSiteId(missingSiteId);
          setError("This office is currently inactive and unavailable for booking. Please select a different office.");
          return;
        }
        // Not confirmed inactive (deleted, a transient lookup failure, or
        // some other reason it's missing) — fall back to the previous
        // behavior: show *something* labeled, rather than leave the select
        // bound to a value that matches no option.
        injectPlaceholder();
      })
      .catch(injectPlaceholder);
  }, [loadingSites, form.siteId, savedPreferenceNames.siteName]);

  useEffect(() => {
    if (loadingBuildings || !form.buildingId || !savedPreferenceNames.buildingName) return;
    const buildingName = savedPreferenceNames.buildingName;
    setBuildings((prev) => {
      if (prev.some((b) => b.id === form.buildingId)) return prev;
      return [
        ...prev,
        { id: form.buildingId, siteId: form.siteId, name: buildingName },
      ];
    });
  }, [buildings, loadingBuildings, form.buildingId, form.siteId, savedPreferenceNames.buildingName]);

  useEffect(() => {
    if (loadingFloors || !form.floorId || !savedPreferenceNames.floorName) return;
    const floorName = savedPreferenceNames.floorName;
    setFloors((prev) => {
      if (prev.some((f) => f.id === form.floorId)) return prev;
      return [
        ...prev,
        { id: form.floorId, buildingId: form.buildingId, name: floorName, number: 0 },
      ];
    });
  }, [floors, loadingFloors, form.floorId, form.buildingId, savedPreferenceNames.floorName]);

  // ── Derive floor layout URL from the selected floor ───────────────────────

  useEffect(() => {
    const floor = floors.find((f) => f.id === form.floorId);
    setFloorLayoutUrl(
      floor ? resolveFloorLayoutUrl(floor, form.fromDate) ?? null : null,
    );
  }, [floors, form.floorId, form.fromDate]);

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
    if (!prefillFloorName || floors.length === 0 || form.floorId) return;
    const match = floors.find(
      (f) => f.name.toLowerCase() === prefillFloorName.toLowerCase(),
    );
    if (match) setForm((f) => ({ ...f, floorId: match.id, selectedSeatId: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors, prefillFloorName]);

  // Auto-select the only building/floor when there's nothing else to choose
  // from — same "don't make them pick between one thing" pattern used in
  // the admin Blocked Spaces flow (BlockedSeatsPage/BlockSeatsPage).
  // Supersedes (and replaces) the old prefill-only single-building
  // shortcut: this applies unconditionally whenever exactly one option
  // exists, not just when a prefill name happens to be present.
  useEffect(() => {
    if (form.buildingId || loadingBuildings || buildings.length !== 1) return;
    setForm((f) => ({ ...f, buildingId: buildings[0].id, floorId: "", selectedSeatId: null }));
  }, [form.buildingId, loadingBuildings, buildings]);

  useEffect(() => {
    if (form.floorId || loadingFloors || floors.length !== 1) return;
    setForm((f) => ({ ...f, floorId: floors[0].id, selectedSeatId: null }));
  }, [form.floorId, loadingFloors, floors]);

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

  // Scoped to the currently-selected space type for the checklist UI —
  // resolveAmenityIds above deliberately keeps using the full unfiltered
  // list, since a preference already selected before a type switch still
  // needs to resolve to its amenity id right up until setSpaceType prunes it.
  const visiblePreferences = useMemo(
    () => availablePreferences.filter((p) => amenityAppliesTo(p.applicable_seat_types, form.spaceType as BookingSpaceType)),
    [availablePreferences, form.spaceType],
  );

  // ── Re-fetch seats on step 2 page refresh (and once on step 3, for a deep
  // link that skipped step 2 entirely — see the conflict check below) ──────

  useEffect(() => {
    if (
      (step === 2 || step === 3) &&
      seats.length === 0 &&
      form.floorId &&
      form.fromDate &&
      form.toDate &&
      availablePreferences.length > 0 &&
      userPrefsSettled
    ) {
      setLoadingSeats(true);
      const amenityIds = resolveAmenityIds(form.preferences);
      fetchSeatsWithAvailability({
        floorId: form.floorId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        preferences: form.preferences,
        amenityIds,
        currentSeatId: searchParams.get("seatId") ?? undefined,
        modifyBookingId: modifyBookingId ?? null,
        bookedForUserId: bookedForUserId ?? null,
        isGuestBooking: isGuestBooking,
        bookedForGuestId: guestId ?? null,
        spaceType: form.spaceType,
      })
        .then(setSeats)
        .catch((e) => {
          // The availability endpoint can 409 for reasons that have nothing
          // to do with a specific seat -- e.g. the admin already has another
          // active booking in this date range (user_has_active_booking_in_range
          // in booking_service.py runs before the seat-level query at all).
          // extractApiErrorMessage surfaces that real message instead of
          // Axios's generic "Request failed with status code 409". And for
          // a deep link that skipped step 2 (Quick Pick, "Tomorrow's
          // Booking"), this is discovered on landing at step 3 — same as a
          // seat-specific conflict, that means back to step 1 with the
          // error shown there, not a review summary sitting on top of it.
          setError(extractApiErrorMessage(e, "Failed to load spaces"));
          if (step === 3) {
            const clearedForm = { ...form, selectedSeatId: null };
            setForm(clearedForm);
            navigateTo(1, clearedForm);
          }
        })
        .finally(() => setLoadingSeats(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, availablePreferences, userPrefsSettled]);

  // ── Bounce off a conflict instead of ever showing Review & Confirm for it ──
  // A seat reaching step 3 via a deep link (Quick Pick, "Tomorrow's Booking")
  // skips step 2's own fetch entirely, so nothing had actually confirmed it
  // was still bookable until the fetch above resolves. Rather than letting
  // the review summary render for a seat that's no longer available (and
  // only failing once the admin presses Confirm), this drops straight back
  // to step 1 (Where & When — the Book a Space page itself) with the
  // conflict explained at the top, same as a conflict caught before ever
  // leaving that page (BookingSidebar's own pre-navigation check).
  useEffect(() => {
    if (step !== 3 || seats.length === 0 || !form.selectedSeatId) return;
    const seat = seats.find((s) => s.id === form.selectedSeatId);
    if (seat && seat.status !== "available" && seat.status !== "yours") {
      const clearedForm = { ...form, selectedSeatId: null };
      setError("This space is no longer available for the selected date(s). Please choose a different space.");
      setForm(clearedForm);
      navigateTo(1, clearedForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, seats, form.selectedSeatId]);

  // ── Field setters ─────────────────────────────────────────────────────────

  // A stale conflict/error banner from a previous action (e.g. "seat already
  // booked" from confirmBooking) has no reason to stay on screen once the
  // user has actually changed something about the request — clear it on
  // every field change below, not just on the next "Find Available Seats"/
  // retry submit.
  const setSiteId = (v: string | null) => {
    setError(null);
    setForm((f) => ({ ...f, siteId: v ?? "", buildingId: "", floorId: "", selectedSeatId: null }));
  };

  const setBuildingId = (v: string | null) => {
    setError(null);
    setForm((f) => ({ ...f, buildingId: v ?? "", floorId: "", selectedSeatId: null }));
  };

  const setFloorId = (v: string | null) => {
    setError(null);
    setForm((f) => ({ ...f, floorId: v ?? "", selectedSeatId: null }));
  };

  const setFromDate = (v: string) => {
    if (v > maxBookableDateIso()) {
      setError(BOOKING_TOO_FAR_IN_ADVANCE_MESSAGE);
      return;
    }
    setError(null);
    setForm((f) => ({
      ...f,
      fromDate: v,
      // Keep the existing multi-day range's end date -- only pull it
      // forward ("fall back") to match the new start when the start has
      // moved past it, since To can never sit before From. Moving From
      // earlier or within the current range should never silently
      // collapse an already-selected multi-day range down to one day.
      toDate: v > f.toDate ? v : f.toDate,
    }));
  };

  const setToDate = (v: string) => {
    if (v > maxBookableDateIso()) {
      setError(BOOKING_TOO_FAR_IN_ADVANCE_MESSAGE);
      return;
    }
    setError(null);
    setForm((f) => ({ ...f, toDate: v }));
  };

  const togglePreference = (key: string) => {
    setError(null);
    setForm((f) => ({
      ...f,
      preferences: f.preferences.includes(key)
        ? f.preferences.filter((p) => p !== key)
        : [...f.preferences, key],
    }));
  };

  const clearAll = () => setForm((f) => ({ ...f, preferences: [] }));

  // Switching space type drops any already-selected preference that no
  // longer applies under the new type (e.g. a Cabin-only amenity like "Desk
  // Phone" selected while Cabin was active shouldn't silently keep filtering
  // the search after switching to Conference Room, where it's not even
  // shown as an option anymore).
  const setSpaceType = (next: BookingSpaceType) => {
    setError(null);
    setForm((f) => ({
      ...f,
      spaceType: next,
      preferences: f.preferences.filter((key) => {
        const pref = availablePreferences.find((p) => p.key === key);
        return amenityAppliesTo(pref?.applicable_seat_types, next);
      }),
    }));
  };

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────

  const findAvailableSeats = useCallback(async () => {
    if (!form.floorId || !form.fromDate || !form.toDate) return;
    // No local "is this office inactive" guard here on purpose — the
    // backend's own availability check (get_available_seats_by_range in
    // booking_service.py) now rejects an inactive office with its own
    // accurate message ("office_inactive"), the same way it already does
    // for "no_available_seats". Re-implementing that check here would just
    // be a second, duplicated copy of backend logic that could drift out of
    // sync with it; the catch block below already surfaces whatever message
    // the backend sends back.
    setLoadingSeats(true);
    setError(null);
    try {
      const amenityIds = resolveAmenityIds(form.preferences);
      const data = await fetchSeatsWithAvailability({
        floorId: form.floorId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        preferences: form.preferences,
        amenityIds,
        currentSeatId: searchParams.get("seatId") ?? undefined,
        modifyBookingId: modifyBookingId ?? null,
        bookedForUserId: bookedForUserId ?? null,
        isGuestBooking: isGuestBooking,
        bookedForGuestId: guestId ?? null,
        spaceType: form.spaceType,
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
  }, [form, resolveAmenityIds, navigateTo, searchParams, modifyBookingId, bookedForUserId, guestId, isGuestBooking]);

  // ── Step 2: select seat ───────────────────────────────────────────────────

  const selectSeat = (seatId: string | null) => {
    setError(null);
    setForm((f) => ({ ...f, selectedSeatId: seatId }));
  };

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
      site_id: Number(form.siteId),
      building_id: Number(form.buildingId),
      floor_id: Number(form.floorId),
      seat_id: Number(form.selectedSeatId),
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
          site_id: Number(form.siteId),
          building_id: Number(form.buildingId),
          floor_id: Number(form.floorId),
          seat_id: Number(form.selectedSeatId),
          visit_date: form.fromDate,
          guest_type: guestType ?? "OTHER",
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
          site_id: Number(form.siteId),
          building_id: Number(form.buildingId),
          floor_id: Number(form.floorId),
          seat_id: Number(form.selectedSeatId),
          visit_date: form.fromDate,
          guest_id: Number(guestId),
          host_user_id: Number(hostUserId),
          guest_type: guestType,
          ...(purposeOfVisit ? { purpose_of_visit: purposeOfVisit } : {}),
          ...(guestStartTime ? { start_time: guestStartTime } : {}),
          ...(guestEndTime ? { end_time: guestEndTime } : {}),
          ...(guestNotes ? { notes: guestNotes } : {}),
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
        // A 409 specifically means this exact conflict check (the one that
        // sent the admin here) lost a last-second race, so it gets its own
        // clear fallback instead of the generic one below.
        const fallback = err.response?.status === 409
          ? "This space was just booked by someone else. Please go back and choose a different space."
          : "Something went wrong. Please try again.";
        setError(extractApiErrorMessage(err, fallback));
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    form, isModifyMode, modifyBookingId, isGuestModify, isAddBookingToVisit, visitId,
    isGuestBooking, guestId, hostUserId, guestType, purposeOfVisit,
    guestStartTime, guestEndTime, guestNotes, bookedForUserId,
  ]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goBack = () => {
    if (searchParams.get("source") === "dashboard") {
      router.push("/dashboard?openFavDialog=1");
      return;
    }
    setError(null);
    // A Quick Pick (BookingSidebar) jumps straight to step 3 — or to step 2's
    // floor map after a conflict — skipping the steps in between, the same
    // shortcut the dashboard's Favourite Space dialog uses (source=dashboard,
    // handled above). Back from either should return to step 1 (Where &
    // When), not decrement into a step the admin never actually visited on
    // the way in. `source` never survives a normal in-flow step transition
    // (buildUrl doesn't carry it forward), so this only fires on the first
    // Back click right after landing via the shortcut.
    const cameFromShortcut = searchParams.get("source") === "book";
    const prevStep = (cameFromShortcut ? 1 : step > 1 ? step - 1 : 1) as BookingStep;
    const clearedForm = prevStep < 2 ? { ...form, selectedSeatId: null } : form;
    setForm(clearedForm);
    navigateTo(prevStep, clearedForm);
  };

  // ── FIX: after confirmation (both book & modify) go to My Bookings ────────
  const resetForm = () => {
    const blankForm = { ...DEFAULT_STATE, fromDate: todayIso(), toDate: todayIso() };
    setForm(blankForm);
    setStepState(1);
    setBuildings([]);
    setFloors([]);
    setSeats([]);
    setFloorLayoutUrl(null);
    setConfirmation(null);
    setError(null);
    // Let the preferences auto-fill effect run again for the next booking —
    // it's a one-shot guard per component mount, and "Book Another Seat"
    // reuses this same mount instead of remounting.
    setMyPreferencesApplied(false);
    setUserPrefsSettled(false);
    setSavedPreferenceNames({ siteName: null, buildingName: null, floorName: null });
    if (isModifyMode) {
      const forSomeone = isBookingForSomeone || isGuestModify || Boolean(bookedForUserId);
      router.push(forSomeone ? "/mybookings?tab=bookedForSomeone" : "/mybookings");
    } else if (isBookingForSomeone) {
      // Stay in the book-for-someone flow — go back to step 1 for the same person
      router.push(buildUrl(1, blankForm, null, bookedForUserId, guestUrlParams, bookingForName, visitId, isGuestModify));
    } else {
      router.push("/book");
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedSite = sites.find((s) => s.id === form.siteId);
  const selectedBuilding = buildings.find((b) => b.id === form.buildingId);
  const selectedFloor = floors.find((f) => f.id === form.floorId);
  const selectedSeat = seats.find((s) => s.id === form.selectedSeatId);

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

  // Only meaningful in modify mode — true once the seat, date, or location
  // differs from the original booking. Gates the review/confirm actions so
  // a no-op "modification" (nothing actually changed) can't be submitted.
  const hasBookingChanges =
    !isModifyMode ||
    (selectedSite?.name ?? null) !== originalBooking.siteName ||
    (selectedBuilding?.name ?? null) !== originalBooking.buildingName ||
    (selectedFloor?.name ?? null) !== originalBooking.floorName ||
    form.fromDate !== originalBooking.fromDate ||
    form.toDate !== originalBooking.toDate ||
    (selectedSeat?.label ?? null) !== originalBooking.seatLabel;

  return {
    step,
    form,
    sites,
    inactiveSiteId,
    buildings,
    floors,
    seats,
    availablePreferences,
    visiblePreferences,
    confirmation,
    error,
    setError,
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
    hasBookingChanges,
    maxBookableDate: maxBookableDateIso(),
    isModifyMode,
    isAdminFlow,
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
    setSpaceType,
    findAvailableSeats,
    selectSeat,
    goToReview,
    confirmBooking,
    goBack,
    resetForm,
  };
}