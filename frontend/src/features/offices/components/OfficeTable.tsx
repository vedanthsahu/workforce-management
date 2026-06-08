// // "use client";

// // import { Pencil, MapPin } from "lucide-react";

// // type Props = {
// //   data: any[];
// //   onEdit: (office: any) => void;
// // };

// // export default function OfficeTable({ data, onEdit }: Props) {
// //   return (
// //     <table className="w-full text-xs" style={{ minWidth: "860px" }}>

// //       <colgroup>
// //         <col style={{ width: "140px" }} />
// //         <col style={{ width: "180px" }} />
// //         <col style={{ width: "110px" }} />
// //         <col style={{ width: "110px" }} />
// //         <col style={{ width: "160px" }} />
// //         <col style={{ width: "60px" }} />
// //         <col style={{ width: "60px" }} />
// //         <col style={{ width: "60px" }} />
// //         <col style={{ width: "90px" }} />
// //         <col style={{ width: "70px" }} />
// //       </colgroup>

// //       {/* HEADER — sticky inside scroll container */}
// //       <thead className="text-xs text-gray-500 bg-gray-50 border-b">
// //         <tr>
// //           <th className="px-3 py-3 text-left font-medium">Office Code</th>
// //           <th className="px-3 py-3 text-left font-medium">Office Name</th>
// //           <th className="px-3 py-3 text-left font-medium">City</th>
// //           <th className="px-3 py-3 text-left font-medium">Country</th>
// //           <th className="px-3 py-3 text-left font-medium">Timezone</th>
// //           <th className="px-3 py-3 text-center font-medium">Bldgs</th>
// //           <th className="px-3 py-3 text-center font-medium">Floors</th>
// //           <th className="px-3 py-3 text-center font-medium">Seats</th>
// //           <th className="px-3 py-3 text-left font-medium">Status</th>
// //           <th className="px-3 py-3 text-center font-medium">Actions</th>
// //         </tr>
// //       </thead>

// //       {/* BODY */}
// //       <tbody className="divide-y divide-gray-100">
// //         {data.length === 0 ? (
// //           <tr>
// //             <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
// //               No offices found.
// //             </td>
// //           </tr>
// //         ) : (
// //           data.map((o: any) => (
// //             <tr key={o.site_code} className="hover:bg-gray-50 transition-colors">

// //               {/* OFFICE CODE */}
// //               <td className="px-3 py-3">
// //                 <div className="flex items-center gap-2">
// //                   <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100">
// //                     <MapPin className="w-3 h-3 text-blue-600" />
// //                   </div>
// //                   <span className="font-medium">{o.site_code}</span>
// //                 </div>
// //               </td>

// //               {/* OFFICE NAME */}
// //               <td className="px-3 py-3 max-w-0">
// //                 <span className="block font-medium truncate">{o.site_name}</span>
// //               </td>

// //               {/* CITY */}
// //               <td className="px-3 py-3 max-w-0">
// //                 <span className="block truncate">{o.city}</span>
// //               </td>

// //               {/* COUNTRY */}
// //               <td className="px-3 py-3 max-w-0">
// //                 <span className="block truncate">{o.country}</span>
// //               </td>

// //               {/* TIMEZONE */}
// //               <td className="px-3 py-3 max-w-0">
// //                 <span className="block truncate">{o.timezone}</span>
// //               </td>

// //               <td className="px-3 py-3 text-center">{o.building_count}</td>
// //               <td className="px-3 py-3 text-center">{o.floor_count}</td>
// //               <td className="px-3 py-3 text-center">{o.seat_count?.toLocaleString()}</td>

// //               {/* STATUS */}
// //               <td className="px-3 py-3">
// //                 <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
// //                   o.status === "ACTIVE"
// //                     ? "bg-green-100 text-green-700"
// //                     : "bg-gray-100 text-gray-600"
// //                 }`}>
// //                   {o.status}
// //                 </span>
// //               </td>

// //               {/* ACTIONS */}
// //               <td className="px-3 py-3 text-center">
// //                 <button
// //                   onClick={() => onEdit(o)}
// //                   className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
// //                 >
// //                   <Pencil size={13} className="text-blue-600" />
// //                 </button>
// //               </td>

// //             </tr>
// //           ))
// //         )}
// //       </tbody>

// //     </table>
// //   );
// // }

// "use client";

// import { Pencil, MapPin } from "lucide-react";

// type Props = {
//   data: any[];
//   onEdit: (office: any) => void;
// };

// export default function OfficeTable({ data, onEdit }: Props) {
//   return (
//     <table className="w-full text-xs" style={{ minWidth: "860px" }}>

//       <colgroup>
//         <col style={{ width: "140px" }} />
//         <col style={{ width: "180px" }} />
//         <col style={{ width: "110px" }} />
//         <col style={{ width: "110px" }} />
//         <col style={{ width: "160px" }} />
//         <col style={{ width: "60px" }} />
//         <col style={{ width: "60px" }} />
//         <col style={{ width: "60px" }} />
//         <col style={{ width: "90px" }} />
//         <col style={{ width: "70px" }} />
//       </colgroup>

//       {/* HEADER — sticky inside scroll container */}
//       <thead className="text-xs text-gray-500 bg-gray-50 border-b sticky top-0 z-10">
//         <tr>
//           <th className="px-3 py-3 text-left font-medium">Office Code</th>
//           <th className="px-3 py-3 text-left font-medium">Office Name</th>
//           <th className="px-3 py-3 text-left font-medium">City</th>
//           <th className="px-3 py-3 text-left font-medium">Country</th>
//           <th className="px-3 py-3 text-left font-medium">Timezone</th>
//           <th className="px-3 py-3 text-center font-medium">Bldgs</th>
//           <th className="px-3 py-3 text-center font-medium">Floors</th>
//           <th className="px-3 py-3 text-center font-medium">Seats</th>
//           <th className="px-3 py-3 text-left font-medium">Status</th>
//           <th className="px-3 py-3 text-center font-medium">Actions</th>
//         </tr>
//       </thead>

//       {/* BODY */}
//       <tbody className="divide-y divide-gray-100">
//         {data.length === 0 ? (
//           <tr>
//             <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
//               No offices found.
//             </td>
//           </tr>
//         ) : (
//           data.map((o: any) => (
//             <tr key={o.site_code} className="hover:bg-gray-50 transition-colors">

//               {/* OFFICE CODE */}
//               <td className="px-3 py-3">
//                 <div className="flex items-center gap-2">
//                   <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100">
//                     <MapPin className="w-3 h-3 text-blue-600" />
//                   </div>
//                   <span className="font-medium">{o.site_code}</span>
//                 </div>
//               </td>

//               {/* OFFICE NAME */}
//               <td className="px-3 py-3 max-w-0">
//                 <span className="block font-medium truncate">{o.site_name}</span>
//               </td>

//               {/* CITY */}
//               <td className="px-3 py-3 max-w-0">
//                 <span className="block truncate">{o.city}</span>
//               </td>

//               {/* COUNTRY */}
//               <td className="px-3 py-3 max-w-0">
//                 <span className="block truncate">{o.country}</span>
//               </td>

//               {/* TIMEZONE */}
//               <td className="px-3 py-3 max-w-0">
//                 <span className="block truncate">{o.timezone}</span>
//               </td>

//               <td className="px-3 py-3 text-center">{o.building_count}</td>
//               <td className="px-3 py-3 text-center">{o.floor_count}</td>
//               <td className="px-3 py-3 text-center">{o.seat_count?.toLocaleString()}</td>

//               {/* STATUS */}
//               <td className="px-3 py-3">
//                 <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
//                   o.status === "ACTIVE"
//                     ? "bg-green-100 text-green-700"
//                     : "bg-gray-100 text-gray-600"
//                 }`}>
//                   {o.status}
//                 </span>
//               </td>

//               {/* ACTIONS */}
//               <td className="px-3 py-3 text-center">
//                 <button
//                   onClick={() => onEdit(o)}
//                   className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
//                 >
//                   <Pencil size={13} className="text-blue-600" />
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

import { Pencil, MapPin } from "lucide-react";

type Props = {
  data: any[];
  onEdit: (office: any) => void;
  highlightedId?: string | null;
};

export default function OfficeTable({ data, onEdit, highlightedId }: Props) {
  return (
    <>
      {/* Inject keyframe animation once */}
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
          <col style={{ width: "110px" }} />
          <col style={{ width: "110px" }} />
          <col style={{ width: "160px" }} />
          <col style={{ width: "60px" }} />
          <col style={{ width: "60px" }} />
          <col style={{ width: "60px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "70px" }} />
        </colgroup>

        {/* HEADER */}
        <thead className="text-xs text-gray-500 bg-gray-50 border-b sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left font-medium">Office Code</th>
            <th className="px-3 py-3 text-left font-medium">Office Name</th>
            <th className="px-3 py-3 text-left font-medium">City</th>
            <th className="px-3 py-3 text-left font-medium">Country</th>
            <th className="px-3 py-3 text-left font-medium">Timezone</th>
            <th className="px-3 py-3 text-center font-medium">Bldgs</th>
            <th className="px-3 py-3 text-center font-medium">Floors</th>
            <th className="px-3 py-3 text-center font-medium">Seats</th>
            <th className="px-3 py-3 text-left font-medium">Status</th>
            <th className="px-3 py-3 text-center font-medium">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                No offices found.
              </td>
            </tr>
          ) : (
            data.map((o: any) => {
              const isHighlighted = highlightedId === o.site_id;
              return (
                <tr
                  key={o.site_code}
                  className={`transition-colors ${
                    isHighlighted
                      ? "row-highlight"
                      : "hover:bg-gray-50"
                  }`}
                >

                  {/* OFFICE CODE */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full ${
                        isHighlighted ? "bg-blue-200" : "bg-blue-100"
                      }`}>
                        <MapPin className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium">{o.site_code}</span>
                    </div>
                  </td>

                  {/* OFFICE NAME */}
                  <td className="px-3 py-3 max-w-0">
                    <span className="block font-medium truncate">{o.site_name}</span>
                  </td>

                  {/* CITY */}
                  <td className="px-3 py-3 max-w-0">
                    <span className="block truncate">{o.city}</span>
                  </td>

                  {/* COUNTRY */}
                  <td className="px-3 py-3 max-w-0">
                    <span className="block truncate">{o.country}</span>
                  </td>

                  {/* TIMEZONE */}
                  <td className="px-3 py-3 max-w-0">
                    <span className="block truncate">{o.timezone}</span>
                  </td>

                  <td className="px-3 py-3 text-center">{o.building_count}</td>
                  <td className="px-3 py-3 text-center">{o.floor_count}</td>
                  <td className="px-3 py-3 text-center">{o.seat_count?.toLocaleString()}</td>

                  {/* STATUS */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                      o.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {o.status}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onEdit(o)}
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