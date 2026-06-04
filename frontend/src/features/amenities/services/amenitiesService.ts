import { axiosInstance } from "@/lib/http/axios";

import {
  Amenity,
  AmenitiesResponse,
  CreateAmenityPayload,
  UpdateAmenityPayload,
  PreferencesResponse,
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

  // GET PREFERENCES
  async getPreferences(): Promise<PreferencesResponse> {
    const { data } = await axiosInstance.get(
      "/preferences"
    );

    return data;
  },

  // CREATE AMENITY
  async createAmenity(
    payload: CreateAmenityPayload
  ) {
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
  ) {
    const { data } = await axiosInstance.patch(
      `/amenities/${amenity_id}`,
      payload
    );

    return data;
  },

  // Get categories for dropdown
  async getCategories() {
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