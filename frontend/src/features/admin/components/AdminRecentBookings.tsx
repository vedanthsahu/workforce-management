
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import type { RecentBooking } from "../types/admin.types";

const SKELETON_ROWS = 5;

type Props = {
  bookings: RecentBooking[];
  loading?: boolean;
};

export default function AdminRecentBookings({ bookings, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Recent Bookings</CardTitle>
      </CardHeader>

      <CardContent className="p-0">

        {/* ── Mobile card list (hidden on md+) ─────────────── */}
        <div className="md:hidden divide-y">
          {bookings.length === 0 ? (
            <p className="text-center py-6 text-gray-400 text-sm">No bookings found</p>
          ) : (
            bookings.map((item, index) => (
              <div key={index} className="flex items-start gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium shrink-0">
                  {item.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.email}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs text-gray-500">{item.office}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{item.seat}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                  item.status === "Booked"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop table (hidden below md) ──────────────── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-gray-50 border-b">
              <tr className="text-muted-foreground">
                <th className="px-6 py-3 font-medium text-left">User</th>
                <th className="px-6 py-3 font-medium text-left">Office</th>
                <th className="px-6 py-3 font-medium text-left">Seat</th>
                <th className="px-6 py-3 font-medium text-left">Date</th>
                <th className="px-6 py-3 font-medium text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.office}</td>
                  <td className="px-6 py-4">{item.seat}</td>
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === "Booked"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">No bookings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </CardContent>
    </Card>
  );
}
