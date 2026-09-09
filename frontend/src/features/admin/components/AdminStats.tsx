"use client";

import { useRouter } from "next/navigation";

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
  ArrowUpRight,
} from "lucide-react";

import type { DashboardSummary } from "../types/admin.types";

type Accent = "blue" | "green" | "orange" | "rose" | "purple";

const ACCENTS: Record<
  Accent,
  { icon: string; border: string; glow: string }
> = {
  blue: {
    icon: "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-inset ring-blue-200/70",
    border: "border-l-blue-400",
    glow: "hover:shadow-blue-500/10",
  },
  green: {
    icon: "bg-gradient-to-br from-green-50 to-green-100 text-green-600 ring-1 ring-inset ring-green-200/70",
    border: "border-l-green-400",
    glow: "hover:shadow-green-500/10",
  },
  orange: {
    icon: "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 ring-1 ring-inset ring-orange-200/70",
    border: "border-l-orange-400",
    glow: "hover:shadow-orange-500/10",
  },
  rose: {
    icon: "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 ring-1 ring-inset ring-rose-200/70",
    border: "border-l-rose-400",
    glow: "hover:shadow-rose-500/10",
  },
  purple: {
    icon: "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 ring-1 ring-inset ring-purple-200/70",
    border: "border-l-purple-400",
    glow: "hover:shadow-purple-500/10",
  },
};

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
      title: "Total Seats",
      value: data?.total_seats ?? "-",
      subtitle: "Active seats",
      icon: Armchair,
      accent: "orange" as Accent,
      // No dedicated seats management page yet -- wire this up once one
      // exists. Not clickable until then.
      href: null,
    },
    {
      title: "Employee Seats Reserved",
      value: data?.employee_bookings_today ?? "-",
      subtitle: `For ${formattedSelectedDate}`,
      icon: UserRound,
      accent: "blue" as Accent,
      href: "/admin/bookings",
    },
    {
      title: "Guest Visits",
      value: data?.guest_bookings_today ?? "-",
      subtitle: `${data?.guest_visit_booking_with_seat_today ?? 0} with seats • ${data?.guest_visit_today ?? 0} invite only`,
      icon: UserRoundPlus,
      accent: "rose" as Accent,
      href: "/admin/bookings",
    },
    {
      title: "Blocked Seats",
      value: data?.blocked_seats ?? "-",
      subtitle: `For ${formattedSelectedDate}`,
      icon: Ban,
      accent: "purple" as Accent,
      href: null,
    },
  ];

  //  Loading state
  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_0.8fr] gap-4">
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
              "group relative border-l-4",
              accent.border,
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
              <CardTitle className={`text-sm font-semibold text-gray-700 ${item.title === "Employee Seats Reserved" ? "-ml-1" : ""}`}>
  {item.title}
</CardTitle>

              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
                  accent.icon
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            </CardHeader>

            {/* CONTENT */}
            <CardContent>
              <div className="flex items-end justify-between gap-2">
                <div className="text-2xl sm:text-3xl xl:text-4xl font-semibold tracking-tight tabular-nums text-gray-900">
                  {item.value}
                </div>

                {clickable && (
                  <ArrowUpRight className="mb-1 h-4 w-4 shrink-0 text-gray-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-400" />
                )}
              </div>

              <CardDescription className="text-sm text-gray-600 mt-1">
                {item.subtitle}
              </CardDescription>

              {item.title === "Guest Visits" && (
                <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-tight text-gray-500">
                  <Info className="mt-px h-3 w-3 shrink-0" />
                  <span>Invite-only visitors do not affect seat occupancy.</span>
                </div>
              )}
            </CardContent>

          </Card>
        );
      })}
    </div>
  );
}