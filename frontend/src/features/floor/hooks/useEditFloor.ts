import { useEffect, useState } from "react";

import { floorService } from "../services/floorService";
import { Floor } from "../types/floor.types";

export const useEditFloor = (floor: Floor) => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    floor_name: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (!floor) return;

    setFormData({
      floor_name: floor.floor_name,
      status: floor.status,
    });
  }, [floor]);

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
