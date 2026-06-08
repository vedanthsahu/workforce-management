"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";


type Props = {
  bookings: any[];
};

export default function AdminBookings({ bookings }: Props) {  
  return (
    <Card>

      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Recent Bookings
        </CardTitle>
      </CardHeader>

     <CardContent className="p-0 overflow-x-auto">
  <table className="w-full min-w-[700px] text-sm">

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

           {bookings?.map((item, index) => (
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
                      item.status === "Booked" || item.status === "CONFIRMED"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    
                    {item.status}
                  </span>

                </td>

              </tr>
            ))}
            {bookings.length === 0 && (
  <tr>
    <td colSpan={5} className="text-center py-6 text-gray-400">
      No bookings found
    </td>
  </tr>
)}


          </tbody>
        </table>

      </CardContent>

    </Card>
  );
}