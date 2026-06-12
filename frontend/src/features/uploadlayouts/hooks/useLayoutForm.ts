"use client";

import { useState } from "react";

type SelectOption = {
  id:    number;
  name:  string;
  code?: string;
};

type LayoutFormState = {
  site:        SelectOption | null;
  building:    SelectOption | null;
  floor:       SelectOption | null;
  layoutName:  string;
  description: string;
  file:        File | null;
};

interface UseLayoutFormOptions {
  initialSiteId?:     number | null;
  initialBuildingId?: number | null;
  initialFloorId?:    number | null;
}

export const useLayoutForm = (options: UseLayoutFormOptions = {}) => {
  const { initialSiteId, initialBuildingId, initialFloorId } = options;

  const [formData, setFormData] = useState<LayoutFormState>({
    site:        initialSiteId     ? { id: initialSiteId,     name: "", code: "" } : null,
    building:    initialBuildingId ? { id: initialBuildingId, name: "", code: "" } : null,
    floor:       initialFloorId    ? { id: initialFloorId,    name: "", code: "" } : null,
    layoutName:  "",   // ← always a string, never undefined
    description: "",   // ← always a string, never undefined
    file:        null,
  });

  return {
    formData,
    setFormData,
  };
};