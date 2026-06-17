"use client";

import { usePathname, useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  ChevronsUpDown,
  UserRound,
  UserCheck,
  CalendarSearch,
  History,
  UserPlus, 
} from "lucide-react";

import { getInitials, type User } from "@/features/auth/types/auth.types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole =
  | "TENANT_ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "TALENT"
  | "SECURITY"
  | "FACILITIES"
  | string;

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeRed?: boolean;
  badgeGreen?: boolean;
  permission?: string;
  roles?: string[];
}

// ─── Route map ────────────────────────────────────────────────────────────────

const ROUTE_MAP: Record<string, string> = {
  dashboard:   "/dashboard",
  book:        "/book",
  mybookings:  "/mybookings",
  team:        "/book-for-someone",
  schedule:    "/schedule",
  find:        "/find",
  notifications: "/notifications",
  favourites:  "/favourites",

  admin_dashboard: "/dashboard",
  offices:         "/admin/offices",
  buildings:       "/admin/building",
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

  security_dashboard: "/dashboard",
  today_visitors:     "/security/today-visitors",
  checked_in:          "/security/checked-in",
  visitor_search:      "/security/visitor-search",
  past_visits:         "/security/past-visits",
  invite_guest:        "/security/invite-guest",
};

// ─── Nav configs ──────────────────────────────────────────────────────────────

const MAIN_NAV: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",        icon: LayoutDashboard },
  { id: "book",       label: "Book a seat",       icon: CalendarDays,  permission: "seat:book_self" },
  { id: "mybookings", label: "My bookings",       icon: BookOpen,      badge: 3, badgeRed: true,   permission: "booking:view_own" },
  { id: "team",       label: "Book for someone",  icon: Monitor,       badge: "New", badgeGreen: true, permission: "booking:book_for_someone" },
  { id: "schedule",   label: "My schedule",       icon: CalendarCheck, permission: "booking:view_own" },
];

const OFFICE_NAV: NavItem[] = [
  { id: "find", label: "Find teammates", icon: Search, permission: "teammate:view" },
];

const PERSONAL_NAV: NavItem[] = [
  { id: "notifications", label: "Notifications", icon: Bell, badge: 2, badgeRed: true },
  { id: "favourites",    label: "Preferences",   icon: Star },
];

const ADMIN_DASHBOARD: NavItem[] = [
  { id: "admin_dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const ADMIN_MANAGE_NAV: NavItem[] = [
  { id: "offices",    label: "Offices",       icon: Building2     },
  { id: "buildings",  label: "Buildings",     icon: Building2     },
  { id: "floors",     label: "Floors",        icon: MapPin        },
  { id: "layouts",    label: "Floor Layouts", icon: ClipboardList },
  { id: "seats",      label: "Seats",         icon: CalendarDays  },
  { id: "amenities",  label: "Amenities",     icon: Star          },
  { id: "seatstatus", label: "Seat Status",   icon: Settings      },
];

const ADMIN_OPERATIONS_NAV: NavItem[] = [
  { id: "bookings",      label: "Bookings",      icon: CalendarDays },
  { id: "users",         label: "Users",         icon: Users        },
  { id: "notifications", label: "Notifications", icon: Bell         },
];

const ADMIN_REPORTS_NAV: NavItem[] = [
  { id: "occupancy",   label: "Occupancy",   icon: BarChart3   },
  { id: "utilization", label: "Utilization", icon: BarChart3   },
  { id: "audit",       label: "Audit Logs",  icon: ShieldCheck },
];

const ADMIN_SETTINGS_NAV: NavItem[] = [
  { id: "settings", label: "Settings", icon: Settings },
];
//--------security nav config----------------------------------------------------
const SECURITY_DASHBOARD: NavItem[] = [
  { id: "security_dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const SECURITY_VISITOR_NAV: NavItem[] = [
  { id: "today_visitors", label: "Today's Visitors",   icon: CalendarCheck },
  { id: "checked_in",     label: "Checked-in Visitors", icon: UserCheck     },
  { id: "visitor_search", label: "Visitor Search",      icon: CalendarSearch },
  { id: "past_visits",    label: "Past Visits",         icon: History       },
];

const SECURITY_ACTIONS_NAV: NavItem[] = [
  { id: "invite_guest", label: "Invite Guest", icon: UserPlus },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  TENANT_ADMIN: "Admin",
  MANAGER:      "Manager",
  EMPLOYEE:     "Employee",
  TALENT:       "Talent",
  SECURITY: "Security",
  FACILITIES:   "Facilities",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  TENANT_ADMIN: "bg-rose-50 text-rose-600 ring-rose-200",
  MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
  EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
  TALENT:       "bg-teal-50 text-teal-600 ring-teal-200",
  SECURITY: "bg-amber-50 text-amber-600 ring-amber-200",
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

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles = ROLE_BADGE_STYLES[role] ?? "bg-gray-50 text-gray-500 ring-gray-200";
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-[2px] rounded-md text-[9px] font-semibold uppercase tracking-wide ring-1",
      styles
    )}>
      {getRoleLabel(role)}
    </span>
  );
}

// ─── NavSection ───────────────────────────────────────────────────────────────

function NavSection({
  items,
  activeItem,
  onNavigate,
}: {
  items: NavItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
}) {
  const router = useRouter();
  const { can, hasRole } = usePermissions();

  const visible = items.filter((item) => {
    if (item.permission && !can(item.permission)) return false;
    if (item.roles && !hasRole(...item.roles)) return false;
    return true;
  });

  return (
    <>
      {visible.map((item) => {
        const href = ROUTE_MAP[item.id] ?? "#";
        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={activeItem === item.id}
              tooltip={item.label}
              onMouseEnter={() => router.prefetch(href)}
              onClick={() => onNavigate(item.id)}
              className="justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate text-[12.5px]">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <Badge className={cn(
                  "text-[10px] h-[18px] min-w-[18px] px-1.5 rounded-full leading-none font-medium border-0 shrink-0",
                  item.badgeRed   && "bg-red-500 text-white hover:bg-red-500",
                  item.badgeGreen && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                )}>
                  {item.badge}
                </Badge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AppSidebarProps {
  user: User | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const { state }  = useSidebar();
  const { logout } = useAuthContext();

  const isCollapsed = state === "collapsed";

  const initials    = user ? resolveInitials(user)    : "?";
  const displayName = user ? resolveDisplayName(user) : "Loading...";
  const displaySub  = user ? resolveSubtitle(user)    : "";

  const role: AppRole = user?.role ?? "EMPLOYEE";
  const isAdmin = role === "TENANT_ADMIN";
  const isSecurity = role === "SECURITY";

  const activeItem =
    Object.entries(ROUTE_MAP)
      .sort(([, a], [, b]) => b.length - a.length)
      .find(([, path]) => pathname.startsWith(path))?.[0] ?? "dashboard";

  const handleNav = (id: string) => {
    const path = ROUTE_MAP[id];
    if (path) router.push(path);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
  };

  return (
    <>
      {/* ── Logout Dialog ─────────────────────────────────── */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out of your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sidebar collapsible="icon">
        {/* ── Logo ──────────────────────────────────────────── */}
        <SidebarHeader className="px-3 py-4">
          <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-[13px] font-semibold tracking-tight">SeatBook</span>
            )}
          </div>
        </SidebarHeader>

        {/* ── Nav ───────────────────────────────────────────── */}
        <SidebarContent>
          {isAdmin ? (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Overview</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={ADMIN_DASHBOARD}      activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Manage</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={ADMIN_MANAGE_NAV}     activeItem={activeItem} onNavigate={handleNav} />
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
                  <NavSection items={ADMIN_REPORTS_NAV}    activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={ADMIN_SETTINGS_NAV}   activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
            </>
          // ) : (
          //-----------------------security-----------------------------------------------------------------
          ) : isSecurity ? (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Overview</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={SECURITY_DASHBOARD}   activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Visitor Management</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={SECURITY_VISITOR_NAV} activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Actions</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={SECURITY_ACTIONS_NAV} activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
            </>
          //--------------------------------------------------------------------------------------------------  
          ) : (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Main</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={MAIN_NAV}     activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Office</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={OFFICE_NAV}   activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Personal</SidebarGroupLabel>
                <SidebarMenu>
                  <NavSection items={PERSONAL_NAV} activeItem={activeItem} onNavigate={handleNav} />
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        {/* ── Footer ────────────────────────────────────────── */}
        <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
          <div className={cn("flex items-center gap-2 relative", isCollapsed && "justify-center")}>
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(
                "flex items-center gap-2 w-full rounded-lg px-1 py-0.5 -mx-1",
                "hover:bg-sidebar-accent transition-all duration-150 active:scale-[0.98] outline-none",
                isCollapsed && "justify-center w-auto"
              )}>
                <div className="relative shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={initials} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-700">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>

                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[11.5px] font-medium truncate leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {user?.role && <RoleBadge role={user.role} />}
                        {displaySub && !user?.role && (
                          <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">{displaySub}</p>
                        )}
                      </div>
                    </div>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
                  </>
                )}
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-64 p-1.5">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={initials} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-700">
                            {initials}
                          </div>
                        )}
                        <div className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{displayName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user?.email ?? ""}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onMouseEnter={() => router.prefetch("/profile")}
                  onClick={() => router.push("/profile")}
                  className="gap-2.5 px-2 py-2 text-[12.5px] cursor-pointer"
                >
                  <UserRound className="w-4 h-4 text-gray-400" />
                  My Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onMouseEnter={() => router.prefetch("/notifications")}
                  onClick={() => router.push("/notifications")}
                  className="gap-2.5 px-2 py-2 text-[12.5px] cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-gray-400" />
                  Notifications
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setLogoutDialogOpen(true)}
                  className="gap-2.5 px-2 py-2 text-[12.5px] cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
