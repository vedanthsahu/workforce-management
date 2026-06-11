"use client";

import { useEffect, useState } from "react";
import {
  getSites,
  getBuildings,
  getFloors,
} from "@/features/adminlayouts1/services/locationService";

export default function LayoutFilters({ onChange }: any) {
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);

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
   <div className="bg-white border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      
      {/* SITE */}
      <select
        value={selectedSite}
        onChange={(e) => handleSiteChange(e.target.value)}
        className="h-10 border rounded-md px-3 text-sm"
      >
        <option value="">All Sites</option>
        {sites.map((s: any) => (
          <option key={s.site_id} value={s.site_id}>
            {s.site_name}
          </option>
        ))}
      </select>

      {/* BUILDING */}
      <select
        value={selectedBuilding}
        onChange={(e) => handleBuildingChange(e.target.value)}
        className="h-10 border rounded-md px-3 text-sm"
      >
        <option value="">All Buildings</option>
        {buildings.map((b: any) => (
          <option key={b.building_id} value={b.building_id}>
            {b.building_name}
          </option>
        ))}
      </select>

      {/* FLOOR */}
      <select
        value={selectedFloor}
        onChange={(e) => handleFloorChange(e.target.value)}
        className="h-10 border rounded-md px-3 text-sm"
      >
        <option value="">All Floors</option>
        {floors.map((f: any) => (
          <option key={f.floor_id} value={f.floor_id}>
            {f.floor_name}
          </option>
        ))}
      </select>

      {/* STATUS */}
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="h-10 border rounded-md px-3 text-sm"
      >
        <option value="">All Status</option>
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
        <option value="ARCHIVED">Archived</option>
      </select>
    </div>
  );
}