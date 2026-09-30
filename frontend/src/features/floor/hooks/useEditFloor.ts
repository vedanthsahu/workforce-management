import { useEffect, useState } from "react";

import { floorService } from "../services/floorService";
import { buildingService } from "@/features/building/services/buildingService";
import { officeService } from "@/features/offices/services/office.service";
import { Floor } from "../types/floor.types";

type AncestorInfo = { name: string; status: string };

export const useEditFloor = (floor: Floor, open: boolean) => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    floor_name: "",
    status: "ACTIVE",
  });

  // Read-only ancestor context: a floor has no children to cascade to, so
  // there's nothing to select here -- just the office and building it
  // belongs to, and their current status, for the same reason as the
  // Building modal's office row (explains why reactivating this floor may
  // be rejected if either ancestor is still INACTIVE).
  const [officeInfo, setOfficeInfo] = useState<AncestorInfo | null>(null);
  const [buildingInfo, setBuildingInfo] = useState<AncestorInfo | null>(null);
  const [ancestorsLoading, setAncestorsLoading] = useState(false);

  // Re-sync from the source floor every time the modal opens — not just
  // when `floor` changes — so a Cancel discards any unsaved dropdown edits
  // instead of leaving them staged for the next open. The modal stays
  // mounted between opens (parent only toggles `open`), so a `[floor]`-only
  // effect would only run once per floor.
  useEffect(() => {
    if (!open || !floor) return;

    setFormData({
      floor_name: floor.floor_name,
      status: floor.status,
    });
  }, [open, floor]);

  useEffect(() => {
    if (!open || !floor) {
      setOfficeInfo(null);
      setBuildingInfo(null);
      return;
    }
    let cancelled = false;
    setAncestorsLoading(true);
    Promise.all([
      officeService.getSiteById(floor.site_id),
      buildingService.getBuildings({ site_id: Number(floor.site_id) }),
    ])
      .then(([site, buildings]) => {
        if (cancelled) return;
        setOfficeInfo({ name: site.site_name, status: site.status });
        const building = buildings.find((b) => b.building_id === floor.building_id);
        setBuildingInfo(
          building
            ? { name: building.building_name, status: building.status }
            : { name: floor.building_name, status: "" }
        );
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setAncestorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, floor]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isReactivating = open && floor.status === "INACTIVE" && formData.status === "ACTIVE";
  // Either ancestor being INACTIVE means this floor can't go ACTIVE unless
  // the save also brings that ancestor back -- shown as a locked,
  // always-checked row in the checklist (see EditFloorModal), not a choice.
  const officeNeedsReactivation = isReactivating && officeInfo?.status === "INACTIVE";
  const buildingNeedsReactivation = isReactivating && buildingInfo?.status === "INACTIVE";

  const handleUpdate = async () => {
    try {
      setLoading(true);

      await floorService.updateFloor(floor.floor_id, {
        floor_name: formData.floor_name,
        status: formData.status,
        ...(officeNeedsReactivation ? { reactivate_office: true } : {}),
        ...(buildingNeedsReactivation ? { reactivate_building: true } : {}),
      });

      return true;
    } catch (error) {
      console.error(error);

      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    formData,
    officeInfo,
    buildingInfo,
    ancestorsLoading,
    isReactivating,
    officeNeedsReactivation,
    buildingNeedsReactivation,
    handleChange,
    handleUpdate,
  };
};
