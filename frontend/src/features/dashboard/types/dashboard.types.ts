import { User } from "@/features/auth/types/auth.types";

export type { User } from "@/features/auth/types/auth.types";

// ─── Raw API response types ───────────────────────────────────────────────────

export interface ApiBooking {
  booking_id: string;
  tenant_id: string;
  user_id: string;
  seat_id: string;
  site_id?: string | null;
  building_id?: string | null;
  floor_id?: string | null;
  seat_code?: string | null;
  site_name?: string | null;
  building_name?: string | null;
  floor_name?: string | null;
  booking_date: string;
  booking_status: string;
  source_channel?: string | null;
  check_in_at?: string | null;
  checked_out_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiTeamMemberSeat {
  seat_id: string;
  seat_code: string;
  floor_id: string;
  building_id: string;
}

export interface ApiTeamMember {
  user_id: string;
  full_name: string;
  email: string;
  has_booking_today: boolean;
  seat: ApiTeamMemberSeat | null;
}

export interface ApiTeamGroup {
  team_id: string;
  team_name: string;
  total_members: number;
  booked_today_count: number;
  members: ApiTeamMember[];
}

// ─── New: /dashboard/me response shape (matches DashboardMeResponse schema) ──

export interface ApiFavouriteSeat {
  seat_id: string;
  seat_code?: string | null;
  floor_id?: string | null;
  floor_name?: string | null;
  building_id?: string | null;
  building_name?: string | null;
  site_id?: string | null;
  site_name?: string | null;
}

export interface ApiDashboardMe {
  favorite_seat: ApiFavouriteSeat | null;
  days_in_office_total: number;
  days_in_office_current_month: number;
  days_in_office_current_year: number;
  team_rank_current_year: number | null;
  team_member_count: number;
}

// ─── Frontend display types ───────────────────────────────────────────────────

export interface Booking {
  id: string;
  location: string;
  floor: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "Confirmed" | "Pending" | "Cancelled";
  isRecurring: boolean;
  seatId: string;
  managerNote: string;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  floor: string;
  avatarColor: string;
  seatCode?: string;
  email?: string;
  buildingId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  type: "warning" | "info" | "success";
  date?: string;
}

export interface FavouriteSeat {
  id: string;
  label: string;
  location: string;
  description: string;
  floor: string;
}

export interface DashboardStats {
  daysInMonth: number;
  trend: number;
  teamInOffice: number;
  teamRemoteCount: number;
  officeVisitsThisYear: number;
  teamRank: number;
}

export interface WeekDay {
  date: number;
  dayLabel: string;
  isToday: boolean;
  hasBooking: boolean;
  hasDot: boolean;
}

export interface TodayBookingInfo {
  hasTodayBooking: boolean;
  seatCode: string | null;
  floor: string | null;
  bookingId: string | null;
}

export interface DashboardData {
  user: User;
  stats: DashboardStats;
  weekDays: WeekDay[];
  upcomingBookings: Booking[];
  teamInOfficeToday: TeamMember[];
  announcements: Announcement[];
  favouriteSeat: FavouriteSeat | null;
  teamOnlineCount: number;
  teamOfflineCount: number;
  nextBookingDate: string;
  todayBooking: TodayBookingInfo;
  daysInOffice: number;
}
