
    // const BASE_URL = "http://localhost:8000"; //  backend URL

    // export const getSites = async () => {
    //   const res = await fetch(`${BASE_URL}/sites`, {
    //     credentials: "include",
    //   });

    //   if (!res.ok) {
    //     throw new Error("Failed to fetch sites");
    //   }

    //   return res.json();
    // };

    // export const getBuildings = async (siteId: string) => {
    //   const res = await fetch(`${BASE_URL}/buildings?site_id=${siteId}`, {
    //     credentials: "include",
    //   });

    //   if (!res.ok) {
    //     throw new Error("Failed to fetch buildings");
    //   }

    //   return res.json();
    // };

    // export const getFloors = async (buildingId: string) => {
    //   const res = await fetch(
    //     `${BASE_URL}/buildings/${buildingId}/floors`,
    //     {
    //       credentials: "include",
    //     }
    //   );

    //   if (!res.ok) {
    //     throw new Error("Failed to fetch floors");
    //   }

    //   return res.json();
    // };


    // export const getLayoutsByFloor = async (floorId: string) => {
    //   const res = await fetch(
    //     `http://localhost:8000/admin/floor-layouts/floors/${floorId}`,
    //     {
    //       credentials: "include",
    //     }
    //   );

    //   if (!res.ok) {
    //     throw new Error("Failed to fetch layouts");
    //   }

    //   return res.json();
    // };
import { axiosInstance } from "@/lib/http/axios";
import { LayoutApiResponse, LayoutTableItem } from "@/features/adminlayouts1/types/layout.types";


const BASE_URL = "http://localhost:8000"; // axios already has baseURL configured

export const getSites = async () => {
  const res = await axiosInstance.get(`/sites`);
  return res.data;
};

export const getBuildings = async (siteId: string) => {
  const res = await axiosInstance.get(`/buildings`, {
    params: { site_id: siteId },
  });
  return res.data;
};

export const getFloors = async (buildingId: string) => {
  const res = await axiosInstance.get(`/buildings/${buildingId}/floors`);
  return res.data;
};

export const getLayoutsByFloor = async (floorId: string) => {
  const res = await axiosInstance.get(
    `${BASE_URL}/admin/floor-layouts/floors/${floorId}`
  );
  return res.data;
};
export const getLayoutsByFloor1 = async (
  floorId: string
): Promise<LayoutTableItem[]> => {
  const res = await axiosInstance.get(
    `/admin/floor-layouts/floors/${floorId}`
  );

  return res.data.map((item: LayoutApiResponse) => ({
    id: item.layout_id,
    name: item.layout_name,
    version: item.version_no,
    status: item.status,
    published: item.is_published ? "Yes" : "No",
    date: new Date(item.created_at).toLocaleString(),
    user: item.uploaded_by_user_id,
    file: item.layout_file_url,
  }));
};