import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { amenitiesService } from "../services/amenitiesService";
import { AmenityCategory, AmenityFormData } from "../types/amenities.types";

export const useAmenityForm = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [categories, setCategories] = useState<AmenityCategory[]>([]);

  const [formData, setFormData] = useState<AmenityFormData>({
    amenity_key: "",
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
      console.error("Failed to fetch categories", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (): Promise<string | null> => {
    try {
      setLoading(true);
      setErrorMessage("");

      const created = await amenitiesService.createAmenity({
        ...formData,
        category_id: Number(formData.category_id),
      });

      toast.success("Amenity created successfully");

      return created?.amenity_id ?? null;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.code
        : undefined;
      setErrorMessage(message || "Failed to create amenity");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    errorMessage,
    formData,
    categories,
    handleChange,
    handleSubmit,
  };
};
