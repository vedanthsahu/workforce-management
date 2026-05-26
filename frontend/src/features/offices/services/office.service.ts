import axios from "axios";
import { Office } from "../types/office.types";

const API_URL = "http://localhost:8000";

export const getOffices = async (
  search: string = ""
): Promise<Office[]> => {
  try {
    const response = await axios.get(`${API_URL}/sites`, {
      params: {
        page: 1,
        search: search || undefined,
      },
    });

    console.log("API RAW DATA:", response.data); // 🔥 DEBUG

    // 🔥 IMPORTANT: ensure it's array
    const apiData = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];

    return apiData.map((item: any) => ({
      id: item.site_id,
      code: item.site_code,
      name: item.site_name,
      city: item.city,
      country: item.country,
      timezone: item.timezone,

      buildings: item.building_count,
      floors: item.floor_count,
      seats: item.seat_count,

      status: item.status,
    }));
  } catch (error) {
    console.error("API ERROR:", error);
    return [];
  }
};