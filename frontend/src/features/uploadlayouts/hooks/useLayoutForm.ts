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
    site: initialSiteId ? { id: initialSiteId, name: "", code: "" } : null,
    building: initialBuildingId ? { id: initialBuildingId, name: "", code: "" } : null,
    floor: initialFloorId ? { id: initialFloorId, name: "", code: "" } : null,
    layoutName: "",
    description: "",
    file: null,
  });

  return {
    formData,
    setFormData,
  };
};
