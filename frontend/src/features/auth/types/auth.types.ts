
export interface FavoriteSeatResponse {
  seat_id:       string;
  seat_code:     string;
  floor_id?:     string | null;
  floor_name?:   string | null;
  site_id?:      string | null;
  site_name?:    string | null;
  building_id?:  string | null;
  building_name?: string | null;
}

export interface User {
  user_id:          string;
  tenant_id:        string;
  email:            string;
  full_name?:       string | null;
  display_name?:    string | null;
  name?:            string | null;
  role?:            string | null;
  status?:          string | null;
  home_site_id?:    string | null;
  department?:      string | null;
  job_title?:       string | null;
  office_location?: string | null;
  // Granular permission strings returned by /auth/me.
  // e.g. ["seat:book_self", "booking:view_own", "booking:book_for_someone"]
  // usePermissions reads this array — if empty/absent, all guarded nav
  // items are hidden.
  permissions?:     string[];
  favorite_seat?:   FavoriteSeatResponse | null;
  days_in_office?:  number;
  avatar_url?:      string;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export interface AuthContextType {
  user:            User | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  logout:          () => Promise<void>;
  // The first "who am I" check got no usable answer: "unreachable" (no
  // response at all) or "server" (the server answered with an error). null
  // otherwise. `retry` runs the check again and resolves when it has finished.
  connectionError: ConnectionErrorKind | null;
  retry:           () => Promise<void>;
  // True while the "Session expired" dialog is up (a refresh already failed).
  // Lets pages hide anything that looks interactive but can no longer reach
  // the API, e.g. the chatbot floating panel.
  sessionExpired:  boolean;
}

export type ConnectionErrorKind = "unreachable" | "server";