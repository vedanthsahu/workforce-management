import { useEffect, useState } from "react";

import { amenitiesService } from "../services/amenitiesService";
import { Amenity, AmenityCategory } from "../types/amenities.types";

export const useEditAmenity = (
  amenity: Amenity | null,
  open: boolean,
  onSuccess?: () => void
) => {
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<AmenityCategory[]>([]);

  const [formData, setFormData] = useState({
    amenity_name: "",
    description: "",
    icon_name: "",
    category_id: "",
    is_active: true,
  });

  const fetchCategories = async () => {
    try {
      const response = await amenitiesService.getCategories();
      setCategories(response.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  // Re-sync from the source amenity every time the modal opens — not just
  // when `amenity` changes — so a Cancel discards any unsaved status/field
  // edits instead of leaving them staged for the next open. The modal stays
  // mounted between opens (parent only toggles `open`), so an
  // `[amenity]`-only effect would only run once per amenity.
  useEffect(() => {
    if (!open) return;

    fetchCategories();

    if (!amenity) return;

    setFormData({
      amenity_name: amenity.amenity_name,
      description: amenity.description,
      icon_name: amenity.icon_name,
      category_id: amenity.category_id,
      is_active: amenity.is_active,
    });
  }, [open, amenity]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!amenity) return false;

    try {
      setLoading(true);

      await amenitiesService.updateAmenity(amenity.amenity_id, {
        amenity_name: formData.amenity_name,
        description: formData.description,
        icon_name: formData.icon_name,
        category_id: Number(formData.category_id),
        is_active: formData.is_active,
      });

      onSuccess?.();

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
    categories,
    handleChange,
    handleUpdate,
  };
};
