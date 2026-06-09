import { useEffect, useState } from "react";
import { toast } from "sonner";

import { floorService } from "../services/floorService";

export const useEditFloor = (
  floor: any,
  onSuccess?: () => void
) => {
  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      floor_name: "",
      status: "ACTIVE",
    });

  useEffect(() => {
    if (!floor) return;

    setFormData({
      floor_name:
        floor.floor_name,
      status: floor.status,
    });
  }, [floor]);

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);

      await floorService.updateFloor(
        floor.floor_id,
        {
          floor_name:
            formData.floor_name,
          status:
            formData.status,
        }
      );

      // toast.success(
      //   "Floor updated successfully"
      // );

      // onSuccess?.();

      return true;
    } catch (error) {
      toast.error(
        "Failed to update floor"
      );

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