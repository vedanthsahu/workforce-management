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
  CalendarCheck,
  Ban,
} from "lucide-react";

import type { DashboardSummary } from "../types/admin.types";

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
      color: "bg-blue-100 text-blue-600",
      href: "/admin/offices",
    },
    {
      title: "Total Floors",
      value: data?.total_floors ?? "-",
      subtitle: "Across all offices",
      icon: Layers,
      color: "bg-green-100 text-green-600",
      href: "/admin/floors",
    },
    {
      title: "Total Seats",
      value: data?.total_seats ?? "-",
      subtitle: "Active seats",
      icon: Armchair,
      color: "bg-orange-100 text-orange-600",
      // No dedicated seats management page yet -- wire this up once one
      // exists. Not clickable until then.
      href: null,
    },
    {
      title: "Bookings",
      value: data?.booked_today ?? "-",
      subtitle: `For ${formattedSelectedDate}`,
      icon: CalendarCheck,
      color: "bg-blue-100 text-blue-600",
      href: "/admin/bookings",
    },
    {
      title: "Blocked Seats",
      value: data?.blocked_seats ?? "-",
      subtitle: `For ${formattedSelectedDate}`,
      icon: Ban,
      color: "bg-purple-100 text-purple-600",
      href: null,
    },
  ];

  //  Loading state
  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {stats.map((item, index) => {
        const Icon = item.icon;
        const clickable = !!item.href;

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
            className={
              clickable
                ? "cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                : undefined
            }
          >

            {/* HEADER */}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
  {item.title}
</CardTitle>

              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </CardHeader>

            {/* CONTENT */}
            <CardContent>
              <div className="text-2xl sm:text-3xl xl:text-4xl font-semibold">
                {item.value}
              </div>

              <CardDescription className="text-sm text-gray-600 mt-1">
                {item.subtitle}
              </CardDescription>
            </CardContent>

          </Card>
        );
      })}
    </div>
  );
}