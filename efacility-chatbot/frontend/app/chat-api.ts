export interface SessionOut {
  session_id: string;
  user_name: string;
  current_node: string;
  state: string;
  initial_response?: ChatResponse;
}

export interface UserMessage {
  text?: string;
  form_data?: Record<string, unknown>;
  message_type: string;
}

export interface ChatOption {
  number: number;
  label: string;
  value: unknown;
}

export interface FormField {
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: Array<{ value: string; label: string; icon?: string; category?: string }>;
  default_value?: unknown;
  lookup_endpoint?: string;
  depends_on?: string;
  min_value?: number;
  max_value?: number;
  placeholder?: string;
}

export interface FormCard {
  title: string;
  subtitle?: string;
  node: string;
  fields: FormField[];
  submit_label: string;
}

export interface SeatCard {
  id: number;
  seat_code: string;
  seat_type: string;
  seat_neighborhood?: string;
  amenities: string[];
  is_available?: boolean;
  x?: number | null;
  y?: number | null;
}

export interface SeatList {
  seats: SeatCard[];
  seat_catalog?: SeatCard[];
  total: number;
  floor_name: string;
  building_name: string;
  headcount: number;
}

export interface BookingConfirmation {
  booking_date: string;
  site_name: string;
  building_name: string;
  floor_name: string;
  seat_code: string;
  seat_type: string;
  headcount: number;
  amenities: string[];
}

export interface BookingSuccess {
  booking_ref: string;
  booking_date: string;
  seat_code: string;
  site_name: string;
  message: string;
}

export interface QuickBookCard {
  prompt: string;
  last_seat_code: string;
  last_site: string;
  last_building: string;
  last_floor: string;
  last_seat_type: string;
}

export interface BookingCardData {
  booking_id: string;
  booking_ref: string;
  booking_date: string;
  site_name: string;
  building_name: string;
  floor_name: string;
  seat_code: string;
  seat_type: string;
  status: string;
  can_modify?: boolean;
  can_cancel?: boolean;
  can_rebook?: boolean;
}

export interface BookingListData {
  bookings: BookingCardData[];
  total: number;
  mode?: 'upcoming' | 'past' | 'cancelled';
}

export interface RebookCalendarDay {
  date: string;
  available: boolean;
  selectable?: boolean;
  reserved?: boolean;
  reserved_seat_available?: boolean;
}

export interface RebookCalendarData {
  booking_id: string;
  seat_code: string;
  site_name: string;
  building_name: string;
  floor_name: string;
  month_start: string;
  previous_month_start?: string | null;
  next_month_start: string;
  days: RebookCalendarDay[];
}

export interface BotMessage {
  type: 'TEXT' | 'OPTIONS' | 'FORM_CARD' | 'SEAT_LIST' | 'CONFIRMATION' | 'SUCCESS' | 'ERROR' | 'QUICK_BOOK' | 'BOOKING_LIST' | 'REBOOK_CALENDAR';
  text?: string;
  options?: ChatOption[];
  form_card?: FormCard;
  seat_list?: SeatList;
  confirmation?: BookingConfirmation;
  success?: BookingSuccess;
  quick_book?: QuickBookCard;
  booking_list?: BookingListData;
  rebook_calendar?: RebookCalendarData;
}

export interface ChatResponse {
  session_id: string;
  current_node: string;
  state: string;
  messages: BotMessage[];
}

export interface LookupOption {
  value: string;
  label: string;
  city?: string;
  icon?: string;
  category?: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:8100';
const SEATBOOK_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
let accessToken = '';
let sitesLookup: Promise<LookupOption[]> | undefined;
const buildingLookups = new Map<string, Promise<LookupOption[]>>();
const floorLookups = new Map<string, Promise<LookupOption[]>>();

function clearLookupCache() {
  sitesLookup = undefined;
  buildingLookups.clear();
  floorLookups.clear();
}

function cachedLookup(
  cache: Map<string, Promise<LookupOption[]>>,
  key: string,
  loader: () => Promise<LookupOption[]>,
) {
  const existing = cache.get(key);
  if (existing) return existing;

  const pending = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

export function setAccessToken(token: string) {
  if (token !== accessToken) clearLookupCache();
  accessToken = token;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = typeof body?.detail === 'string' ? body.detail : '';
    } catch {
      detail = '';
    }
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestSeatBookJson<T>(path: string): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${SEATBOOK_API_BASE}${path}`, { headers });
  if (!response.ok) throw new Error(`Workforce API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

interface SeatBookSite {
  site_id: string | number;
  site_name: string;
  city?: string;
}

interface SeatBookBuilding {
  building_id: string | number;
  building_name: string;
}

interface SeatBookFloor {
  floor_id: string | number;
  floor_name?: string;
  floor_code?: string;
}

export function createSession() {
  return requestJson<SessionOut>('/api/chat/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function sendMessage(sessionId: string, message: UserMessage) {
  return requestJson<ChatResponse>(`/api/chat/session/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify(message),
  });
}

export function lookupSites() {
  if (!sitesLookup) {
    sitesLookup = requestSeatBookJson<SeatBookSite[]>('/sites?status=ACTIVE&limit=100')
      .then((sites) => sites
        .filter((site) => site.site_id && site.site_name)
        .map((site) => ({
          value: String(site.site_id),
          label: `${site.site_name}${site.city ? ` (${site.city})` : ''}`,
          city: site.city,
        })))
      .catch((error) => {
        sitesLookup = undefined;
        throw error;
      });
  }
  return sitesLookup;
}

export function lookupBuildings(siteId: string) {
  return cachedLookup(buildingLookups, siteId, () =>
    requestSeatBookJson<SeatBookBuilding[]>(
      `/buildings?site_id=${encodeURIComponent(siteId)}&status=ACTIVE&limit=100`,
    ).then((buildings) => buildings
      .filter((building) => building.building_id && building.building_name)
      .map((building) => ({ value: String(building.building_id), label: building.building_name }))),
  );
}

export function lookupFloors(buildingId: string) {
  return cachedLookup(floorLookups, buildingId, () =>
    requestSeatBookJson<SeatBookFloor[]>(
      `/buildings/${encodeURIComponent(buildingId)}/floors?status=ACTIVE&limit=100`,
    ).then((floors) => floors
      .filter((floor) => floor.floor_id)
      .map((floor) => ({
        value: String(floor.floor_id),
        label: floor.floor_name || floor.floor_code || String(floor.floor_id),
      }))),
  );
}

export function lookupAmenities() {
  return requestJson<LookupOption[]>('/api/chat/lookup/amenities');
}
