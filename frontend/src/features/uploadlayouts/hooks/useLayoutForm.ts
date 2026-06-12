"use client";

import { useState } from "react";
import { LayoutFormState } from "../types/layout.types";

interface UseLayoutFormOptions {
  initialSiteId?: number | null;
  initialBuildingId?: number | null;
  initialFloorId?: number | null;
}

export const useLayoutForm = (options: UseLayoutFormOptions = {}) => {
  const { initialSiteId, initialBuildingId, initialFloorId } = options;

  const [formData, setFormData] = useState<LayoutFormState>({
    // Pre-seed IDs from URL params; names are resolved inside LayoutForm on mount
    site: initialSiteId ? { id: initialSiteId, name: "" } : null,
    building: initialBuildingId ? { id: initialBuildingId, name: "" } : null,
    floor: initialFloorId ? { id: initialFloorId, name: "" } : null,
    layoutName: "",
    file: null,
  });

  return {
    formData,
    setFormData,
  };
};
