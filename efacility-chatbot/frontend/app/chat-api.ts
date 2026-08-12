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
}

export interface SeatList {
  seats: SeatCard[];
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
let accessToken = '';

export function setAccessToken(token: string) {
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
  return requestJson<LookupOption[]>('/api/chat/lookup/sites');
}

export function lookupBuildings(siteId: string) {
  return requestJson<LookupOption[]>(`/api/chat/lookup/buildings?site_id=${encodeURIComponent(siteId)}`);
}

export function lookupFloors(buildingId: string) {
  return requestJson<LookupOption[]>(`/api/chat/lookup/floors?building_id=${encodeURIComponent(buildingId)}`);
}

export function lookupAmenities() {
  return requestJson<LookupOption[]>('/api/chat/lookup/amenities');
}
