// "use client";

// import { useState } from "react";

// type SelectOption = {
//   id: number;
//   name: string;
// };

// type LayoutFormState = {
//   site: SelectOption | null;
//   building: SelectOption | null;
//   floor: SelectOption | null;
//   layoutName: string;
//   file: File | null;
// };

// export const useLayoutForm = () => {
//   const [formData, setFormData] = useState<LayoutFormState>({
//     site: null,
//     building: null,
//     floor: null,
//     layoutName: "",
//     file: null,
//   });

//   return {
//     formData,
//     setFormData,
//   };
// };

"use client";

import { useState } from "react";

type SelectOption = {
  id: number;
  name: string;
};

type LayoutFormState = {
  site: SelectOption | null;
  building: SelectOption | null;
  floor: SelectOption | null;
  layoutName: string;
  file: File | null;
};

interface UseLayoutFormOptions {
  initialSiteId?:     number | null;
  initialBuildingId?: number | null;
  initialFloorId?:    number | null;
}

export const useLayoutForm = (options: UseLayoutFormOptions = {}) => {
  const { initialSiteId, initialBuildingId, initialFloorId } = options;

  const [formData, setFormData] = useState<LayoutFormState>({
    // Pre-seed IDs from URL params; names are resolved inside LayoutForm on mount
    site:       initialSiteId     ? { id: initialSiteId,     name: "" } : null,
    building:   initialBuildingId ? { id: initialBuildingId, name: "" } : null,
    floor:      initialFloorId    ? { id: initialFloorId,    name: "" } : null,
    layoutName: "",
    file:       null,
  });

  return {
    formData,
    setFormData,
  };
};