"use client";

import { useEffect, useState } from "react";
import {
  getSites,
  getBuildings,
  getFloors,
} from "@/features/adminlayouts1/services/locationService";
import { Site, Building, Floor } from "@/features/adminlayouts1/types/layout.types";

type Props = {
  onChange: (filters: {
    siteId: string;
    buildingId: string;
    floorId: string;
    status: string;
  }) => void;
};

export default function LayoutFilters({ onChange }: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  const [selectedSite, setSelectedSite] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    const data = await getSites();
    setSites(data);
  };

  const handleSiteChange = async (siteId: string) => {
    setSelectedSite(siteId);
    setSelectedBuilding("");
    setSelectedFloor("");

    const data = await getBuildings(siteId);
    setBuildings(data);
    setFloors([]);

    triggerChange(siteId, "", "", status);
  };

  const handleBuildingChange = async (buildingId: string) => {
    setSelectedBuilding(buildingId);
    setSelectedFloor("");

    const data = await getFloors(buildingId);
    setFloors(data);

    triggerChange(selectedSite, buildingId, "", status);
  };

  const handleFloorChange = (floorId: string) => {
    setSelectedFloor(floorId);
    triggerChange(selectedSite, selectedBuilding, floorId, status);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    triggerChange(selectedSite, selectedBuilding, selectedFloor, value);
  };

  const triggerChange = (
    siteId: string,
    buildingId: string,
    floorId: string,
    status: string
  ) => {
    onChange({
      siteId,
      buildingId,
      floorId,
      status,
    });
  };

  return (
    <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3">

      {/* SITE */}
      <select
        value={selectedSite}
        onChange={(e) => handleSiteChange(e.target.value)}
        className="h-9 w-44 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>Select Site</option>
        {sites.map((s) => (
          <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
        ))}
      </select>

      {/* BUILDING */}
      <select
        value={selectedBuilding}
        onChange={(e) => handleBuildingChange(e.target.value)}
        className="h-9 w-44 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>Select Building</option>
        {buildings.map((b) => (
          <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
        ))}
      </select>

      {/* FLOOR */}
      <select
        value={selectedFloor}
        onChange={(e) => handleFloorChange(e.target.value)}
        className="h-9 w-44 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>Select Floor</option>
        {floors.map((f) => (
          <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>
        ))}
      </select>

      {/* STATUS */}
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="h-9 w-44 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>Select Status</option>
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
        <option value="ARCHIVED">Archived</option>
      </select>
    </div>
  );
}