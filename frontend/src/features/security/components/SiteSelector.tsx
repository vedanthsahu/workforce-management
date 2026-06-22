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
//         value={selectedSiteId ?? ""}
//         onValueChange={(value) => {
//           if (value) onChange(value);
//         }}
//       >
//         <SelectTrigger
//           className="h-9 w-[180px] text-sm font-medium
//             border border-gray-200
//             bg-white
//             text-gray-700
//             hover:bg-gray-50
//             focus:ring-2 focus:ring-gray-200 focus:ring-offset-1
//             rounded-lg
//             shadow-sm
//             transition-colors"
//         >
//           <SelectValue placeholder="Select Site" />
//         </SelectTrigger>
//         <SelectContent className="rounded-lg border border-gray-200 bg-white shadow-md">
//           {sites.map((s) => (
//             <SelectItem
//               key={s.id}
//               value={s.id}
//               className="text-sm text-gray-700
//                 focus:bg-gray-100 focus:text-gray-900
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


// "use client";

// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";

// type Props = {
//   selectedSiteId?: string;
//   onChange: (siteId: string) => void;
// };

// // Static for now — no live /sites call, just a fixed list to pick from.
// const STATIC_SITES = [
//   { id: "5", name: "Hyderabad Begumpet Office" },
//   { id: "7", name: "Roxana Towers" },
//   { id: "6", name: "Tech Park Annex" },
// ];

// export function SiteSelector({ selectedSiteId, onChange }: Props) {
//   return (
//     <div className="flex items-center gap-6">
//       <Select
//         value={selectedSiteId ?? ""}
//         onValueChange={(value) => {
//           if (value) onChange(value);
//         }}
//       >
//         <SelectTrigger
//           className="h-9 w-[180px] text-sm font-medium
//             border border-gray-200
//             bg-white
//             text-gray-700
//             hover:bg-gray-50
//             focus:ring-2 focus:ring-gray-200 focus:ring-offset-1
//             rounded-lg
//             shadow-sm
//             transition-colors"
//         >
//           <SelectValue placeholder="Select Site" />
//         </SelectTrigger>
//         <SelectContent className="rounded-lg border border-gray-200 bg-white shadow-md">
//           {STATIC_SITES.map((s) => (
//             <SelectItem
//               key={s.id}
//               value={s.id}
//               className="text-sm text-gray-700
//                 focus:bg-gray-100 focus:text-gray-900
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
import { useSiteSelector } from "../hooks/Usesiteselector";

type Props = {
  selectedSiteId?: string;
  onChange: (siteId: string) => void;
};

export function SiteSelector({ selectedSiteId, onChange }: Props) {
  const { options, selectedKey, selectOption } = useSiteSelector({ selectedSiteId, onChange });

  return (
    <div className="flex items-center gap-6">
      <Select value={selectedKey} onValueChange={(key) => key && selectOption(key)}>
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
          {options.map((o) => (
            <SelectItem
              key={o.key}
              value={o.key}
              className="text-sm text-gray-700
                focus:bg-gray-100 focus:text-gray-900
                cursor-pointer"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}