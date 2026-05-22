"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const bookings = [
  {
    name: "John Doe",
    email: "john@example.com",
    office: "Bengaluru",
    seat: "A-102",
    date: "May 17, 2026",
    status: "Booked",
  },
  {
    name: "Sarah Lee",
    email: "sarah@example.com",
    office: "Hyderabad",
    seat: "B-210",
    date: "May 17, 2026",
    status: "Cancelled",
  },
  {
    name: "Arjun Mehta",
    email: "arjun@example.com",
    office: "Pune",
    seat: "C-55",
    date: "May 17, 2026",
    status: "Booked",
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    office: "Chennai",
    seat: "D-88",
    date: "May 17, 2026",
    status: "Booked",
  },
];

export default function AdminBookings() {
  return (
    <Card>

      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Recent Bookings
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">

        <table className="w-full text-sm">

          {/* TABLE HEADER */}
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-muted-foreground">
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Office</th>
              <th className="px-6 py-3 font-medium">Seat</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody>

            {bookings.map((item, index) => (
              <tr
                key={index}
                className="border-b hover:bg-gray-50 transition"
              >

                {/* USER */}
                <td className="px-6 py-4 flex items-center gap-3">

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                    {item.name.charAt(0)}
                  </div>

                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.email}
                    </p>
                  </div>

                </td>

                {/* OFFICE */}
                <td className="px-6 py-4">{item.office}</td>

                {/* SEAT */}
                <td className="px-6 py-4">{item.seat}</td>

                {/* DATE */}
                <td className="px-6 py-4">{item.date}</td>

                {/* STATUS */}
                <td className="px-6 py-4">

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === "Booked"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.status}
                  </span>

                </td>

              </tr>
            ))}

          </tbody>
        </table>

      </CardContent>

    </Card>
  );
}