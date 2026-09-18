"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";

import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { ChevronDown, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type {
  DashboardSummary,
  OccupancyTrendPoint,
  TopOffice,
  TrendPeriod,
} from "../types/admin.types";
import {
  ceilPercentage,
  TREND_PERIOD_OPTIONS as PERIOD_OPTIONS,
  DONUT_META,
  TOP_OFFICES_PER_PAGE as OFFICES_PER_PAGE,
} from "../utils/dashboard.utils";

type Props = {
  data: DashboardSummary | null;
  trendData: OccupancyTrendPoint[];
  selectedPeriod: TrendPeriod;
  setSelectedPeriod: (period: TrendPeriod) => void;
  topOffices: TopOffice[];
};

// ---------- COMPONENT ----------

export default function AdminCharts({ data, trendData, selectedPeriod, setSelectedPeriod, topOffices }: Props) {
  const [officePage, setOfficePage] = useState(0);
  const isMonthPeriod = selectedPeriod === "this-month" || selectedPeriod === "last-month";

  const totalOfficePages = Math.max(1, Math.ceil(topOffices.length / OFFICES_PER_PAGE));
  const visibleOffices = topOffices.slice(
    officePage * OFFICES_PER_PAGE,
    officePage * OFFICES_PER_PAGE + OFFICES_PER_PAGE
  );

  // Clamp back to a valid page if a refetch shrinks the list (e.g. date change)
  useEffect(() => {
    if (officePage > totalOfficePages - 1) setOfficePage(totalOfficePages - 1);
  }, [officePage, totalOfficePages]);

  // HANDLE LOADING
  if (!data) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  // BACKEND DATA
  const totalSeats = data.total_seats;
  const booked = data.booked_seats_today;
  const blocked = data.blocked_seats;
  const available = Math.max(totalSeats - booked - blocked, 0);
  const occupancy = ceilPercentage((booked / Math.max(totalSeats, 1)) * 100);

  // Booked/blocked percentages are each rounded independently, so the
  // available share is the remainder rather than its own independent
  // rounding -- otherwise the three slices could visibly add up to more
  // than 100% (e.g. 1% + 1% + 100%).
  const bookedPct = ceilPercentage((booked / Math.max(totalSeats, 1)) * 100);
  const blockedPct = ceilPercentage((blocked / Math.max(totalSeats, 1)) * 100);
  const availablePct = Math.max(100 - bookedPct - blockedPct, 0);
  const donutPctByName: Record<string, number> = {
    booked: bookedPct,
    blocked: blockedPct,
    available: availablePct,
  };

  const donutLegend = [
    { label: "Reserved seats", value: booked, dot: "bg-indigo-500" },
    { label: "Employees", value: data.employee_bookings_today, dot: "bg-purple-400" },
    { label: "Guests", value: data.guest_visit_booking_with_seat_today, dot: "bg-pink-400" },
    { label: "Blocked seats", value: blocked, dot: "bg-amber-400" },
    { label: "Available seats", value: available, dot: "bg-emerald-500" },
  ];

  const renderDonutTooltip: NonNullable<ComponentProps<typeof ChartTooltip>["content"]> = ({
    active,
    payload,
  }) => {
    if (!active || !payload?.length) return null;

    const item = payload[0];
    const name = String(item.name);
    const value = Number(item.value);
    const meta = DONUT_META[name];
    const pct = donutPctByName[name] ?? ceilPercentage((value / Math.max(totalSeats, 1)) * 100);

    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta?.color }}
          />
          <span className="text-muted-foreground">{meta?.label ?? name}</span>
        </div>
        <div className="mt-1 font-mono font-medium tabular-nums text-foreground">
          {value} seats <span className="text-muted-foreground">({pct}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

      {/* ---------------- DONUT ---------------- */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Today&apos;s Seat Overview
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-6">

          <div className="relative w-40 h-40 shrink-0">
            <ChartContainer
              config={{
                booked: { label: "Reserved", color: "#6366F1" },
                blocked: { label: "Blocked", color: "#FBBF24" },
                available: { label: "Available", color: "#E5E7EB" },
              }}
              className="h-full w-full"
            >
              <PieChart>
                <defs>
                  <linearGradient id="donut-booked" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                  <linearGradient id="donut-blocked" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
                <ChartTooltip
                  content={renderDonutTooltip}
                  wrapperStyle={{ transform: "translate(12px, -100%)", pointerEvents: "none", zIndex: 50 }}
                  isAnimationActive={false}
                />
                <Pie
                  data={[
                    { name: "booked", value: booked },
                    { name: "blocked", value: blocked },
                    { name: "available", value: available },
                  ]}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={booked && blocked ? 3 : 0}
                  cornerRadius={0}
                  stroke="none"
                >
                  <Cell className="cursor-pointer transition-opacity hover:opacity-80" fill="url(#donut-booked)" />
                  <Cell className="cursor-pointer transition-opacity hover:opacity-80" fill="url(#donut-blocked)" />
                  <Cell className="cursor-pointer transition-opacity hover:opacity-80" fill="#10B981" />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold tracking-tight text-black">
                {occupancy}%
              </p>
              <p className="text-xs font-medium text-black">
                Seat occupancy
              </p>
            </div>
          </div>

          <div className="w-full space-y-2.5 text-sm">
            {donutLegend.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", row.dot)} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums text-gray-900",
                    row.label === "Reserved seats"
                      ? "text-base font-extrabold text-black"
                      : "text-sm font-medium"
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}

            <div className="mt-1 flex items-center justify-between gap-3 border-t border-dashed border-gray-200 pt-2.5">
              <span className="text-xs font-medium text-muted-foreground">Total seats</span>
              <span className="font-semibold tabular-nums text-gray-900">{totalSeats}</span>
            </div>
          </div>

        </CardContent>

        <div className="mx-6 mb-5 mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-600 ring-1 ring-inset ring-blue-100">
          <Info className="w-4 h-4 shrink-0" />
          Occupancy rate is calculated based on all bookable seats.
        </div>
      </Card>

      {/* ---------------- LINE CHART ---------------- */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Occupancy Trend
          </CardTitle>

          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as TrendPeriod)}
              className="h-8 cursor-pointer appearance-none rounded-lg border border-blue-500 bg-white pl-3 pr-8 text-xs font-medium text-gray-900 shadow-none transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-gray-900">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
          </div>
        </CardHeader>

        <CardContent>
          <ChartContainer
            config={{
              occupancy: {
                label: "Occupancy %",
                color: "#6366F1",
              },
            }}
            className="h-60 w-full"
          >
            <AreaChart data={trendData} margin={{ left: -19, right: 12 }}>
              {/* Month view (up to 31 points) shows fixed day-of-month
                 labels -- 1/5/10/15/20/25/<last day> -- instead of every
                 day, so it doesn't matter whether the month has 28-31 days.
                 Week view (7 points, weekday names) still shows every day. */}
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                interval={0}
                ticks={
                  isMonthPeriod
                    ? Array.from(new Set([1, 5, 10, 15, 20, 25, trendData.length])).map(String)
                    : undefined
                }
              />
              <YAxis
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                axisLine={false}
                tickLine={false}
                width={40}
              />

              <ChartTooltip
                cursor={{ stroke: "#818CF8", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (!payload?.length) return "";

                      const item = payload[0].payload;

                      return `${item.day} (${item.date})`;
                    }}
                    formatter={(value, _name, item) => {
                      const { bookedSeats, employeeBookedSeats, guestBookedSeats } = item.payload;
                      return (
                        <div className="flex w-full flex-col gap-0.5">
                          <span>
                            Occupancy: {value}% ({bookedSeats} seats)
                          </span>
                          <span className="text-muted-foreground">
                            Employees: {employeeBookedSeats} · Guests: {guestBookedSeats}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />

              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#818CF8"
                strokeWidth={2.5}
                fill="url(#trend-fill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ---------------- TOP OFFICES ---------------- */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Top Offices by Occupancy
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {visibleOffices.map((item) => {
            return (
              <div key={item.name} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700">{item.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {item.value}% ({item.bookedSeats} out of {item.totalSeats})
                    </span>
                  </div>

                  <div className="w-full h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-[width] duration-500 ease-out"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {topOffices.length > OFFICES_PER_PAGE && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setOfficePage((p) => Math.max(0, p - 1))}
                disabled={officePage === 0}
                aria-label="Previous offices"
                className="rounded-md border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs text-muted-foreground">
                {officePage + 1} / {totalOfficePages}
              </span>

              <button
                type="button"
                onClick={() => setOfficePage((p) => Math.min(totalOfficePages - 1, p + 1))}
                disabled={officePage >= totalOfficePages - 1}
                aria-label="Next offices"
                className="rounded-md border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
    
  );
}
