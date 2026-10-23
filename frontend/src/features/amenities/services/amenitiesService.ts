import { axiosInstance } from "@/lib/http/axios";

import {
  Amenity,
  AmenitiesResponse,
  CreateAmenityPayload,
  UpdateAmenityPayload,
  PreferencesResponse,
  AmenityCategoryResponse,
} from "../types/amenities.types";

export const amenitiesService = {
  // GET AMENITIES
  async getAmenities(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<AmenitiesResponse> {
    const { data } = await axiosInstance.get(
      "/amenities",
      {
        params,
      }
    );

    return data;
  },

  // GET PREFERENCES -- the active-amenity catalog, reusing the same
  // endpoint and data as the admin amenities list (status=active).
  async getPreferences(): Promise<PreferencesResponse> {
    const { data } = await axiosInstance.get("/amenities", {
      params: { status: "active", limit: 200 },
    });

    return {
      amenities: (data.items ?? []).map((a: Amenity) => ({
        id: a.amenity_id,
        key: a.amenity_key,
        name: a.amenity_name,
        category: a.category_name,
        description: a.description,
        icon: a.icon_name,
        applicable_seat_types: a.applicable_seat_types,
      })),
    };
  },

  // CREATE AMENITY
  async createAmenity(
    payload: CreateAmenityPayload
  ): Promise<Amenity> {
    const { data } = await axiosInstance.post(
      "/amenities",
      payload
    );

    return data;
  },

  // UPDATE AMENITY
  async updateAmenity(
    amenity_id: string,
    payload: UpdateAmenityPayload
  ): Promise<Amenity> {
    const { data } = await axiosInstance.patch(
      `/amenities/${amenity_id}`,
      payload
    );

    return data;
  },

  // Get categories for dropdown
  async getCategories(): Promise<AmenityCategoryResponse> {
    const { data } = await axiosInstance.get(
      "/amenity-categories",
      {
        params: {
          "is_active": true,
           page: 1,
           limit: 100,
        },
      }
    );
    return data;
  },
};