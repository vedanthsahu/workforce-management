// // "use client";

// // import { useRouter, usePathname } from "next/navigation";
// // import { useState } from "react";
// // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // import { Badge } from "@/components/ui/badge";
// // import {
// //   Sidebar,
// //   SidebarContent,
// //   SidebarFooter,
// //   SidebarGroup,
// //   SidebarGroupLabel,
// //   SidebarHeader,
// //   SidebarMenu,
// //   SidebarMenuButton,
// //   SidebarMenuItem,
// //   useSidebar,
// // } from "@/components/ui/sidebar";
// // import {
// //   LayoutDashboard,
// //   CalendarDays,
// //   BookOpen,
// //   Monitor,
// //   CalendarCheck,
// //   Search,
// //   Bell,
// //   Star,
// //   LogOut,
// // } from "lucide-react";
// // import { getInitials, type User } from "@/features/auth/types/auth.types";
// // import { cn } from "@/lib/utils";

// // // ─── Route map ────────────────────────────────────────────────────────────────

// // const ROUTE_MAP: Record<string, string> = {
// //   dashboard:     "/dashboard",
// //   book:          "/book",
// //   mybookings:    "/mybookings",
// //   team:          "/team",
// //   schedule:      "/schedule",
// //   find:          "/find",
// //   notifications: "/notifications",
// //   favourites:    "/favourites",
// // };

// // // ─── Nav config ───────────────────────────────────────────────────────────────

// // const MAIN_NAV = [
// //   { id: "dashboard",  label: "Dashboard",        icon: LayoutDashboard },
// //   { id: "book",       label: "Book a seat",      icon: CalendarDays },
// //   { id: "mybookings", label: "My bookings",      icon: BookOpen,   badge: 3,     badgeRed: true },
// //   { id: "team",       label: "Book for someone", icon: Monitor,    badge: "New", badgeGreen: true },
// //   { id: "schedule",   label: "My schedule",      icon: CalendarCheck },
// // ];

// // const OFFICE_NAV = [
// //   { id: "find", label: "Find teammates", icon: Search },
// // ];

// // const PERSONAL_NAV = [
// //   { id: "notifications", label: "Notifications", icon: Bell, badge: 2, badgeRed: true },
// //   { id: "favourites",    label: "Preferences",   icon: Star },
// // ];

// // // ─── Props — activeItem & onNavigate removed ──────────────────────────────────

// // interface AppSidebarProps {
// //   user: User | null;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // function resolveDisplayName(user: User): string {
// //   return user.display_name ?? user.full_name ?? user.name ?? "Loading...";
// // }

// // function resolveSubtitle(user: User): string {
// //   return user.job_title ?? user.role ?? user.email ?? "";
// // }

// // function resolveInitials(user: User): string {
// //   const name = user.display_name ?? user.full_name ?? user.name;
// //   return name ? getInitials(name) : (user.email?.[0]?.toUpperCase() ?? "?");
// // }

// // // ─── Logout Dialog ────────────────────────────────────────────────────────────

// // function LogoutDialog({
// //   open,
// //   displayName,
// //   initials,
// //   onConfirm,
// //   onCancel,
// //   isLoggingOut,
// // }: {
// //   open: boolean;
// //   displayName: string;
// //   initials: string;
// //   onConfirm: () => void;
// //   onCancel: () => void;
// //   isLoggingOut: boolean;
// // }) {
// //   if (!open) return null;

// //   return (
// //     <>
// //       {/* Backdrop */}
// //       <div
// //         className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-fade-in"
// //         onClick={onCancel}
// //       />

// //       {/* Dialog */}
// //       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
// //         <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl shadow-black/10 w-full max-w-[320px] overflow-hidden animate-dialog-in">

// //           {/* Top section */}
// //           <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center gap-3">
// //             {/* Avatar with ring pulse */}
// //             <div className="relative">
// //               <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] font-semibold text-indigo-700 ring-4 ring-indigo-50">
// //                 {initials}
// //               </div>
// //               <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
// //             </div>

// //             <div className="space-y-1">
// //               <p className="text-[14px] font-semibold text-gray-900">Sign out?</p>
// //               <p className="text-[12px] text-gray-400 leading-relaxed">
// //                Are you sure you want to sign out of your account?
// //               </p>
// //             </div>
// //           </div>

// //           {/* Divider */}
// //           <div className="h-px bg-gray-100 mx-5" />

// //           {/* Actions */}
// //           <div className="px-5 py-4 flex  gap-2">
// //             <button
// //               onClick={onConfirm}
// //               disabled={isLoggingOut}
// //               className={cn(
// //                 "w-full h-[38px] rounded-xl text-[12.5px] font-semibold transition-all duration-150",
// //                 "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]",
// //                 "flex items-center justify-center gap-2",
// //                 "disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100",
// //               )}
// //             >
// //               {isLoggingOut ? (
// //                 <>
// //                   <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
// //                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
// //                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
// //                   </svg>
// //                   Signing out…
// //                 </>
// //               ) : (
// //                 <>
// //                   <LogOut className="w-3.5 h-3.5" />
// //                   Yes, sign out
// //                 </>
// //               )}
// //             </button>

// //             <button
// //               onClick={onCancel}
// //               disabled={isLoggingOut}
// //               className="w-full h-[38px] rounded-xl text-[12.5px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
// //             >
// //               Stay signed in
// //             </button>
// //           </div>

// //         </div>
// //       </div>
// //     </>
// //   );
// // }
// // // ─── Component ────────────────────────────────────────────────────────────────

// // export function AppSidebar({ user }: AppSidebarProps) {
// //   const router   = useRouter();
// //   const pathname = usePathname();                        // ← active state from URL

// //   const [showLogout,  setShowLogout]  = useState(false);
// //   const [isLoggingOut, setIsLoggingOut] = useState(false);
// //   const { state } = useSidebar();
// //   const { logout } = useAuthContext();
// //   const isCollapsed = state === "collapsed";

// //   const initials    = user ? resolveInitials(user)    : "?";
// //   const displayName = user ? resolveDisplayName(user) : "Loading...";
// //   const displaySub  = user ? resolveSubtitle(user)    : "";

// //   // Derive active item from current URL — no prop needed
// //   const activeItem = Object.entries(ROUTE_MAP).find(
// //     ([, path]) => pathname.startsWith(path)
// //   )?.[0] ?? "dashboard";

// //   const handleNav = (id: string) => {
// //     const path = ROUTE_MAP[id];
// //     if (path) router.push(path);
// //   };

// //   const handleLogoutConfirm = async () => {
// //     setIsLoggingOut(true);
// //     await new Promise((r) => setTimeout(r, 700));
// //     logout();
// //   };

// //   return (
// //     <>
// //       <LogoutDialog
// //         open={showLogout}
// //         displayName={displayName}
// //         initials={initials}
// //         onConfirm={handleLogoutConfirm}
// //         onCancel={() => setShowLogout(false)}
// //         isLoggingOut={isLoggingOut}
// //       />

// //       <Sidebar collapsible="icon">
// //         {/* Logo */}
// //         <SidebarHeader className="px-3 py-4">
// //           <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
// //             <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
// //               <BookOpen className="w-3 h-3 text-white" />
// //             </div>
// //             {!isCollapsed && (
// //               <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">
// //                 SeatBook
// //               </span>
// //             )}
// //           </div>
// //         </SidebarHeader>

// //         <SidebarContent>
// //           {/* Main */}
// //           <SidebarGroup>
// //             <SidebarGroupLabel>Main</SidebarGroupLabel>
// //             <SidebarMenu>
// //               {MAIN_NAV.map((item) => (
// //                 <SidebarMenuItem key={item.id}>
// //                   <SidebarMenuButton
// //                     isActive={activeItem === item.id}
// //                     tooltip={item.label}
// //                     onClick={() => handleNav(item.id)}
// //                     className="justify-between"
// //                   >
// //                     <div className="flex items-center gap-2.5 min-w-0">
// //                       <item.icon className="w-4 h-4 shrink-0" />
// //                       <span className="truncate text-[12.5px]">{item.label}</span>
// //                     </div>
// //                     {item.badge !== undefined && (
// //                       <Badge
// //                         className={cn(
// //                           "text-[10px] h-[18px] min-w-[18px] px-1.5 rounded-full leading-none font-medium border-0 shrink-0",
// //                           item.badgeRed   && "bg-red-500 text-white hover:bg-red-500",
// //                           item.badgeGreen && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
// //                         )}
// //                       >
// //                         {item.badge}
// //                       </Badge>
// //                     )}
// //                   </SidebarMenuButton>
// //                 </SidebarMenuItem>
// //               ))}
// //             </SidebarMenu>
// //           </SidebarGroup>

// //           {/* Office */}
// //           <SidebarGroup>
// //             <SidebarGroupLabel>Office</SidebarGroupLabel>
// //             <SidebarMenu>
// //               {OFFICE_NAV.map((item) => (
// //                 <SidebarMenuItem key={item.id}>
// //                   <SidebarMenuButton
// //                     isActive={activeItem === item.id}
// //                     tooltip={item.label}
// //                     onClick={() => handleNav(item.id)}
// //                   >
// //                     <item.icon className="w-4 h-4 shrink-0" />
// //                     <span className="truncate text-[12.5px]">{item.label}</span>
// //                   </SidebarMenuButton>
// //                 </SidebarMenuItem>
// //               ))}
// //             </SidebarMenu>
// //           </SidebarGroup>

// //           {/* Personal */}
// //           <SidebarGroup>
// //             <SidebarGroupLabel>Personal</SidebarGroupLabel>
// //             <SidebarMenu>
// //               {PERSONAL_NAV.map((item) => (
// //                 <SidebarMenuItem key={item.id}>
// //                   <SidebarMenuButton
// //                     isActive={activeItem === item.id}
// //                     tooltip={item.label}
// //                     onClick={() => handleNav(item.id)}
// //                     className="justify-between"
// //                   >
// //                     <div className="flex items-center gap-2.5 min-w-0">
// //                       <item.icon className="w-4 h-4 shrink-0" />
// //                       <span className="truncate text-[12.5px]">{item.label}</span>
// //                     </div>
// //                     {item.badge !== undefined && (
// //                       <Badge className="text-[10px] h-[18px] min-w-[18px] px-1.5 rounded-full leading-none font-medium border-0 bg-red-500 text-white hover:bg-red-500 shrink-0">
// //                         {item.badge}
// //                       </Badge>
// //                     )}
// //                   </SidebarMenuButton>
// //                 </SidebarMenuItem>
// //               ))}
// //             </SidebarMenu>
// //           </SidebarGroup>
// //         </SidebarContent>

// //         {/* User footer */}
// //         <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
// //           <div className={cn("flex items-center gap-2 relative", isCollapsed && "justify-center")}>
// //             <div className="relative shrink-0">
// //               <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-700">
// //                 {initials}
// //               </div>
// //               <div className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
// //             </div>

// //             {!isCollapsed && (
// //               <>
// //                 <div className="flex-1 min-w-0">
// //                   <p className="text-[11.5px] font-medium text-sidebar-foreground truncate leading-tight">
// //                     {displayName}
// //                   </p>
// //                   {displaySub && (
// //                     <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
// //                       {displaySub}
// //                     </p>
// //                   )}
// //                 </div>
// //                 <button
// //                   onClick={() => setShowLogout(true)}
// //                   className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sidebar-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all duration-150 active:scale-90"
// //                   title="Sign out"
// //                 >
// //                   <LogOut className="w-3.5 h-3.5" />
// //                 </button>
// //               </>
// //             )}

// //             {isCollapsed && (
// //               <button
// //                 onClick={() => setShowLogout(true)}
// //                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
// //                 title="Sign out"
// //               />
// //             )}
// //           </div>
// //         </SidebarFooter>
// //       </Sidebar>
// //     </>
// //   );
// // }


// "use client";

// import { useRouter, usePathname } from "next/navigation";
// import { useState } from "react";
// import { useAuthContext } from "@/features/auth/context/AuthContext";
// import { Badge } from "@/components/ui/badge";
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarGroup,
//   SidebarGroupLabel,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   useSidebar,
// } from "@/components/ui/sidebar";
// import {
//   LayoutDashboard,
//   CalendarDays,
//   BookOpen,
//   Monitor,
//   CalendarCheck,
//   Search,
//   Bell,
//   Star,
//   LogOut,
//   Settings,
//   Users,
//   Building2,
//   BarChart3,
//   ShieldCheck,
//   UserCog,
// } from "lucide-react";
// import { getInitials, type User } from "@/features/auth/types/auth.types";
// import { cn } from "@/lib/utils";

// // ─── Role types ───────────────────────────────────────────────────────────────

// /**
//  * Known roles returned by /auth/me → role field.
//  * Extend this union as new roles are added in the backend.
//  */
// export type AppRole =
//   | "ADMIN"
//   | "MANAGER"
//   | "EMPLOYEE"
//   | "TALENT"
//   | "RECEPTIONIST"
//   | "FACILITIES"
//   | string; // allow unknown future roles

// // ─── Nav item type ────────────────────────────────────────────────────────────

// interface NavItem {
//   id: string;
//   label: string;
//   icon: React.ElementType;
//   badge?: number | string;
//   badgeRed?: boolean;
//   badgeGreen?: boolean;
//   /** Roles that can see this item. Omit = visible to all roles. */
//   allowedRoles?: AppRole[];
//   /** Specific permission string required (future use). Omit = no permission check. */
//   requiredPermission?: string;
// }

// // ─── Route map ────────────────────────────────────────────────────────────────

// const ROUTE_MAP: Record<string, string> = {
//   dashboard:     "/dashboard",
//   book:          "/book",
//   mybookings:    "/mybookings",
//   team:          "/team",
//   schedule:      "/schedule",
//   find:          "/find",
//   notifications: "/notifications",
//   favourites:    "/favourites",
//   // Manager / Admin extras
//   reports:       "/reports",
//   manage_users:  "/admin/users",
//   manage_spaces: "/admin/spaces",
//   admin:         "/admin",
//   // Facilities
//   facilities:    "/facilities",
// };

// // ─── Nav config — all possible items ─────────────────────────────────────────

// const MAIN_NAV: NavItem[] = [
//   {
//     id: "dashboard",
//     label: "Dashboard",
//     icon: LayoutDashboard,
//     // Everyone gets a dashboard
//   },
//   {
//     id: "book",
//     label: "Book a seat",
//     icon: CalendarDays,
//     // TALENT can book; RECEPTIONIST / FACILITIES typically don't self-book
//     allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE", "TALENT"],
//   },
//   {
//     id: "mybookings",
//     label: "My bookings",
//     icon: BookOpen,
//     badge: 3,
//     badgeRed: true,
//     allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE", "TALENT"],
//   },
//   {
//     id: "team",
//     label: "Book for someone",
//     icon: Monitor,
//     badge: "New",
//     badgeGreen: true,
//     // Only managers / admins book on behalf of others
//     allowedRoles: ["ADMIN", "MANAGER"],
//   },
//   {
//     id: "schedule",
//     label: "My schedule",
//     icon: CalendarCheck,
//     allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE", "TALENT"],
//   },
// ];

// const OFFICE_NAV: NavItem[] = [
//   {
//     id: "find",
//     label: "Find teammates",
//     icon: Search,
//     allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE", "TALENT"],
//   },
// ];

// const PERSONAL_NAV: NavItem[] = [
//   {
//     id: "notifications",
//     label: "Notifications",
//     icon: Bell,
//     badge: 2,
//     badgeRed: true,
//   },
//   {
//     id: "favourites",
//     label: "Preferences",
//     icon: Star,
//     allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE", "TALENT"],
//   },
// ];

// /**
//  * Management nav — shown only to ADMIN / MANAGER.
//  * ADMIN sees everything; MANAGER sees reports + manage_users.
//  */
// const MANAGEMENT_NAV: NavItem[] = [
//   {
//     id: "reports",
//     label: "Reports",
//     icon: BarChart3,
//     allowedRoles: ["ADMIN", "MANAGER"],
//   },
//   {
//     id: "manage_users",
//     label: "Manage users",
//     icon: UserCog,
//     allowedRoles: ["ADMIN", "MANAGER"],
//   },
//   {
//     id: "manage_spaces",
//     label: "Manage spaces",
//     icon: Building2,
//     allowedRoles: ["ADMIN"],
//   },
//   {
//     id: "admin",
//     label: "Admin panel",
//     icon: ShieldCheck,
//     allowedRoles: ["ADMIN"],
//   },
// ];

// /**
//  * Facilities nav — shown only to FACILITIES / ADMIN.
//  */
// const FACILITIES_NAV: NavItem[] = [
//   {
//     id: "facilities",
//     label: "Facilities",
//     icon: Building2,
//     allowedRoles: ["ADMIN", "FACILITIES"],
//   },
// ];

// // ─── Role → friendly label map ────────────────────────────────────────────────

// const ROLE_LABELS: Record<string, string> = {
//   ADMIN:        "Administrator",
//   MANAGER:      "Manager",
//   EMPLOYEE:     "Employee",
//   TALENT:       "Talent",
//   RECEPTIONIST: "Receptionist",
//   FACILITIES:   "Facilities",
// };

// function getRoleLabel(role: string): string {
//   return ROLE_LABELS[role] ?? role;
// }

// // ─── Permission helper ────────────────────────────────────────────────────────

// /**
//  * Returns true if the item should be shown given the user's role + permissions.
//  *
//  * Rules:
//  *  1. If allowedRoles is set, the user's role must be in that list.
//  *  2. If requiredPermission is set, the user's permissions array must include it.
//  *  3. Both checks must pass when both are set.
//  */
// function canSeeItem(item: NavItem, role: AppRole, permissions: string[]): boolean {
//   if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
//   if (item.requiredPermission && !permissions.includes(item.requiredPermission)) return false;
//   return true;
// }

// // ─── Props ────────────────────────────────────────────────────────────────────

// interface AppSidebarProps {
//   user: User | null;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function resolveDisplayName(user: User): string {
//   return user.display_name ?? user.full_name ?? user.name ?? "Loading...";
// }

// function resolveSubtitle(user: User): string {
//   // Prefer the friendly role label over job_title / email
//   if (user.role) return getRoleLabel(user.role);
//   return user.job_title ?? user.role ?? user.email ?? "";
// }

// function resolveInitials(user: User): string {
//   const name = user.display_name ?? user.full_name ?? user.name;
//   return name ? getInitials(name) : (user.email?.[0]?.toUpperCase() ?? "?");
// }

// // ─── Logout Dialog ────────────────────────────────────────────────────────────

// function LogoutDialog({
//   open,
//   displayName,
//   initials,
//   onConfirm,
//   onCancel,
//   isLoggingOut,
// }: {
//   open: boolean;
//   displayName: string;
//   initials: string;
//   onConfirm: () => void;
//   onCancel: () => void;
//   isLoggingOut: boolean;
// }) {
//   if (!open) return null;

//   return (
//     <>
//       <div
//         className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-fade-in"
//         onClick={onCancel}
//       />
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
//         <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl shadow-black/10 w-full max-w-[320px] overflow-hidden animate-dialog-in">
//           <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center gap-3">
//             <div className="relative">
//               <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] font-semibold text-indigo-700 ring-4 ring-indigo-50">
//                 {initials}
//               </div>
//               <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
//             </div>
//             <div className="space-y-1">
//               <p className="text-[14px] font-semibold text-gray-900">Sign out?</p>
//               <p className="text-[12px] text-gray-400 leading-relaxed">
//                 Are you sure you want to sign out of your account?
//               </p>
//             </div>
//           </div>
//           <div className="h-px bg-gray-100 mx-5" />
//           <div className="px-5 py-4 flex gap-2">
//             <button
//               onClick={onConfirm}
//               disabled={isLoggingOut}
//               className={cn(
//                 "w-full h-[38px] rounded-xl text-[12.5px] font-semibold transition-all duration-150",
//                 "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]",
//                 "flex items-center justify-center gap-2",
//                 "disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100",
//               )}
//             >
//               {isLoggingOut ? (
//                 <>
//                   <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
//                   </svg>
//                   Signing out…
//                 </>
//               ) : (
//                 <>
//                   <LogOut className="w-3.5 h-3.5" />
//                   Yes, sign out
//                 </>
//               )}
//             </button>
//             <button
//               onClick={onCancel}
//               disabled={isLoggingOut}
//               className="w-full h-[38px] rounded-xl text-[12.5px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
//             >
//               Stay signed in
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Role badge pill ──────────────────────────────────────────────────────────

// const ROLE_BADGE_STYLES: Record<string, string> = {
//   ADMIN:        "bg-rose-50 text-rose-600 ring-rose-200",
//   MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
//   EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
//   TALENT:       "bg-teal-50 text-teal-600 ring-teal-200",
//   RECEPTIONIST: "bg-amber-50 text-amber-600 ring-amber-200",
//   FACILITIES:   "bg-orange-50 text-orange-600 ring-orange-200",
// };

// function RoleBadge({ role }: { role: string }) {
//   const styles = ROLE_BADGE_STYLES[role] ?? "bg-gray-50 text-gray-500 ring-gray-200";
//   return (
//     <span
//       className={cn(
//         "inline-flex items-center px-1.5 py-[2px] rounded-md text-[9px] font-semibold uppercase tracking-wide ring-1",
//         styles,
//       )}
//     >
//       {getRoleLabel(role)}
//     </span>
//   );
// }

// // ─── Nav section renderer ─────────────────────────────────────────────────────

// function NavSection({
//   items,
//   activeItem,
//   role,
//   permissions,
//   onNavigate,
// }: {
//   items: NavItem[];
//   activeItem: string;
//   role: AppRole;
//   permissions: string[];
//   onNavigate: (id: string) => void;
// }) {
//   const visible = items.filter((item) => canSeeItem(item, role, permissions));
//   if (visible.length === 0) return null;

//   return (
//     <>
//       {visible.map((item) => (
//         <SidebarMenuItem key={item.id}>
//           <SidebarMenuButton
//             isActive={activeItem === item.id}
//             tooltip={item.label}
//             onClick={() => onNavigate(item.id)}
//             className="justify-between"
//           >
//             <div className="flex items-center gap-2.5 min-w-0">
//               <item.icon className="w-4 h-4 shrink-0" />
//               <span className="truncate text-[12.5px]">{item.label}</span>
//             </div>
//             {item.badge !== undefined && (
//               <Badge
//                 className={cn(
//                   "text-[10px] h-[18px] min-w-[18px] px-1.5 rounded-full leading-none font-medium border-0 shrink-0",
//                   item.badgeRed   && "bg-red-500 text-white hover:bg-red-500",
//                   item.badgeGreen && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
//                 )}
//               >
//                 {item.badge}
//               </Badge>
//             )}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
//       ))}
//     </>
//   );
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export function AppSidebar({ user }: AppSidebarProps) {
//   const router   = useRouter();
//   const pathname = usePathname();

//   const [showLogout,   setShowLogout]   = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);
//   const { state } = useSidebar();
//   const { logout } = useAuthContext();
//   const isCollapsed = state === "collapsed";

//   // ── Resolve user identity ──────────────────────────────────────────────────
//   const initials    = user ? resolveInitials(user)    : "?";
//   const displayName = user ? resolveDisplayName(user) : "Loading...";
//   const displaySub  = user ? resolveSubtitle(user)    : "";

//   // ── Role & permissions ─────────────────────────────────────────────────────
//   const role: AppRole    = user?.role ?? "EMPLOYEE";
//   const permissions: string[] = (user as any)?.permissions ?? [];

//   // ── Active item from URL ───────────────────────────────────────────────────
//   const activeItem = Object.entries(ROUTE_MAP).find(
//     ([, path]) => pathname.startsWith(path)
//   )?.[0] ?? "dashboard";

//   const handleNav = (id: string) => {
//     const path = ROUTE_MAP[id];
//     if (path) router.push(path);
//   };

//   const handleLogoutConfirm = async () => {
//     setIsLoggingOut(true);
//     await new Promise((r) => setTimeout(r, 700));
//     logout();
//   };

//   // ── Derived visibility flags ───────────────────────────────────────────────
//   const hasManagementSection = MANAGEMENT_NAV.some((i) => canSeeItem(i, role, permissions));
//   const hasFacilitiesSection = FACILITIES_NAV.some((i) => canSeeItem(i, role, permissions));

//   return (
//     <>
//       <LogoutDialog
//         open={showLogout}
//         displayName={displayName}
//         initials={initials}
//         onConfirm={handleLogoutConfirm}
//         onCancel={() => setShowLogout(false)}
//         isLoggingOut={isLoggingOut}
//       />

//       <Sidebar collapsible="icon">
//         {/* Logo */}
//         <SidebarHeader className="px-3 py-4">
//           <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
//             <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
//               <BookOpen className="w-3 h-3 text-white" />
//             </div>
//             {!isCollapsed && (
//               <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">
//                 SeatBook
//               </span>
//             )}
//           </div>
//         </SidebarHeader>

//         <SidebarContent>
//           {/* ── Main ──────────────────────────────────────────────────────── */}
//           <SidebarGroup>
//             <SidebarGroupLabel>Main</SidebarGroupLabel>
//             <SidebarMenu>
//               <NavSection
//                 items={MAIN_NAV}
//                 activeItem={activeItem}
//                 role={role}
//                 permissions={permissions}
//                 onNavigate={handleNav}
//               />
//             </SidebarMenu>
//           </SidebarGroup>

//           {/* ── Office ────────────────────────────────────────────────────── */}
//           <SidebarGroup>
//             <SidebarGroupLabel>Office</SidebarGroupLabel>
//             <SidebarMenu>
//               <NavSection
//                 items={OFFICE_NAV}
//                 activeItem={activeItem}
//                 role={role}
//                 permissions={permissions}
//                 onNavigate={handleNav}
//               />
//             </SidebarMenu>
//           </SidebarGroup>

//           {/* ── Personal ──────────────────────────────────────────────────── */}
//           <SidebarGroup>
//             <SidebarGroupLabel>Personal</SidebarGroupLabel>
//             <SidebarMenu>
//               <NavSection
//                 items={PERSONAL_NAV}
//                 activeItem={activeItem}
//                 role={role}
//                 permissions={permissions}
//                 onNavigate={handleNav}
//               />
//             </SidebarMenu>
//           </SidebarGroup>

//           {/* ── Management (ADMIN / MANAGER only) ─────────────────────────── */}
//           {hasManagementSection && (
//             <SidebarGroup>
//               <SidebarGroupLabel>Management</SidebarGroupLabel>
//               <SidebarMenu>
//                 <NavSection
//                   items={MANAGEMENT_NAV}
//                   activeItem={activeItem}
//                   role={role}
//                   permissions={permissions}
//                   onNavigate={handleNav}
//                 />
//               </SidebarMenu>
//             </SidebarGroup>
//           )}

//           {/* ── Facilities (ADMIN / FACILITIES only) ──────────────────────── */}
//           {hasFacilitiesSection && (
//             <SidebarGroup>
//               <SidebarGroupLabel>Facilities</SidebarGroupLabel>
//               <SidebarMenu>
//                 <NavSection
//                   items={FACILITIES_NAV}
//                   activeItem={activeItem}
//                   role={role}
//                   permissions={permissions}
//                   onNavigate={handleNav}
//                 />
//               </SidebarMenu>
//             </SidebarGroup>
//           )}
//         </SidebarContent>

//         {/* ── User footer ────────────────────────────────────────────────── */}
//         <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
//           <div className={cn("flex items-center gap-2 relative", isCollapsed && "justify-center")}>
//             <div className="relative shrink-0">
//               <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-700">
//                 {initials}
//               </div>
//               <div className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
//             </div>

//             {!isCollapsed && (
//               <>
//                 <div className="flex-1 min-w-0">
//                   <p className="text-[11.5px] font-medium text-sidebar-foreground truncate leading-tight">
//                     {displayName}
//                   </p>
//                   <div className="flex items-center gap-1.5 mt-0.5">
//                     {user?.role && <RoleBadge role={user.role} />}
//                     {displaySub && !user?.role && (
//                       <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">
//                         {displaySub}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => setShowLogout(true)}
//                   className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sidebar-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all duration-150 active:scale-90"
//                   title="Sign out"
//                 >
//                   <LogOut className="w-3.5 h-3.5" />
//                 </button>
//               </>
//             )}

//             {isCollapsed && (
//               <button
//                 onClick={() => setShowLogout(true)}
//                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//                 title="Sign out"
//               />
//             )}
//           </div>
//         </SidebarFooter>
//       </Sidebar>
//     </>
//   );
// }

"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthContext } from "@/features/auth/context/AuthContext";
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
  Settings,
  Users,
  Building2,
  BarChart3,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { getInitials, type User } from "@/features/auth/types/auth.types";
import { cn } from "@/lib/utils";

// ─── Role types ───────────────────────────────────────────────────────────────

export type AppRole =
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "TALENT"
  | "RECEPTIONIST"
  | "FACILITIES"
  | string;

// ─── Permission strings ───────────────────────────────────────────────────────
// These map 1-to-1 with what the backend returns in user.permissions[].
// Add new ones here as the backend grows.

export type AppPermission =
  | "booking:book_for_someone"
  | "booking:cancel_own"
  | "booking:view_own"
  | "dashboard:view"
  | "seat:book_self"
  | "teammate:view"
  | "report:view"
  | "user:manage"
  | "space:manage"
  | "admin:panel"
  | "facility:manage"
  | string; // forward-compatible

// ─── Nav item type ────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeRed?: boolean;
  badgeGreen?: boolean;
  /**
   * Roles that can see this item.
   * Omit = visible to all roles (subject to permission check).
   */
  allowedRoles?: AppRole[];
  /**
   * Permission string required to see this item.
   * If set, the user's permissions[] MUST include this value.
   * This takes priority over allowedRoles for fine-grained access.
   */
  requiredPermission?: AppPermission;
}

// ─── Route map ────────────────────────────────────────────────────────────────

const ROUTE_MAP: Record<string, string> = {
  dashboard:     "/dashboard",
  book:          "/book",
  mybookings:    "/mybookings",
  team:          "/team",
  schedule:      "/schedule",
  find:          "/find",
  notifications: "/notifications",
  favourites:    "/favourites",
  reports:       "/reports",
  manage_users:  "/admin/users",
  manage_spaces: "/admin/spaces",
  admin:         "/admin",
  facilities:    "/facilities",

  //  ADMIN ROUTES--------------------------------

offices: "/admin/offices",
floors: "/admin/floors",
layouts: "/admin/layouts",
seats: "/admin/seats",
amenities: "/admin/amenities",
seatstatus: "/admin/seat-status",

bookings: "/admin/bookings",
users: "/admin/users",

occupancy: "/admin/occupancy",
utilization: "/admin/utilization",
audit: "/admin/audit",

settings: "/admin/settings", // Admin settings page  13/05 chandana
  

};

// ─── Nav config ───────────────────────────────────────────────────────────────

const MAIN_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiredPermission: "dashboard:view",
  },
  {
    id: "book",
    label: "Book a seat",
    icon: CalendarDays,
    requiredPermission: "seat:book_self",
  },
  {
    id: "mybookings",
    label: "My bookings",
    icon: BookOpen,
    badge: 3,
    badgeRed: true,
    requiredPermission: "booking:view_own",
  },
  {
    id: "team",
    label: "Book for someone",
    icon: Monitor,
    badge: "New",
    badgeGreen: true,
    // This is the key item — only shown when the user has this explicit permission.
    // A TALENT user with "booking:book_for_someone" WILL see it.
    // A MANAGER without the permission won't (unusual but correct).
    requiredPermission: "booking:book_for_someone",
  },
  {
    id: "schedule",
    label: "My schedule",
    icon: CalendarCheck,
    // No specific permission yet — fall back to role guard
    allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE", "TALENT"],
  },
const MAIN_NAV = [
  { id: "dashboard",  label: "Dashboard",        icon: LayoutDashboard },
  { id: "book",       label: "Book a seat",      icon: CalendarDays },
  { id: "mybookings", label: "My bookings",      icon: BookOpen,   badge: 3,     badgeRed: true },
  { id: "team",       label: "Book for someone", icon: Monitor,    badge: "New", badgeGreen: true },
  { id: "schedule",   label: "My schedule",      icon: CalendarCheck },

];

const OFFICE_NAV: NavItem[] = [
  {
    id: "find",
    label: "Find teammates",
    icon: Search,
    requiredPermission: "teammate:view",
  },
];

const PERSONAL_NAV: NavItem[] = [
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    badge: 2,
    badgeRed: true,
    // Notifications are always visible
  },
  {
    id: "favourites",
    label: "Preferences",
    icon: Star,
    requiredPermission: "booking:view_own",
  },
];

const MANAGEMENT_NAV: NavItem[] = [
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    // Prefer permission check; fall back to role for backwards compat
    allowedRoles: ["ADMIN", "MANAGER"],
    requiredPermission: "report:view",
  },
  {
    id: "manage_users",
    label: "Manage users",
    icon: UserCog,
    allowedRoles: ["ADMIN", "MANAGER"],
    requiredPermission: "user:manage",
  },
  {
    id: "manage_spaces",
    label: "Manage spaces",
    icon: Building2,
    allowedRoles: ["ADMIN"],
    requiredPermission: "space:manage",
  },
  {
    id: "admin",
    label: "Admin panel",
    icon: ShieldCheck,
    allowedRoles: ["ADMIN"],
    requiredPermission: "admin:panel",
  },
];

const FACILITIES_NAV: NavItem[] = [
  {
    id: "facilities",
    label: "Facilities",
    icon: Building2,
    allowedRoles: ["ADMIN", "FACILITIES"],
    requiredPermission: "facility:manage",
  },
];

// ─── Role → friendly label ────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMIN:        "Administrator",
  MANAGER:      "Manager",
  EMPLOYEE:     "Employee",
  TALENT:       "Talent",
  RECEPTIONIST: "Receptionist",
  FACILITIES:   "Facilities",
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

// ─── Permission helper ────────────────────────────────────────────────────────

/**
 * Determines whether a nav item is visible for a given user.
 *
 * Logic (both checks must pass when set):
 *
 * 1. requiredPermission — if set, the user's permissions[] MUST contain it.
 *    This is the fine-grained check and supersedes role guarding for that item.
 *
 * 2. allowedRoles — if set AND requiredPermission is NOT set (or passes),
 *    the user's role must be in the list.
 *    This is the coarse role guard used for items without a specific permission.
 *
 * Why this ordering?
 * A TALENT user can have "booking:book_for_someone" even though the old
 * allowedRoles list was ["ADMIN", "MANAGER"].  Permission wins over role.
 */
function canSeeItem(
  item: NavItem,
  role: AppRole,
  permissions: string[],
): boolean {
  // Permission check — takes priority
  if (item.requiredPermission) {
    return permissions.includes(item.requiredPermission);
  }

  // Role check — only applied when no permission is specified
  if (item.allowedRoles) {
    return item.allowedRoles.includes(role);
  }

  // No restriction — always visible
  return true;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  user: User | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveDisplayName(user: User): string {
  return user.display_name ?? user.full_name ?? user.name ?? "Loading...";
}

function resolveSubtitle(user: User): string {
  if (user.role) return getRoleLabel(user.role);
  return user.job_title ?? user.role ?? user.email ?? "";
}

function resolveInitials(user: User): string {
  const name = user.display_name ?? user.full_name ?? user.name;
  return name ? getInitials(name) : (user.email?.[0]?.toUpperCase() ?? "?");
}

// ─── Logout Dialog ────────────────────────────────────────────────────────────

function LogoutDialog({
  open,
  displayName,
  initials,
  onConfirm,
  onCancel,
  isLoggingOut,
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
                "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]",
                "flex items-center justify-center gap-2",
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
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  Yes, sign out
                </>
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

// ─── Role badge pill ──────────────────────────────────────────────────────────

const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN:        "bg-rose-50 text-rose-600 ring-rose-200",
  MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
  EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
  TALENT:       "bg-teal-50 text-teal-600 ring-teal-200",
  RECEPTIONIST: "bg-amber-50 text-amber-600 ring-amber-200",
  FACILITIES:   "bg-orange-50 text-orange-600 ring-orange-200",
};

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

// ─── Nav section renderer ─────────────────────────────────────────────────────

function NavSection({
  items,
  activeItem,
  role,
  permissions,
  onNavigate,
}: {
  items: NavItem[];
  activeItem: string;
  role: AppRole;
  permissions: string[];
  onNavigate: (id: string) => void;
}) {
  const visible = items.filter((item) => canSeeItem(item, role, permissions));
  if (visible.length === 0) return null;

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

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({ user }: AppSidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
export function AppSidebar({  }: AppSidebarProps) {
 const router   = useRouter();
 const pathname = usePathname();                        // ← active state from URL
//  const isAdmin = user?.role === "admin"; //  check for admin role to conditionally render admin-specific items --- 13/5 chandana 
const isAdmin = pathname.startsWith("/admin");// This is hardcoded,not from db 
//  const isAdmin =user?.role === "TENANT_ADMIN"|| user?.permissions?.includes("layout:upload") ;
// const isAdminRoute = pathname.startsWith("/admin");
//  const isAdminRoute = pathname.startsWith("/admin");
const { user } = useAuthContext();
const currentUser = user ?? null;


// useEffect(() => {
//   if (!isAdmin && isAdminRoute) {
//     router.push("/dashboard");
//   }
// }, [isAdmin, isAdminRoute, router]);


  const [showLogout,   setShowLogout]   = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { state } = useSidebar();
  const { logout } = useAuthContext();
  const isCollapsed = state === "collapsed";

  const initials    = user ? resolveInitials(user)    : "?";
  const displayName = user ? resolveDisplayName(user) : "Loading...";
  const displaySub  = user ? resolveSubtitle(user)    : "";

  // ── Role & permissions ─────────────────────────────────────────────────────
  const role: AppRole         = user?.role ?? "EMPLOYEE";
  // Cast: the User type doesn't include permissions yet — this is safe at runtime
  // because the /auth/me response always sends it. Add it to your User type to
  // remove this cast.
  const permissions: string[] = (user as any)?.permissions ?? [];

  // ── Active item from URL ───────────────────────────────────────────────────
  const activeItem = Object.entries(ROUTE_MAP).find(
    ([, path]) => pathname.startsWith(path)
  )?.[0] ?? "dashboard";

  const handleNav = (id: string) => {
    const path = ROUTE_MAP[id];
    if (path) router.push(path);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 700));
    logout();
  };

  // ── Section visibility ─────────────────────────────────────────────────────
  // A section header only renders if at least one item in it is visible.
  const hasManagementSection = MANAGEMENT_NAV.some((i) => canSeeItem(i, role, permissions));
  const hasFacilitiesSection = FACILITIES_NAV.some((i) => canSeeItem(i, role, permissions));

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
        {/* Logo */}
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

        <SidebarContent>
          {/* Main */}
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarMenu>
              <NavSection
                items={MAIN_NAV}
                activeItem={activeItem}
                role={role}
                permissions={permissions}
                onNavigate={handleNav}
              />
            </SidebarMenu>
          </SidebarGroup>

          {/* Office */}
          <SidebarGroup>
            <SidebarGroupLabel>Office</SidebarGroupLabel>
            <SidebarMenu>
              <NavSection
                items={OFFICE_NAV}
                activeItem={activeItem}
                role={role}
                permissions={permissions}
                onNavigate={handleNav}
              />
            </SidebarMenu>
          </SidebarGroup>

          {/* Personal */}
          <SidebarGroup>
            <SidebarGroupLabel>Personal</SidebarGroupLabel>
            <SidebarMenu>
              <NavSection
                items={PERSONAL_NAV}
                activeItem={activeItem}
                role={role}
                permissions={permissions}
                onNavigate={handleNav}
              />
            </SidebarMenu>
          </SidebarGroup>

          {/* Management — only if user has at least one visible management item */}
          {hasManagementSection && (
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection
                  items={MANAGEMENT_NAV}
                  activeItem={activeItem}
                  role={role}
                  permissions={permissions}
                  onNavigate={handleNav}
                />
              </SidebarMenu>
            </SidebarGroup>
          )}

          {/* Facilities */}
          {hasFacilitiesSection && (
            <SidebarGroup>
              <SidebarGroupLabel>Facilities</SidebarGroupLabel>
              <SidebarMenu>
                <NavSection
                  items={FACILITIES_NAV}
                  activeItem={activeItem}
                  role={role}
                  permissions={permissions}
                  onNavigate={handleNav}
                />
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
              {PERSONAL_NAV.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeItem === item.id}
                    tooltip={item.label}
                    onClick={() => handleNav(item.id)}
                    className="justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate text-[12.5px]">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <Badge className="text-[10px] h-[18px] min-w-[18px] px-1.5 rounded-full leading-none font-medium border-0 bg-red-500 text-white hover:bg-red-500 shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>  */} 

  {isAdmin ? (
    <>
      {/* Dashboard */}
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeItem === "dashboard"}
              onClick={() => handleNav("dashboard")}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* MANAGE */}
      <SidebarGroup>
        <SidebarGroupLabel>MANAGE</SidebarGroupLabel>
        <SidebarMenu>
          {ADMIN_NAV.manage
  .filter((item) => {
    const permissionMap: Record<string, string> = {
      offices: "floor:view",
      floors: "floor:view",
      layouts: "layout:upload",
      seats: "seat:create",
      amenities: "floor:manage",
      seatstatus: "seat:update",
    };

    return user?.permissions?.includes(permissionMap[item.id]);
  })
  .map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => handleNav(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* OPERATIONS */}
      <SidebarGroup>
        <SidebarGroupLabel>OPERATIONS</SidebarGroupLabel>
        <SidebarMenu>
          {ADMIN_NAV.operations
  .filter((item) => {
    const permissionMap: Record<string, string> = {
      bookings: "booking:view_all",
      users: "user:view",
      notifications: "dashboard:view",
    };

    return user?.permissions?.includes(permissionMap[item.id]);
  })
  .map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => handleNav(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* REPORTS */}
      <SidebarGroup>
        <SidebarGroupLabel>REPORTS</SidebarGroupLabel>
        <SidebarMenu>
          {ADMIN_NAV.reports
  .filter((item) => {
    const permissionMap: Record<string, string> = {
      occupancy: "dashboard:view",
      utilization: "dashboard:view",
      audit: "dashboard:view",
    };

    return user?.permissions?.includes(permissionMap[item.id]);
  })
  .map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => handleNav(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* SETTINGS */}
      <SidebarGroup>
        <SidebarGroupLabel>SETTINGS</SidebarGroupLabel>
        <SidebarMenu>
          {ADMIN_NAV.settings
  .filter((item) => {
    const permissionMap: Record<string, string> = {
      settings: "user:manage",
    };

    return user?.permissions?.includes(permissionMap[item.id]);
  })
  .map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => handleNav(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  ) : (
    <>
      {/* EXISTING EMPLOYEE SIDEBAR */}

      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarMenu>
          {MAIN_NAV.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                tooltip={item.label}
                onClick={() => handleNav(item.id)}
                className="justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Office</SidebarGroupLabel>
        <SidebarMenu>
          {OFFICE_NAV.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => handleNav(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Personal</SidebarGroupLabel>
        <SidebarMenu>
          {PERSONAL_NAV.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => handleNav(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )}
</SidebarContent>   
{/* Conditionally render admin or employee navigation groups based on user role */}

        {/* User footer */}
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