"use client";

import { Bell, Menu } from "lucide-react";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { getInitials } from "@/features/auth/types/auth.types";
import { SidebarTrigger } from "@/components/ui/sidebar";  // ← ADD THIS

export default function AdminTopbar() {
  const { user } = useAuthContext();

  const name = user?.display_name || user?.full_name || user?.name || "Loading...";
  const role = user?.role === "TENANT_ADMIN" ? "Admin" : "Employee";
  const initials = name !== "Loading..." ? getInitials(name) : "?";

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6">

      {/* LEFT SIDE — hamburger (only shows on mobile) */}
      <SidebarTrigger className="md:hidden" />   {/* ← ADD THIS */}

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        </div>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium text-sm">
            {initials}
          </div>
          {/* Hide name/role text on very small screens */}
          <div className="hidden sm:block text-sm">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <span className="text-xs hidden sm:block">▼</span>
        </div>
      </div>

    </div>
  );
}