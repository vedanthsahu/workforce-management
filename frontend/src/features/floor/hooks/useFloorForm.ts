import { useEffect, useState } from "react";
import { toast } from "sonner";

import { floorService } from "../services/floorService";

export const useFloorForm = () => {
  const [loading, setLoading] = useState(false);

  const [sites, setSites] = useState<any[]>([]);
  const [buildings, setBuildings] =
    useState<any[]>([]);

  const [formData, setFormData] =
    useState({
      site_id: "",
      building_id: "",
      floor_code: "",
      floor_name: "",
      status: "ACTIVE",
    });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response =
        await floorService.getSites();

      setSites(
        response.filter(
          (site: any) =>
            site.status === "ACTIVE"
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBuildings = async (
    siteId: string
  ) => {
    try {
      const response =
        await floorService.getBuildings(
          Number(siteId)
        );

      setBuildings(response);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = async (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "site_id") {
      setFormData((prev) => ({
        ...prev,
        site_id: value,
        building_id: "",
      }));

      await fetchBuildings(value);
    }
  };

 const handleSubmit = async () => {
  try {
    setLoading(true);

    const createdFloor =
      await floorService.createFloor({
        site_id: Number(
          formData.site_id
        ),
        building_id: Number(
          formData.building_id
        ),
        floor_code:
          formData.floor_code,
        floor_name:
          formData.floor_name,
        status: formData.status,
      });

    console.log(
      "createdFloor",
      createdFloor
    );

    sessionStorage.setItem(
      "floorSelection",
      JSON.stringify({
        site_id: formData.site_id,
        building_id:
          formData.building_id,
      })
    );

    toast.success(
      "Floor created successfully"
    );

   return createdFloor.floor_id;
  } catch (error) {
    toast.error(
      "Failed to create floor"
    );

    return null;
  } finally {
    setLoading(false);
  }
};

  return {
    loading,
    sites,
    buildings,
    formData,
    handleChange,
    handleSubmit,
  };
};