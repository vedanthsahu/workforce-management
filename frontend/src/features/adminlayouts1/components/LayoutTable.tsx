// "use client";

// import { Eye, Download, MoreVertical } from "lucide-react";
// import { useLayoutsTable } from "@/features/adminlayouts1/hooks/useLayoutsTable";
// import LayoutPagination from "./LayoutPagination";
// import { useEffect, useState } from "react";
// import { getLayoutsByFloor } from "../services/locationService";


// type Props = {
//   selection: {
//     office: string;
//     tower: string;
//     floor: string;
//     floorId: string; // 🔥 ADD THIS
//   };
// };

// // const data = [
// //   {
// //     name: "T1-3F Layout - v2",
// //     version: "2",
// //     status: "PUBLISHED",
// //     date: "May 10, 2026 10:30 AM",
// //     user: "Rohit Sharma",
// //   },
// //   {
// //     name: "T1-3F Layout - v1",
// //     version: "1",
// //     status: "PUBLISHED",
// //     date: "Apr 20, 2026 04:15 PM",
// //     user: "Rohit Sharma",
// //   },
// //   {
// //     name: "T1-3F Layout - Draft",
// //     version: "3",
// //     status: "DRAFT",
// //     date: "May 17, 2026 09:45 AM",
// //     user: "Rohit Sharma",
// //   },
// //   {
// //     name: "T1-3F Layout - v0.1",
// //     version: "0.1",
// //     status: "ARCHIVED",
// //     date: "Mar 15, 2026 11:20 AM",
// //     user: "Rohit Sharma",
// //   },
// //   {
// //     name: "T1-3F Layout - Old",
// //     version: "0.0",
// //     status: "ARCHIVED",
// //     date: "Feb 28, 2026 02:10 PM",
// //     user: "Rohit Sharma",
// //   },
// // ];



// export default function LayoutTable({ selection }: Props) {
// const [data, setData] = useState<any[]>([]);

// const filtered = data; // later replace with API/filter logic


// useEffect(() => {
//   if (!selection?.floor) return;

//   loadLayouts();
// }, [selection.floor]);

// const loadLayouts = async () => {
//   try {
//     //  You need floorId (not name)
//     const floorId = selection.floorId || selection.floor; 

//     const res = await getLayoutsByFloor(floorId);

//     //  MAP BACKEND → UI FORMAT
//     const mapped = res.map((item: any) => ({
//       name: item.layout_name,
//       version: item.version_no,
//       status: item.status,
//       date: new Date(item.created_at).toLocaleString(),
//       user: item.uploaded_by_user_id, // later replace with name
//       file: item.layout_file_url, // for download
//     }));

//     setData(mapped);
//   } catch (err) {
//     console.error(err);
//     setData([]);
//   }
// };

// const {
//   page,
//   rowsPerPage,
//   total,
//   paginated,
//   setPage,
//   setRowsPerPage,
// } = useLayoutsTable(filtered);


// const handleView = (row: any) => {
//   const newWindow = window.open("", "_blank");

//   const content = `
//     <html>
//       <head>
//         <title>${row.name}</title>
//       </head>
//       <body style="font-family: Arial; padding: 20px;">
//         <h2>${row.name}</h2>
//         <p><b>Version:</b> ${row.version}</p>
//         <p><b>Status:</b> ${row.status}</p>
//         <p><b>Date:</b> ${row.date}</p>
//         <p><b>User:</b> ${row.user}</p>
//       </body>
//     </html>
//   `;

//   newWindow?.document.write(content);
// };

// const handleDownload = (row: any) => {
//   const a = document.createElement("a");
//   a.href = row.file; // 🔥 real file URL
//   a.download = row.name;
//   a.click();
// };

//   const blob = new Blob([content], {
//     type: "application/pdf", // simulate pdf
//   });

//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `${row.name}.pdf`;
//   a.click();

//   URL.revokeObjectURL(url);
// };

//   return (
//     <div className="bg-white border rounded-xl p-6 shadow-sm">

//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-sm font-semibold">
//           Floor Layouts - {selection.tower} / {selection.floor}
//         </h2>

//         <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">
//           {total} Layouts
//         </span>
//       </div>

//       {/* TABLE */}
//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">

//           <thead>
//             <tr className="text-left text-gray-500 border-b">
//               <th className="py-3">Layout Name</th>
//               <th>Version</th>
//               <th>Status</th>
//               <th>Published</th>
//               <th>Uploaded By</th>
//               <th className="text-center">Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {paginated.map((row, i) => (
//               <tr key={i} className="border-b hover:bg-gray-50">

//                 <td className="py-4">{row.name}</td>
//                 <td>{row.version}</td>

//                 <td>
//                   <span
//                     className={`px-2 py-1 rounded text-xs font-medium
//                       ${
//                         row.status === "PUBLISHED"
//                           ? "bg-green-100 text-green-600"
//                           : row.status === "DRAFT"
//                           ? "bg-blue-100 text-blue-600"
//                           : "bg-gray-100 text-gray-600"
//                       }`}
//                   >
//                     {row.status}
//                   </span>
//                 </td>

//                 <td>{row.date}</td>
//                 <td>{row.user}</td>

//                 {/* ACTIONS */}
//                 <td>
//                   <div className="flex justify-center gap-2">

//                     <button
//   onClick={() => handleView(row)}
//   className="p-2 border rounded-md hover:bg-gray-100"
// >
//   <Eye className="w-4 h-4 text-indigo-600" />
// </button>

//                     <button
//   onClick={() => handleDownload(row)}
//   className="p-2 border rounded-md hover:bg-gray-100"
// >
//   <Download className="w-4 h-4 text-gray-600" />
// </button>

//                     <button className="p-2 border rounded-md hover:bg-gray-100">
//                       <MoreVertical className="w-4 h-4 text-gray-600" />
//                     </button>

//                   </div>
//                 </td>

//               </tr>
//             ))}
//           </tbody>

//         </table>
//       </div>

    
// <LayoutPagination
//   total={total}
//   page={page}
//   rowsPerPage={rowsPerPage}
//   onPageChange={setPage}
//   onRowsChange={(rows) => {
//     setRowsPerPage(rows);
//     setPage(1);
//   }}
// />
//       </div>
//   );
// }

"use client";

import { Eye, Download, MoreVertical } from "lucide-react";
import { useLayoutsTable } from "@/features/adminlayouts1/hooks/useLayoutsTable";
import LayoutPagination from "./LayoutPagination";
import { useEffect, useState } from "react";
import { getLayoutsByFloor } from "../services/locationService";
import { LayoutTableItem , LayoutSelection} from "@/features/adminlayouts1/types/layout.types";
type Props = {
  selection: LayoutSelection;
};
export default function LayoutTable({ selection }: Props) {
  const [data, setData] = useState<LayoutTableItem[]>([]);

  //  Load layouts when floor changes
  useEffect(() => {
    if (!selection?.floorId) return;

    loadLayouts();
  }, [selection.floorId]);

  const loadLayouts = async () => {
    try {
      const res = await getLayoutsByFloor(selection.floorId);

      // const mapped = res.map((item: any) => ({
      //   id: item.layout_id,
      //   name: item.layout_name,
      //   version: item.version_no,
      //   status: item.status,
      //   published: item.is_published ? "Yes" : "No",
      //   date: new Date(item.created_at).toLocaleString(),
      //   user: item.uploaded_by_user_id,
      //   file: item.layout_file_url,
      // }));

      setData(res);
    } catch (err) {
      console.error(err);
      setData([]);
    }
  };

  const {
    page,
    rowsPerPage,
    total,
    paginated,
    setPage,
    setRowsPerPage,
  } = useLayoutsTable(data);

  //  VIEW
  const handleView = (row: LayoutTableItem) => {
    window.open(row.file, "_blank"); // 🔥 open real SVG
  };

  // ⬇ DOWNLOAD
  const handleDownload = (row: LayoutTableItem) => {
    const a = document.createElement("a");
    a.href = row.file;
    a.download = row.name;
    a.click();
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-semibold">
          Floor Layouts - {selection.buildingName} / {selection.floorName}
        </h2>

        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">
          {total} Layouts
        </span>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-3">Layout Name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Published</th>
              <th>Uploaded By</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  No layouts found
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">

                  <td className="py-4">{row.name}</td>
                  <td>{row.version}</td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        row.status === "PUBLISHED"
                          ? "bg-green-100 text-green-600"
                          : row.status === "DRAFT"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>

                  {/* PUBLISHED */}
                  <td>{row.published}</td>

                  {/* USER */}
                  <td>{row.user}</td>

                  {/* ACTIONS */}
                  <td>
                    <div className="flex justify-center gap-2">

                      <button
                        onClick={() => handleView(row)}
                        className="p-2 border rounded-md hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 text-indigo-600" />
                      </button>

                      <button
                        onClick={() => handleDownload(row)}
                        className="p-2 border rounded-md hover:bg-gray-100"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>

                      <button className="p-2 border rounded-md hover:bg-gray-100">
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>

      {/* PAGINATION */}
      <LayoutPagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsChange={(rows) => {
          setRowsPerPage(rows);
          setPage(1);
        }}
      />
    </div>
  );
}