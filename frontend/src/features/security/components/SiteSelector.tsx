// "use client";

// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";
// import type { Site } from "../types/security.types";

// type Props = {
//   sites: Site[];
//   selectedSiteId?: string;
//   onChange: (siteId: string) => void;
// };

// export function SiteSelector({ sites, selectedSiteId, onChange }: Props) {
//   return (
//     <div className="flex items-center gap-6">
//       {/* <span className="text-[12px] text-gray-500 whitespace-nowrap">Site:</span> */}
//       <Select
//         items={Object.fromEntries(sites.map((s) => [s.id, s.name]))}
//         value={selectedSiteId ?? ""}
//         onValueChange={(value) => {
//           if (value) onChange(value);
//         }}
//       >
//         <SelectTrigger className="h-9 w-[180px] text-sm">
//           <SelectValue placeholder="Select Site" />
//         </SelectTrigger>
//         <SelectContent>
//           {sites.map((s) => (
//             <SelectItem key={s.id} value={s.id}>
//               {s.name}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     </div>
//   );
// }


// "use client";

// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";
// import type { Site } from "../types/security.types";

// type Props = {
//   sites: Site[];
//   selectedSiteId?: string;
//   onChange: (siteId: string) => void;
// };

// export function SiteSelector({ sites, selectedSiteId, onChange }: Props) {
//   return (
//     <div className="flex items-center gap-6">
//       <Select
//         items={Object.fromEntries(sites.map((s) => [s.id, s.name]))}
//         value={selectedSiteId ?? ""}
//         onValueChange={(value) => {
//           if (value) onChange(value);
//         }}
//       >
//         <SelectTrigger
//           className="h-9 w-[180px] text-sm font-medium
//             border border-indigo-200
//             bg-indigo-50
//             text-indigo-700
//             hover:bg-indigo-100
//             focus:ring-2 focus: bg-indigo-50 focus:ring-offset-1
//             rounded-lg
//             transition-colors"
//         >
//           <SelectValue placeholder="Select Site" />
//         </SelectTrigger>
//         <SelectContent className="rounded-lg border border-indigo-100 shadow-md">
//           {sites.map((s) => (
//             <SelectItem
//               key={s.id}
//               value={s.id}
//               className="text-sm text-gray-700
//                 focus:bg-indigo-50 focus:text-indigo-700
//                 cursor-pointer"
//             >
//               {s.name}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     </div>
//   );
// }

"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Site } from "../types/security.types";

type Props = {
  sites: Site[];
  selectedSiteId?: string;
  onChange: (siteId: string) => void;
};

export function SiteSelector({ sites, selectedSiteId, onChange }: Props) {
  return (
    <div className="flex items-center gap-6">
      <Select
        value={selectedSiteId ?? ""}
        onValueChange={(value) => {
          if (value) onChange(value);
        }}
      >
        <SelectTrigger
          className="h-9 w-[180px] text-sm font-medium
            border border-gray-200
            bg-white
            text-gray-700
            hover:bg-gray-50
            focus:ring-2 focus:ring-gray-200 focus:ring-offset-1
            rounded-lg
            shadow-sm
            transition-colors"
        >
          <SelectValue placeholder="Select Site" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border border-gray-200 bg-white shadow-md">
          {sites.map((s) => (
            <SelectItem
              key={s.id}
              value={s.id}
              className="text-sm text-gray-700
                focus:bg-gray-100 focus:text-gray-900
                cursor-pointer"
            >
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}