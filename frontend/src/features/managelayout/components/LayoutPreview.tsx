// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";

// import {
//   MousePointer,
//   Plus,
//   SquareDashed,
//   Hand,
// } from "lucide-react";

// export default function LayoutPreview() {
//   // 🔹 Tabs
//   const tabs = [
//     "Layout Preview",
//     "Seat Summary",
//     "Amenities",
//     "Blocked Areas",
//   ];

//   // 🔹 Active tool
//   const [activeTool, setActiveTool] = useState("Select");

//   // 🔹 Tools list
//   const tools = [
//     { name: "Select", icon: MousePointer },
//     { name: "Add Seat", icon: Plus },
//     { name: "Add Area", icon: SquareDashed },
//     { name: "Pan", icon: Hand },
//   ];

//   return (
//     <div>

//       {/* ---------------- TABS ---------------- */}
//       <div className="flex gap-6 border-b pb-2 mb-4">
//         {tabs.map((tab, index) => (
//           <span
//             key={index}
//             className={cn(
//               "cursor-pointer text-sm",
//               index === 0
//                 ? "text-indigo-600 font-medium border-b-2 border-indigo-600 pb-1"
//                 : "text-gray-500"
//             )}
//           >
//             {tab}
//           </span>
//         ))}
//       </div>

//       {/* ---------------- MAIN LAYOUT ---------------- */}
//       <div className="flex">

//         {/* -------- LEFT TOOLBAR -------- */}
//         <div className="flex flex-col gap-3 mr-4">

//           {tools.map((tool) => {
//             const Icon = tool.icon;

//             return (
//               <Button
//                 key={tool.name}
//                 variant="outline"
//                 className={cn(
//                   "flex flex-col items-center justify-center w-20 h-20 text-xs gap-1",
//                   activeTool === tool.name &&
//                     "border-indigo-500 text-indigo-600"
//                 )}
//                 onClick={() => setActiveTool(tool.name)}
//               >
//                 <Icon className="w-4 h-4" />
//                 {tool.name}
//               </Button>
//             );
//           })}

//         </div>

//         {/* -------- SVG PREVIEW AREA -------- */}
//         <div className="flex-1 border rounded-md h-[500px] flex items-center justify-center">
//           <span className="text-gray-400">
//             SVG Layout Preview (Coming Soon)
//           </span>
//         </div>

//       </div>

//     </div>
//   );
// }


"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MousePointer,
  Plus,
  SquareDashed,
  Hand,
} from "lucide-react";

export default function LayoutPreview() {
  const [activeTool, setActiveTool] = useState("Select");

  const tabs = [
    "Layout Preview",
    "Seat Summary",
    "Amenities",
    "Blocked Areas",
  ];

  const tools = [
    { name: "Select", icon: MousePointer },
    { name: "Add Seat", icon: Plus },
    { name: "Add Area", icon: SquareDashed },
    { name: "Pan", icon: Hand },
  ];

  return (
    <div className="space-y-4">

      {/* ---------------- TABS ---------------- */}
      <div className="flex gap-6 border-b">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={cn(
              "pb-2 text-sm cursor-pointer",
              i === 0
                ? "text-indigo-600 border-b-2 border-indigo-600 font-medium"
                : "text-gray-500"
            )}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* ---------------- TOP BAR (TIP + LEGEND + ZOOM) ---------------- */}
      <div className="flex items-center justify-between">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">

          {/* TIP */}
          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm">
            Tip: Click on a seat to view details or edit
          </div>

          {/* LEGEND */}
          <div className="flex items-center gap-4 text-sm text-gray-600">

            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Available
            </div>

            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Booked
            </div>

            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Blocked
            </div>

            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
              Non-bookable
            </div>

          </div>
        </div>

        {/* RIGHT SIDE (ZOOM) */}
        <div className="flex items-center gap-2 text-sm">

          <span className="text-gray-600">Zoom</span>

          <button className="border px-2 py-1 rounded">-</button>

          <span className="w-10 text-center">100%</span>

          <button className="border px-2 py-1 rounded">+</button>

        </div>
      </div>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="flex gap-4">

        {/* TOOLBAR */}
        <div className="flex flex-col gap-3">

          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Button
                key={tool.name}
                variant="outline"
                className={cn(
                  "flex flex-col items-center justify-center w-20 h-20 text-xs gap-1",
                  activeTool === tool.name &&
                    "border-indigo-500 text-indigo-600"
                )}
                onClick={() => setActiveTool(tool.name)}
              >
                <Icon className="w-4 h-4" />
                {tool.name}
              </Button>
            );
          })}

        </div>

        {/* SVG CONTAINER */}
        <div className="relative flex-1 border rounded-md bg-white h-[600px] flex items-center justify-center">

          <span className="text-gray-400">
            SVG Layout Preview (Coming Soon)
          </span>

          {/* SHOW AREAS BUTTON */}
          <button className="absolute bottom-4 left-4 border px-3 py-1 rounded text-sm bg-white">
            Show Areas
          </button>

        </div>

      </div>
    </div>
  );
}