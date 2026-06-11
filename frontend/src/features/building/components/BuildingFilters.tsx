// "use client";

// import { Search } from "lucide-react";

// import { SiteOption } from "../types/building.types";

// type Props = {
//   sites: SiteOption[];

//   selectedSiteId: string;
//   setSelectedSiteId: (
//     value: string
//   ) => void;

//   search: string;
//   setSearch: (
//     value: string
//   ) => void;
// };

// export default function BuildingFilters({
//   sites,
//   selectedSiteId,
//   setSelectedSiteId,
//   search,
//   setSearch,
// }: Props) {
//   return (
//     <div className="flex items-center gap-3">

//       {/* SITE DROPDOWN */}
//       <select
//         value={selectedSiteId}
//         onChange={(e) =>
//           setSelectedSiteId(
//             e.target.value
//           )
//         }
//          className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//       >
//          <option value="">
//     All Offices
//   </option>
//         {sites.map((site) => (
          
//           <option
//             key={site.site_id}
//             value={String(site.site_id)}
//           >
//             {site.site_name}
//           </option>
//         ))}
//       </select>

//       {/* SEARCH */}
//       <div className="relative">
//         <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />

//         <input
//           value={search}
//           onChange={(e) =>
//             setSearch(
//               e.target.value
//             )
//           }
//           className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//           placeholder="Search by Building Name"
//         />
//       </div>

//     </div>
//   );
// }

"use client";

import { Search } from "lucide-react";
import { SiteOption } from "../types/building.types";

type Props = {
  sites: SiteOption[];
  selectedSiteId: string;
  setSelectedSiteId: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
};

export default function BuildingFilters({ sites, selectedSiteId, setSelectedSiteId, search, setSearch }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">

      <select
        value={selectedSiteId}
        onChange={(e) => setSelectedSiteId(e.target.value)}
        className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Offices</option>
        {sites.map((site) => (
          <option key={site.site_id} value={String(site.site_id)}>{site.site_name}</option>
        ))}
      </select>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-auto pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search buildings"
        />
      </div>

    </div>
  );
}