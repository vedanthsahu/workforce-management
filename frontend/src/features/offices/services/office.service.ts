import axios from "axios";
import { Office } from "../types/office.types";

const API_URL = "http://localhost:8000";

// 🔥 GET OFFICES (WITH SEARCH)
export const getOffices = async (
  search: string = ""
): Promise<Office[]> => {
  const response = await axios.get(`${API_URL}/sites`, {
    params: {
      page: 1,
      status: "ACTIVE",
      search: search || undefined, // only send if exists
    },
  });

  // 🔥 TRANSFORM BACKEND → FRONTEND
  return response.data.map((item: any) => ({
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
};