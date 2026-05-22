
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { usePermissions } from "@/features/dashboard/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Monitor,
  CalendarCheck,
  Search,
  Bell,
  Star,
  LogOut,
  Building2,
  BarChart3,
  ShieldCheck,
  MapPin,
  Settings,
  ClipboardList,
  Users,
} from "lucide-react";
import { getInitials, type User } from "@/features/auth/types/auth.types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole =
  | "TENANT_ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "TALENT"
  | "RECEPTIONIST"
  | "FACILITIES"
  | string;

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeRed?: boolean;
  badgeGreen?: boolean;
  // Permission string that must exist in user.permissions
  permission?: string;
  // Role fallback — used when backend doesn't send granular permissions yet
  roles?: string[];
}

// ─── Route map ────────────────────────────────────────────────────────────────

const ROUTE_MAP: Record<string, string> = {
  // Employee
  dashboard:       "/dashboard",
  book:            "/book",
  mybookings:      "/mybookings",
  team:            "/team",
  schedule:        "/schedule",
  find:            "/find",
  notifications:   "/notifications",
  favourites:      "/favourites",
  // Admin
  admin_dashboard: "/admin",
  offices:         "/admin/offices",
  floors:          "/admin/floors",
  layouts:         "/admin/layouts",
  seats:           "/admin/seats",
  amenities:       "/admin/amenities",
  seatstatus:      "/admin/seat-status",
  bookings:        "/admin/bookings",
  users:           "/admin/users",
  occupancy:       "/admin/occupancy",
  utilization:     "/admin/utilization",
  audit:           "/admin/audit",
  settings:        "/admin/settings",
};

// ─── Employee nav config ──────────────────────────────────────────────────────

const MAIN_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "book",
    label: "Book a seat",
    icon: CalendarDays,
    permission: "seat:book_self",
  },
  {
    id: "mybookings",
    label: "My bookings",
    icon: BookOpen,
    badge: 3,
    badgeRed: true,
    permission: "booking:view_own",
  },
  {
    id: "team",
    label: "Book for someone",
    icon: Monitor,
    badge: "New",
    badgeGreen: true,
    // Only shown when the user has this permission.
    // Backend must include "booking:book_for_someone" in TALENT (and MANAGER)
    // permissions but NOT in EMPLOYEE permissions.
    permission: "booking:book_for_someone",
  },
  {
    id: "schedule",
    label: "My schedule",
    icon: CalendarCheck,
    permission: "booking:view_own",
  },
];

const OFFICE_NAV: NavItem[] = [
  {
    id: "find",
    label: "Find teammates",
    icon: Search,
    permission: "teammate:view",
  },
];

const PERSONAL_NAV: NavItem[] = [
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    badge: 2,
    badgeRed: true,
  },
  {
    id: "favourites",
    label: "Preferences",
    icon: Star,
  },
];

// ─── Admin nav config ─────────────────────────────────────────────────────────

const ADMIN_DASHBOARD: NavItem[] = [
  { id: "admin_dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const ADMIN_MANAGE_NAV: NavItem[] = [
  { id: "offices",    label: "Offices",       icon: Building2   },
  { id: "floors",     label: "Floors",        icon: MapPin      },
  { id: "layouts",    label: "Floor Layouts", icon: ClipboardList },
  { id: "seats",      label: "Seats",         icon: CalendarDays },
  { id: "amenities",  label: "Amenities",     icon: Star        },
  { id: "seatstatus", label: "Seat Status",   icon: Settings    },
];

const ADMIN_OPERATIONS_NAV: NavItem[] = [
  { id: "bookings",      label: "Bookings",      icon: CalendarDays },
  { id: "users",         label: "Users",          icon: Users       },
  { id: "notifications", label: "Notifications",  icon: Bell        },
];

const ADMIN_REPORTS_NAV: NavItem[] = [
  { id: "occupancy",   label: "Occupancy",   icon: BarChart3  },
  { id: "utilization", label: "Utilization", icon: BarChart3  },
  { id: "audit",       label: "Audit Logs",  icon: ShieldCheck },
];

const ADMIN_SETTINGS_NAV: NavItem[] = [
  { id: "settings", label: "Settings", icon: Settings },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  TENANT_ADMIN: "Admin",
  MANAGER:      "Manager",
  EMPLOYEE:     "Employee",
  TALENT:       "Talent",
  RECEPTIONIST: "Receptionist",
  FACILITIES:   "Facilities",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  TENANT_ADMIN: "bg-rose-50 text-rose-600 ring-rose-200",
  MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
  EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
  TALENT:       "bg-teal-50 text-teal-600 ring-teal-200",
  RECEPTIONIST: "bg-amber-50 text-amber-600 ring-amber-200",
  FACILITIES:   "bg-orange-50 text-orange-600 ring-orange-200",
};

function getRoleLabel(r: string) { return ROLE_LABELS[r] ?? r; }

function resolveDisplayName(u: User) {
  return u.display_name ?? u.full_name ?? u.name ?? "Loading...";
}
function resolveSubtitle(u: User) {
  return u.role ? getRoleLabel(u.role) : (u.job_title ?? u.email ?? "");
}
function resolveInitials(u: User) {
  const name = u.display_name ?? u.full_name ?? u.name;
  return name ? getInitials(name) : (u.email?.[0]?.toUpperCase() ?? "?");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles = ROLE_BADGE_STYLES[role] ?? "bg-gray-50 text-gray-500 ring-gray-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-[2px] rounded-md text-[9px] font-semibold uppercase tracking-wide ring-1",
        styles,
      )}
    >
      {getRoleLabel(role)}
    </span>
  );
}

// NavSection now reads permissions from the hook and filters before rendering.
function NavSection({
  items,
  activeItem,
  onNavigate,
}: {
  items: NavItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
}) {
  const { can, hasRole } = usePermissions();

  const visible = items.filter((item) => {
    // If a permission key is declared, the user must have it.
    if (item.permission && !can(item.permission)) return false;
    // If a roles array is declared (fallback), the user must match one.
    if (item.roles && !hasRole(...item.roles)) return false;
    return true;
  });

  return (
    <>
      {visible.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            isActive={activeItem === item.id}
            tooltip={item.label}
            onClick={() => onNavigate(item.id)}
            className="justify-between"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate text-[12.5px]">{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <Badge
                className={cn(
                  "text-[10px] h-[18px] min-w-[18px] px-1.5 rounded-full leading-none font-medium border-0 shrink-0",
                  item.badgeRed   && "bg-red-500 text-white hover:bg-red-500",
                  item.badgeGreen && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                )}
              >
                {item.badge}
              </Badge>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

function LogoutDialog({
  open, displayName, initials, onConfirm, onCancel, isLoggingOut,
}: {
  open: boolean;
  displayName: string;
  initials: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoggingOut: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-fade-in"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl shadow-black/10 w-full max-w-[320px] overflow-hidden animate-dialog-in">
          <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] font-semibold text-indigo-700 ring-4 ring-indigo-50">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-gray-900">Sign out?</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                Are you sure you want to sign out of your account?
              </p>
            </div>
          </div>
          <div className="h-px bg-gray-100 mx-5" />
          <div className="px-5 py-4 flex gap-2">
            <button
              onClick={onConfirm}
              disabled={isLoggingOut}
              className={cn(
                "w-full h-[38px] rounded-xl text-[12.5px] font-semibold transition-all duration-150",
                "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] flex items-center justify-center gap-2",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100",
              )}
            >
              {isLoggingOut ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                  Signing out…
                </>
              ) : (
                <><LogOut className="w-3.5 h-3.5" />Yes, sign out</>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoggingOut}
              className="w-full h-[38px] rounded-xl text-[12.5px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
            >
              Stay signed in
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  user: User | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({ user }: AppSidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const [showLogout,   setShowLogout]   = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { state }  = useSidebar();
  const { logout } = useAuthContext();
  const isCollapsed = state === "collapsed";

  const initials    = user ? resolveInitials(user)    : "?";
  const displayName = user ? resolveDisplayName(user) : "Loading...";
  const displaySub  = user ? resolveSubtitle(user)    : "";

  // Role is the single source of truth for which nav tree to render.
  const role: AppRole = user?.role ?? "EMPLOYEE";
  const isAdmin       = role === "TENANT_ADMIN";

  // Derive active item from current URL.
  // Sort by path length descending so /admin/layouts matches before /admin.
  const activeItem =
    Object.entries(ROUTE_MAP)
      .sort(([, a], [, b]) => b.length - a.length)
      .find(([, path]) => pathname.startsWith(path))?.[0] ?? "dashboard";

  const handleNav = (id: string) => {
    const path = ROUTE_MAP[id];
    if (path) router.push(path);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 700));
    logout();
  };

  return (
    <>
      <LogoutDialog
        open={showLogout}
        displayName={displayName}
        initials={initials}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogout(false)}
        isLoggingOut={isLoggingOut}
      />

      <Sidebar collapsible="icon">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <SidebarHeader className="px-3 py-4">
          <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">
                SeatBook
              </span>
            )}
          </div>
        </SidebarHeader>

        {isAdmin ? (

          /* ── TENANT_ADMIN SIDEBAR ───────────────────────────────────── */
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <NavSection items={ADMIN_DASHBOARD} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Manage</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={ADMIN_MANAGE_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={ADMIN_OPERATIONS_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Reports</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={ADMIN_REPORTS_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={ADMIN_SETTINGS_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

        ) : (

          /* ── EMPLOYEE / TALENT / OTHER ROLES SIDEBAR ────────────────── */
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={MAIN_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Office</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={OFFICE_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Personal</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection items={PERSONAL_NAV} activeItem={activeItem} onNavigate={handleNav} />
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

        )}

        {/* ── User footer ───────────────────────────────────────────────── */}
        <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
          <div className={cn("flex items-center gap-2 relative", isCollapsed && "justify-center")}>
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-700">
                {initials}
              </div>
              <div className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>

            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-sidebar-foreground truncate leading-tight">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user?.role && <RoleBadge role={user.role} />}
                    {displaySub && !user?.role && (
                      <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">
                        {displaySub}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowLogout(true)}
                  className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sidebar-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all duration-150 active:scale-90"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {isCollapsed && (
              <button
                onClick={() => setShowLogout(true)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Sign out"
              />
            )}
          </div>
        </SidebarFooter>

      </Sidebar>
    </>
  );
}