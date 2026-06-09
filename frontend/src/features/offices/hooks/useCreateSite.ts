"use client";

import { useState } from "react";
import { officeService } from "../services/office.service";
import { CreateOfficePayload } from "../types/office.types";

export default function useCreateSite() {
  const [loading, setLoading] = useState(false);

  const createSite = async (
    payload: CreateOfficePayload
  ) => {
    try {
      setLoading(true);

      return await officeService.createSite(
        payload
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createSite,
  };
}