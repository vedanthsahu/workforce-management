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

const STATUS_STYLES: Record<RecentBooking["status"], string> = {
  Booked: "bg-green-100 text-green-600",
  "Checked In": "bg-blue-100 text-blue-600",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-600",
  "No Show": "bg-orange-100 text-orange-600",
  Modified: "bg-amber-100 text-amber-600",
};

function StatusBadge({ status, className = "" }: { status: RecentBooking["status"]; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status]} ${className}`}>
      {status}
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
                    <p className="text-xs text-blue-600  truncate">
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
                <StatusBadge status={item.status} className="shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* ── Desktop table (hidden below md) ──────────────── */}
        <div className="hidden md:block">
          <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>
            <thead className="block w-full bg-blue-100">
              <tr className="table w-full text-blue-600" style={{ tableLayout: "fixed" }}>
                <th className="px-1 py-3 font-medium text-center border-b border-gray-200 w-[28%]">User</th>
                <th className="pl-1 pr-4 py-3 font-medium text-center border-b border-gray-200 w-[11%]">Type</th>
                <th className="px-4 py-3 font-medium text-center border-b border-gray-200 w-[22%]">Office</th>
                <th className="px-4 py-3 font-medium text-center border-b border-gray-200 w-[17%]">Seat / Visit</th>
                <th className="px-4 py-3 font-medium text-center whitespace-nowrap border-b border-gray-200 w-[12%]">Date</th>
                <th className="px-4 py-3 font-medium text-center border-b border-gray-200 w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody
              className="block overflow-y-auto max-h-[320px] w-full"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
            >
              {bookings.map((item, index) => (
                <tr key={index} className="table w-full border-b hover:bg-gray-50 transition" style={{ tableLayout: "fixed" }}>
                  <td className="px-4 py-4 align-middle w-[28%]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium shrink-0">
                        {item.name.charAt(0)}
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.email}</p>
                        {item.bookedByName && (
                          <p className="text-xs text-blue-600 truncate">
                            Booked by {item.bookedByName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="pl-1 pr-4 py-4 align-middle text-center w-[11%]">
                    <TypeBadge type={item.type} />
                  </td>
                  <td className="px-4 py-4 align-middle text-center w-[22%]">
                    <div>{item.office}</div>
                  </td>
                  <td className="px-4 py-4 align-middle text-center w-[17%]">
                    <div>{item.seat}</div>
                  </td>
                  <td className="px-4 py-4 align-middle text-center whitespace-nowrap w-[12%]">{item.date}</td>
                  <td className="px-4 py-4 align-middle text-center w-[10%]">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr className="table w-full" style={{ tableLayout: "fixed" }}>
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