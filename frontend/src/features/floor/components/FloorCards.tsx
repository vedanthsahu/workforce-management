// "use client";

// import {
//   Layers,
//   CheckCircle,
//   Armchair,
//   LayoutGrid,
// } from "lucide-react";

// export default function FloorCards({
//   floors,
// }: {
//   floors: any[];
// }) {
//   const totalFloors =
//     floors.length;

//   const activeFloors =
//     floors.filter(
//       (f) =>
//         f.status ===
//         "ACTIVE"
//     ).length;

//   const totalSeats =
//     floors.reduce(
//       (sum, f) =>
//         sum +
//         f.seat_count,
//       0
//     );

//   const layouts =
//     floors.reduce(
//       (sum, f) =>
//         sum +
//         f.layout_count,
//       0
//     );

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//       <Card
//         title="Total Floors"
//         value={totalFloors}
//         icon={<Layers />}
//       />

//       <Card
//         title="Active Floors"
//         value={activeFloors}
//         icon={
//           <CheckCircle />
//         }
//       />

//       <Card
//         title="Total Seats"
//         value={totalSeats}
//         icon={<Armchair />}
//       />

//       <Card
//         title="Layouts"
//         value={layouts}
//         icon={
//           <LayoutGrid />
//         }
//       />
//     </div>
//   );
// }

// function Card({
//   title,
//   value,
//   icon,
// }: any) {
//   return (
//     <div className="bg-white border rounded-xl p-5">
//       <div className="flex justify-between">
//         <div>
//           <p className="text-xs text-gray-500">
//             {title}
//           </p>

//           <h3 className="text-2xl font-semibold mt-2">
//             {value}
//           </h3>
//         </div>

//         <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }


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