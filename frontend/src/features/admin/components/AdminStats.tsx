"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  Building2,
  Layers,
  Armchair,
  Ban,
  UserRound,
  UserRoundPlus,
  Info,
} from "lucide-react";

import type { DashboardSummary } from "../types/admin.types";
import { STAT_ACCENTS } from "../utils/dashboard.utils";
import type { StatAccent as Accent } from "../utils/dashboard.utils";

const ACCENTS = STAT_ACCENTS;

type Props = {
  data: DashboardSummary | null;
  selectedDate: string;
};

export default function AdminStats({ data, selectedDate }: Props) {
  const router = useRouter();
  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const stats = [
    {
      title: "Total Offices",
      value: data?.total_offices ?? "-",
      subtitle: "All locations",
      icon: Building2,
      accent: "blue" as Accent,
      href: "/admin/offices",
    },
    {
      title: "Total Floors",
      value: data?.total_floors ?? "-",
      subtitle: "Across all offices",
      icon: Layers,
      accent: "green" as Accent,
      href: "/admin/floors",
    },
    {
      title: "Total Spaces",
      value: data?.total_seats ?? "-",
      subtitle: "Active spaces",
      icon: Armchair,
      accent: "orange" as Accent,
      // No dedicated seats management page yet -- wire this up once one
      // exists. Not clickable until then.
      href: null,
    },
    {
      title: "Employee Spaces Reserved",
      value: data?.employee_bookings_today ?? "-",
      subtitle: `For ${formattedSelectedDate}`,
      icon: UserRound,
      accent: "blue" as Accent,
      href: "/admin/bookings",
    },
    {
      title: "Guest Visits",
      value: data?.guest_bookings_today ?? "-",
      subtitle: `${data?.guest_visit_booking_with_seat_today ?? 0} with spaces • ${data?.guest_visit_today ?? 0} invite only`,
      icon: UserRoundPlus,
      accent: "rose" as Accent,
      href: "/admin/bookings?type=guest",
    },
    {
      title: "Blocked Spaces",
      value: data?.blocked_seats ?? "-",
      subtitle: `Unavailable today`,
      icon: Ban,
      accent: "purple" as Accent,
      href: "/admin/blocked-seats",
    },
  ];

  //  Loading state
  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((item, index) => {
        const Icon = item.icon;
        const clickable = !!item.href;
        const accent = ACCENTS[item.accent];

        return (
          <Card
            key={index}
            onClick={clickable ? () => router.push(item.href!) : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(item.href!);
                    }
                  }
                : undefined
            }
            className={cn(
              "group relative",
              clickable
                ? cn(
                    "cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
                    accent.glow
                  )
                : "transition-colors duration-200"
            )}
          >

            {/* HEADER */}
            <CardHeader className="flex h-[50px] flex-row items-center justify-between pb-2">
              <CardTitle className={`min-w-0 text-sm font-semibold text-gray-700 ${item.title === "Employee Spaces Reserved" ? "-ml-1" : ""}`}>
  {item.title}
</CardTitle>

              <div
                className={cn(
                  "w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
                  accent.icon
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            </CardHeader>

            {/* CONTENT */}
            <CardContent>
              <div className="text-2xl sm:text-3xl xl:text-4xl font-semibold tracking-tight tabular-nums text-gray-900">
                {item.value}
              </div>

              {item.title === "Guest Visits" ? (
                <div className="group/guest">
                  <CardDescription className="text-sm text-gray-600 mt-1 cursor-help">
                    {item.subtitle}
                  </CardDescription>

                  <div
                    className="pointer-events-none invisible absolute inset-x-1 bottom-4 z-20 flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-600 opacity-0 ring-1 ring-inset ring-blue-100 transition-opacity duration-150 group-hover/guest:visible group-hover/guest:opacity-100"
                  >
                    <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>Invite-only visitors do not affect space occupancy.</span>
                  </div>
                </div>
              ) : (
                <CardDescription className="text-sm text-gray-600 mt-1">
                  {item.subtitle}
                </CardDescription>
              )}
            </CardContent>

          </Card>
        );
      })}
    </div>
  );
}