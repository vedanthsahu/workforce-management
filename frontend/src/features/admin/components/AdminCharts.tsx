"use client";

import { useEffect, useState } from "react";

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

import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import type {
  DashboardSummary,
  OccupancyTrendPoint,
  TopOffice,
  WeekFilter,
} from "../types/admin.types";
import { ceilPercentage } from "../utils/dashboard.utils";

type Props = {
  data: DashboardSummary | null;
  trendData: OccupancyTrendPoint[];
  selectedWeek: WeekFilter;
  setSelectedWeek: (week: WeekFilter) => void;
  topOffices: TopOffice[];
};

// ---------- COMPONENT ----------
const OFFICES_PER_PAGE = 5;

export default function AdminCharts({ data, trendData, selectedWeek, setSelectedWeek, topOffices }: Props) {
  const [officePage, setOfficePage] = useState(0);

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
  const booked = data.booked_today;
  const available = totalSeats - booked;
  const occupancy = ceilPercentage(data.occupancy_percentage);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

      {/* ---------------- DONUT ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Today&apos;s Overview
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-6">

          <div className="relative w-[160px] h-[160px] sm:w-[160px] sm:h-[160px] shrink-0">
            <ChartContainer
              config={{
                booked: { label: "Booked", color: "#4F46E5" },
                available: { label: "Available", color: "#E5E7EB" },
              }}
              className="h-full w-full"
            >
              <PieChart>
                <Pie
                  data={[
                    { name: "booked", value: booked },
                    { name: "available", value: available },
                  ]}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={75}
                  stroke="none"
                >
                  <Cell fill="var(--color-booked)" />
                  <Cell fill="var(--color-available)" />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold">
                {occupancy}%
              </p>
              <p className="text-xs text-muted-foreground">
                Occupancy
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                Booked Seats
              </p>
              <p className="font-medium">
                {occupancy}% ({booked})
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Available Seats
              </p>
              <p className="font-medium">
                {available}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Total Seats
              </p>
              <p className="font-medium">{totalSeats}</p>
            </div>
          </div>

        </CardContent>

        <div className="mx-6 mb-5 mt-2 flex items-center gap-2 rounded-md  bg-blue-100 px-3 py-2 text-xs text-blue-600">
          <Info className="w-4 h-4" />
          Occupancy rate is calculated based on all bookable seats.
        </div>
      </Card>

      {/* ---------------- LINE CHART ---------------- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Occupancy Trend
          </CardTitle>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value as WeekFilter)}
            className="h-8 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="this-week">This Week</option>
            <option value="last-week">Last Week</option>
          </select>
        </CardHeader>

        <CardContent>
          <ChartContainer
            config={{
              occupancy: {
                label: "Occupancy %",
                color: "#4F46E5",
              },
            }}
            className="h-[240px] w-full"
          >
            <AreaChart data={trendData} margin={{ left: -19                                                                                                        }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                axisLine={true}
                tickLine={true}
                width={40}
              />

              <ChartTooltip
                content={                                                                                                       
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (!payload?.length) return "";

                      const item = payload[0].payload;

                      return `${item.day} (${item.date})`;
                    }}
                    formatter={(value, _name, item) => {
                      const bookedSeats = item.payload.bookedSeats;
                      return `Occupancy: ${value}% (${bookedSeats})`;
                    }}
                  />
                }
              />

              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#4F46E5"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ---------------- TOP OFFICES ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Top Offices by Occupancy
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {visibleOffices.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-xs">{item.name}</span>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {item.value}% ({item.bookedSeats} out of {item.totalSeats})
                </span>
              </div>

              <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-2 bg-indigo-500 rounded-full"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}

          {topOffices.length > OFFICES_PER_PAGE && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOfficePage((p) => Math.max(0, p - 1))}
                disabled={officePage === 0}
                aria-label="Previous offices"
                className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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

