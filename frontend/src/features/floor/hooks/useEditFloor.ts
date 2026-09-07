import { useEffect, useState } from "react";

import { floorService } from "../services/floorService";
import { Floor } from "../types/floor.types";

export const useEditFloor = (floor: Floor, open: boolean) => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    floor_name: "",
    status: "ACTIVE",
  });

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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);

      await floorService.updateFloor(floor.floor_id, {
        floor_name: formData.floor_name,
        status: formData.status,
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
    handleChange,
    handleUpdate,
  };
};
