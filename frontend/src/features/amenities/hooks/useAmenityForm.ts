// import { useEffect, useState } from "react";
// import { toast } from "sonner";

// import { amenitiesService } from "../services/amenitiesService";
// import { PreferenceAmenity } from "../types/amenities.types";

// export const useAmenityForm = () => {
//   const [loading, setLoading] = useState(false);

//   const [preferences, setPreferences] = useState<
//     PreferenceAmenity[]
//   >([]);

//   const [formData, setFormData] = useState({
//     amenity_key: "",
//     amenity_name: "",
//     description: "",
//     icon_name: "",
//     category_id: "",
//     is_active: true,
//   });

//   const fetchPreferences = async () => {
//     try {
//       const response =
//         await amenitiesService.getPreferences();

//       setPreferences(response.amenities);
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   useEffect(() => {
//     fetchPreferences();
//   }, []);

//   const handleChange = (
//     field: string,
//     value: string | boolean
//   ) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const handleSubmit = async () => {
//     try {
//       setLoading(true);

//       await amenitiesService.createAmenity({
//         ...formData,
//         category_id: Number(
//           formData.category_id
//         ),
//       });

//       toast.success(
//         "Amenity created successfully"
//       );

//       return true;
//     } catch (error) {
//       toast.error("Failed to create amenity");
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     loading,
//     formData,
//     preferences,

//     handleChange,
//     handleSubmit,
//   };
// };



import { useEffect, useState } from "react";
import { toast } from "sonner";

import { amenitiesService } from "../services/amenitiesService";

export const useAmenityForm = () => {
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [categories, setCategories] =
    useState<any[]>([]);

  const [formData, setFormData] = useState({
    amenity_key: "",
    amenity_name: "",
    description: "",
    icon_name: "",
    category_id: "",
    is_active: true,
  });

  const fetchCategories = async () => {
    try {
      const response =
        await amenitiesService.getCategories();

      setCategories(response.items || []);
    } catch (error) {
      console.error(
        "Failed to fetch categories",
        error
      );
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (
    field: string,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
  try {
    setLoading(true);
    setErrorMessage("");

    await amenitiesService.createAmenity({
      ...formData,
      category_id: Number(
        formData.category_id
      ),
    });

    toast.success(
      "Amenity created successfully"
    );

    return true;
  } catch (error: any) {
    const message =
      error?.response?.data?.error?.code ||
      "Failed to create amenity";

    setErrorMessage(message);

    return false;
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