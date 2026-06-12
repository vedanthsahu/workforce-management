"use client";

import {
  Layers,
  CheckCircle,
  XCircle,
  Armchair,
} from "lucide-react";

type Props = {
  stats: {
    total_floors: number;
    active_floors: number;
    inactive_floors: number;
    total_seats: number;
  } | null;
};

export default function FloorCards({
  stats,
}: Props) {
  const cards = [
    {
      title: "Total Floors",
      value:
        stats?.total_floors ?? 0,
      icon: Layers,
    },
    {
      title: "Active Floors",
      value:
        stats?.active_floors ?? 0,
      icon: CheckCircle,
    },
    {
      title: "Inactive Floors",
      value:
        stats?.inactive_floors ??
        0,
      icon: XCircle,
    },
    {
      title: "Total Seats",
      value:
        stats?.total_seats ?? 0,
      icon: Armchair,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(
        (
          {
            title,
            value,
            icon: Icon,
          },
          index
        ) => (
          <div
            key={index}
            className="bg-white border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  {title}
                </p>

                <h3 className="text-2xl font-bold mt-2">
                  {value}
                </h3>
              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
