import { useEffect, useState } from "react";
import { toast } from "sonner";

import { amenitiesService } from "../services/amenitiesService";
import { Amenity } from "../types/amenities.types";

export const useEditAmenity = (
  amenity: Amenity | null,
  onSuccess?: () => void
) => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    amenity_name: "",
    description: "",
    icon_name: "",
    category_id: "",
    is_active: true,
  });

  useEffect(() => {
    if (!amenity) return;

    setFormData({
      amenity_name: amenity.amenity_name,
      description: amenity.description,
      icon_name: amenity.icon_name,
      category_id: amenity.category_id,
      is_active: amenity.is_active,
    });
  }, [amenity]);

  const handleChange = (
    field: string,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate = async () => {
    if (!amenity) return;

    try {
      setLoading(true);

      await amenitiesService.updateAmenity(
        amenity.amenity_id,
        {
          amenity_name:
            formData.amenity_name,
          description:
            formData.description,
          icon_name:
            formData.icon_name,
          category_id: Number(
            formData.category_id
          ),
          is_active:
            formData.is_active,
        }
      );

      toast.success(
        "Amenity updated successfully"
      );

      onSuccess?.();
    } catch (error) {
      toast.error(
        "Failed to update amenity"
      );
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