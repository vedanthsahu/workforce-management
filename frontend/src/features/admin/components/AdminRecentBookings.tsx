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
        <CardTitle className="text-sm font-semibold">
          Recent Bookings
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-6 py-3">User</TableHead>
              <TableHead className="px-6 py-3">Office</TableHead>
              <TableHead className="px-6 py-3">Seat</TableHead>
              <TableHead className="px-6 py-3">Date</TableHead>
              <TableHead className="px-6 py-3">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5} className="px-6 py-4">
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && bookings?.map((item, index) => (
              <TableRow key={index}>
                {/* USER */}
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-indigo-100">
                      <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium">
                        {item.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* OFFICE */}
                <TableCell className="px-6 py-4">{item.office}</TableCell>

                {/* SEAT */}
                <TableCell className="px-6 py-4">{item.seat}</TableCell>

                {/* DATE */}
                <TableCell className="px-6 py-4">{item.date}</TableCell>

                {/* STATUS */}
                <TableCell className="px-6 py-4">
                  <Badge
                    variant={item.status === "Booked" ? "secondary" : "destructive"}
                    className={
                      item.status === "Booked"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}

            {!loading && bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                  No bookings found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
