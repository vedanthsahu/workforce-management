// // "use client";

// // import {
// //   Layers,
// //   Pencil,
// // } from "lucide-react";

// // type Props = {
// //   data: any[];
// //   onEdit: (
// //     floor: any
// //   ) => void;
// // };

// // export default function FloorTable({
// //   data,
// //   onEdit,
// // }: Props) {
// //   return (
// //     <div className="w-full overflow-x-auto">
// //       <table className="w-full text-sm">

// //         <thead className="bg-gray-50 border-b text-xs text-gray-500">
// //           <tr>
// //             <th className="px-6 py-4 text-left">
// //               Floor Code
// //             </th>

// //             <th className="px-6 py-4 text-left">
// //               Floor Name
// //             </th>

// //             <th className="px-6 py-4 text-left">
// //               Building
// //             </th>

// //             <th className="px-6 py-4 text-center">
// //               Seats
// //             </th>

// //             <th className="px-6 py-4 text-center">
// //               Active Seats
// //             </th>

// //             <th className="px-6 py-4 text-center">
// //               Bookable Seats
// //             </th>

// //             <th className="px-6 py-4 text-center">
// //               Layouts
// //             </th>

// //             <th className="px-6 py-4 text-center">
// //               Status
// //             </th>

// //             <th className="px-6 py-4 text-center">
// //               Actions
// //             </th>
// //           </tr>
// //         </thead>

// //         <tbody className="divide-y">

// //           {data.length === 0 ? (
// //             <tr>
// //               <td
// //                 colSpan={9}
// //                 className="py-10 text-center text-gray-500"
// //               >
// //                 No floors found
// //               </td>
// //             </tr>
// //           ) : (
// //             data.map((floor) => (
// //               <tr
// //                 key={
// //                   floor.floor_id
// //                 }
// //               >
// //                 <td className="px-6 py-4">
// //                   <div className="flex items-center gap-3">
// //                     <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
// //                       <Layers className="w-4 h-4 text-blue-600" />
// //                     </div>

// //                     <span>
// //                       {
// //                         floor.floor_code
// //                       }
// //                     </span>
// //                   </div>
// //                 </td>

// //                 <td className="px-6 py-4">
// //                   {
// //                     floor.floor_name
// //                   }
// //                 </td>

// //                 <td className="px-6 py-4">
// //                   {
// //                     floor.building_name
// //                   }
// //                 </td>

// //                 <td className="px-6 py-4 text-center">
// //                   {
// //                     floor.seat_count
// //                   }
// //                 </td>

// //                 <td className="px-6 py-4 text-center">
// //                   {
// //                     floor.active_seat_count
// //                   }
// //                 </td>

// //                 <td className="px-6 py-4 text-center">
// //                   {
// //                     floor.bookable_seat_count
// //                   }
// //                 </td>

// //                 <td className="px-6 py-4 text-center">
// //                   {
// //                     floor.layout_count
// //                   }
// //                 </td>

// //                 <td className="px-6 py-4 text-center">
// //                   <span
// //                     className={`px-3 py-1 rounded-full text-xs ${
// //                       floor.status ===
// //                       "ACTIVE"
// //                         ? "bg-green-100 text-green-700"
// //                         : "bg-gray-100 text-gray-600"
// //                     }`}
// //                   >
// //                     {
// //                       floor.status
// //                     }
// //                   </span>
// //                 </td>

// //                 <td className="px-6 py-4 text-center">
// //                   <button
// //                     onClick={() =>
// //                       onEdit(
// //                         floor
// //                       )
// //                     }
// //                     className="p-2 border rounded-lg hover:bg-gray-100"
// //                   >
// //                     <Pencil
// //                       size={14}
// //                       className="text-blue-600"
// //                     />
// //                   </button>
// //                 </td>
// //               </tr>
// //             ))
// //           )}
// //         </tbody>
// //       </table>
// //     </div>
// //   );
// // }

// "use client";

// import { Layers, Pencil } from "lucide-react";

// type Props = {
//   data: any[];
//   onEdit: (floor: any) => void;
// };

// export default function FloorTable({ data, onEdit }: Props) {
//   return (
//     <table className="w-full text-sm">

//       <thead className="bg-gray-50 border-b text-xs text-gray-500 sticky top-0 z-10">
//         <tr>
//           <th className="px-6 py-4 text-left">Floor Code</th>
//           <th className="px-6 py-4 text-left">Floor Name</th>
//           <th className="px-6 py-4 text-left">Building</th>
//           <th className="px-6 py-4 text-center">Seats</th>
//           <th className="px-6 py-4 text-center">Active Seats</th>
//           <th className="px-6 py-4 text-center">Bookable Seats</th>
//           <th className="px-6 py-4 text-center">Layouts</th>
//           <th className="px-6 py-4 text-center">Status</th>
//           <th className="px-6 py-4 text-center">Actions</th>
//         </tr>
//       </thead>

//       <tbody className="divide-y">
//         {data.length === 0 ? (
//           <tr>
//             <td colSpan={9} className="py-10 text-center text-gray-500">
//               No floors found
//             </td>
//           </tr>
//         ) : (
//           data.map((floor) => (
//             <tr key={floor.floor_id}>

//               <td className="px-6 py-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
//                     <Layers className="w-4 h-4 text-blue-600" />
//                   </div>
//                   <span>{floor.floor_code}</span>
//                 </div>
//               </td>

//               <td className="px-6 py-4">{floor.floor_name}</td>
//               <td className="px-6 py-4">{floor.building_name}</td>
//               <td className="px-6 py-4 text-center">{floor.seat_count}</td>
//               <td className="px-6 py-4 text-center">{floor.active_seat_count}</td>
//               <td className="px-6 py-4 text-center">{floor.bookable_seat_count}</td>
//               <td className="px-6 py-4 text-center">{floor.layout_count}</td>

//               <td className="px-6 py-4 text-center">
//                 <span className={`px-3 py-1 rounded-full text-xs ${
//                   floor.status === "ACTIVE"
//                     ? "bg-green-100 text-green-700"
//                     : "bg-gray-100 text-gray-600"
//                 }`}>
//                   {floor.status}
//                 </span>
//               </td>

//               <td className="px-6 py-4 text-center">
//                 <button
//                   onClick={() => onEdit(floor)}
//                   className="p-2 border rounded-lg hover:bg-gray-100"
//                 >
//                   <Pencil size={14} className="text-blue-600" />
//                 </button>
//               </td>

//             </tr>
//           ))
//         )}
//       </tbody>

//     </table>
//   );
// }

"use client";

import { Layers, Pencil } from "lucide-react";

type Props = {
  data: any[];
  onEdit: (floor: any) => void;
  highlightedId?: string | null;
};

export default function FloorTable({ data, onEdit, highlightedId }: Props) {
  return (
    <>
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: #eff6ff; }
          60%  { background-color: #eff6ff; }
          100% { background-color: transparent; }
        }
        .row-highlight {
          animation: highlight-fade 3s ease forwards;
        }
      `}</style>

      <table className="w-full text-xs" style={{ minWidth: "860px" }}>

        <colgroup>
          <col style={{ width: "140px" }} />
          <col style={{ width: "180px" }} />
          <col style={{ width: "160px" }} />
          <col style={{ width: "70px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "100px" }} />
          <col style={{ width: "70px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "70px" }} />
        </colgroup>

        <thead className="text-xs text-gray-500 bg-gray-50 border-b sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left font-medium">Floor Code</th>
            <th className="px-3 py-3 text-left font-medium">Floor Name</th>
            <th className="px-3 py-3 text-left font-medium">Building</th>
            <th className="px-3 py-3 text-center font-medium">Seats</th>
            <th className="px-3 py-3 text-center font-medium">Active Seats</th>
            <th className="px-3 py-3 text-center font-medium">Bookable Seats</th>
            <th className="px-3 py-3 text-center font-medium">Layouts</th>
            <th className="px-3 py-3 text-left font-medium">Status</th>
            <th className="px-3 py-3 text-center font-medium">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                No floors found.
              </td>
            </tr>
          ) : (
            data.map((floor: any) => {
              const isHighlighted = highlightedId === floor.floor_id;
              return (
                <tr
                  key={floor.floor_id}
                  className={`transition-colors ${
                    isHighlighted ? "row-highlight" : "hover:bg-gray-50"
                  }`}
                >
                  {/* FLOOR CODE */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full ${
                        isHighlighted ? "bg-blue-200" : "bg-blue-100"
                      }`}>
                        <Layers className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium">{floor.floor_code}</span>
                    </div>
                  </td>

                  {/* FLOOR NAME */}
                  <td className="px-3 py-3 max-w-0">
                    <span className="block font-medium truncate">{floor.floor_name}</span>
                  </td>

                  {/* BUILDING */}
                  <td className="px-3 py-3 max-w-0">
                    <span className="block truncate">{floor.building_name}</span>
                  </td>

                  <td className="px-3 py-3 text-center">{floor.seat_count}</td>
                  <td className="px-3 py-3 text-center">{floor.active_seat_count}</td>
                  <td className="px-3 py-3 text-center">{floor.bookable_seat_count}</td>
                  <td className="px-3 py-3 text-center">{floor.layout_count}</td>

                  {/* STATUS */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                      floor.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {floor.status}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onEdit(floor)}
                      className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
                    >
                      <Pencil size={13} className="text-blue-600" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

      </table>
    </>
  );
}