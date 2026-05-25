
"use client";

import { useState } from "react";
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

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Info } from "lucide-react";


type WeekType = "this-week" | "last-week";

type Props = {
  data: any;
  buildings: any[]; 
  trendData: any[];
  selectedWeek: WeekType;
  setSelectedWeek: (week: WeekType) => void;
  topOffices: any[];
};

// ---------- COMPONENT ----------
export default function AdminCharts({ data ,buildings, trendData, selectedWeek, setSelectedWeek ,topOffices}: Props) {

  // HANDLE LOADING

// const dynamicOffices = (buildings || []).map((b: any) => ({
//   name: b.building_name,
//   value: Math.floor(Math.random() * 80) + 20, // temp %
// }));

// const offices = dynamicOffices;


  // HANDLE LOADING
  if (!data) {
    return <div className="p-4">Loading charts...</div>;
  }

  // ✅BACKEND DATA
  const totalSeats = data.total_seats;
  const booked = data.booked_today;
  const available = totalSeats - booked;
  const occupancy = data.occupancy_percentage;

  return (
    <div className="grid grid-cols-3 gap-4">

      {/* ---------------- DONUT ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Today's Overview
          </CardTitle>
        </CardHeader>

        <CardContent className="flex items-center justify-between gap-6">

          <div className="relative w-[160px] h-[160px]">
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
                {occupancy.toFixed(1)}%
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
                {booked} ({occupancy.toFixed(1)}%)
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

        <div className="mx-6 mb-5 mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-600">
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

          <Select
            value={selectedWeek}
            onValueChange={(value) => {
              if (value) setSelectedWeek(value as WeekType);
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="This-week">This Week</SelectItem>
              <SelectItem value="Last-week">Last Week</SelectItem>
            </SelectContent>
          </Select>
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
            <AreaChart data={trendData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 10]}
                axisLine={true}
                tickLine={true}
              />

              <ChartTooltip content={<ChartTooltipContent />} />

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
         {topOffices.map((item: any, i: number) => (
            <div key={i}>
              <div className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-muted-foreground">
                  {item.value}%
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

        
        </CardContent>
      </Card>

    </div>
  );
}