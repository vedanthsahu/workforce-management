"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import type { DashboardSummary } from "../types/admin.types";

export const useAdminDashboard = (
  date?: string,
  site_id?: number,
  floor_id?: number
) => {
  const [statsData, setStatsData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<"this-week" | "last-week">("this-week");
  const [topOffices, setTopOffices] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getDashboardSummary({
  date,
  site_id,
  floor_id,
});
        setStatsData(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    const fetchBuildings = async () => {
  try {
    const data = await adminService.getBuildings(5); // 👈 static for now
    setBuildings(data);
  } catch (err) {
    console.error(err);
  }
};


const fetchTrend = async () => {
  try {
    const today = new Date();

    let start: Date;
    let end: Date;

    if (selectedWeek === "this-week") {
      end = new Date(today);

      start = new Date(today);
      start.setDate(today.getDate() - 6);
    } else {
      end = new Date(today);
      end.setDate(today.getDate() - 7);

      start = new Date(end);
      start.setDate(end.getDate() - 6);
    }

    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    console.log("Week:", selectedWeek);
    console.log("Range:", startDate, endDate);

    const res = await adminService.getOccupancyRange(
      startDate,
      endDate
    );

    const formatted = res.map((item: any) => ({
      day: new Date(item.date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      occupancy: item.occupancyRate,
    }));

    setTrendData(formatted);
  } catch (err) {
    console.error(err);
  }
};


const fetchTopOffices = async () => {
  try {
    const res = await adminService.getOccupancyHierarchy({
      date,
    });

    const sorted = res
      .map((item: any) => ({
        name: item.siteName,
        value: item.occupancyRate,
      }))
      .sort((a: any, b: any) => b.value - a.value);

    setTopOffices(sorted);
  } catch (err) {
    console.error(err);
  }
};

const fetchBookings = async () => {
  try {
    const res = await adminService.getAdminBookings({
      date,       
      page: 1,
      limit: 5,   
    });

    const formatted = res.items.map((item: any) => ({
      name: item.user?.fullName,
      email: item.user?.email,
      office: item.site?.siteName,
      seat: item.seat?.seatCode,
      date: new Date(item.bookingDate).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      ),
      status:
        item.bookingStatus === "CANCELLED"
          ? "Cancelled"
          : "Booked",
    }));

    setRecentBookings(formatted);
  } catch (err) {
    console.error(err);
  }
};
    fetchStats();
    fetchBuildings();
    fetchTrend();
    fetchTopOffices();
    fetchBookings();  
  }, [date, site_id, floor_id,selectedWeek]);

  return {
    statsData,
    loading,
    error,
    buildings,
    trendData,
    selectedWeek,
    setSelectedWeek,
    topOffices, 
    recentBookings, 
  };
};