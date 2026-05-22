"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Building2, Search } from "lucide-react";
import {
  getSites,
  getBuildings,
  getFloors,
} from "@/features/adminlayouts1/services/locationService";
import {
  Site,
  Building,
  Floor,
} from "@/features/adminlayouts1/types/layout.types";

type Props = {
  onSelect: (data: {
    siteId: string;
    buildingId: string;
    floorId: string;

    siteName: string;
    buildingName: string;
    floorName: string;
  }) => void;
};

export default function FloorTree({ onSelect }: Props) {
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  const [expandedTower, setExpandedTower] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [search, setSearch] = useState("");

  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Record<string, Building[]>>({});
  const [floors, setFloors] = useState<Record<string, Floor[]>>({});

  useEffect(() => {
    loadSites();
  }, []);

const loadSites = async () => {
  const data = await getSites();
  console.log("SITES API RESPONSE:", data); // 👈 ADD THIS
  setSites(data);
};

  return (
    <div className="bg-white border rounded-lg p-4">
      {/* TITLE */}
      <h3 className="font-medium mb-3">Floors</h3>

      {/* SEARCH */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search floors..."
          className="w-full h-10 pl-9 pr-3 border rounded-md text-sm"
        />
      </div>

      {/* TREE */}
      <div className="text-sm space-y-3">
        {sites.map((site) => (
          <div key={site.site_id}>
            {/* OFFICE */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={async () => {
                const isOpen = expandedOffice === site.site_id;

                setExpandedOffice(isOpen ? null : site.site_id);

                if (!isOpen && !buildings[site.site_id]) {
                  const data = await getBuildings(site.site_id);
                  setBuildings((prev) => ({
                    ...prev,
                    [site.site_id]: data,
                  }));
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{site.site_name}</span>
              </div>

              {expandedOffice === site.site_id ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>

            {/* TOWERS */}
            {expandedOffice === site.site_id && (
              <div className="ml-5 mt-2 space-y-2">
                {(buildings[site.site_id] || []).map((building) => (
                  <div key={building.building_id}>
                    {/* TOWER */}
                   <div
  className="flex items-center justify-between cursor-pointer"
  onClick={async () => {
    const isOpen = expandedTower === building.building_id;

    setExpandedTower(isOpen ? null : building.building_id);

    if (!isOpen && !floors[building.building_id]) {
      const data = await getFloors(building.building_id);
      setFloors((prev) => ({
        ...prev,
        [building.building_id]: data,
      }));
    }
  }}
>
                      <span>{building.building_name}</span>

                      {expandedTower === building.building_id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* FLOORS */}
                    {expandedTower === building.building_id && (
                      <div className="ml-5 mt-2 space-y-1">
                        {(floors[building.building_id] || [])
                          .filter((f: Floor) =>
                            f.floor_name
                              ?.toLowerCase()
                              .includes(search.toLowerCase())
                          )
                          .map((floor: Floor) => (
                            <div
                              key={floor.floor_id}
                              onClick={() => {
  setSelectedFloor(floor.floor_id);

  onSelect({
    siteId: site.site_id,
    buildingId: building.building_id,
    floorId: floor.floor_id,   // ✅ IMPORTANT FIX

    siteName: site.site_name,
    buildingName: building.building_name,
    floorName: floor.floor_name,
  });
}}
                              className={`cursor-pointer px-2 py-1 rounded ${
                                selectedFloor === floor.floor_id
                                  ? "bg-indigo-100 text-indigo-600"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              {floor.floor_name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}