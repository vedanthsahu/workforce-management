"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import type { RecentBooking } from "../types/admin.types";

type Props = {
  bookings: RecentBooking[];
  loading?: boolean;
};

const TYPE_STYLES: Record<RecentBooking["type"], string> = {
  Self: "bg-blue-100 text-blue-600",
  Employee: "bg-purple-100 text-purple-600",
  Guest: "bg-amber-100 text-amber-600",
};

function TypeBadge({ type, className = "" }: { type: RecentBooking["type"]; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_STYLES[type]} ${className}`}>
      {type}
    </span>
  );
}

export default function AdminRecentBookings({ bookings, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Recent Activities</CardTitle>
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <TypeBadge type={item.type} className="shrink-0 text-[10px] px-1.5 py-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.email}</p>
                  {item.bookedByName && (
                    <p className="text-xs text-violet-600  truncate">
                      Booked by {item.bookedByName}
                    </p>
                  )}
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
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Office</th>
                <th className="px-6 py-3 font-medium">Seat</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
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
                      {item.bookedByName && (
                        <p className="text-xs text-violet-600 ">
                          Booked by {item.bookedByName}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <TypeBadge type={item.type} />
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
                  <td colSpan={6} className="text-center py-6 text-gray-400">No bookings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </CardContent>
    </Card>
  );
}