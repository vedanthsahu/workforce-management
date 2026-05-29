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

export const useLayoutForm = () => {
  const [formData, setFormData] = useState<LayoutFormState>({
    site: null,
    building: null,
    floor: null,
    layoutName: "",
    file: null,
  });

  return {
    formData,
    setFormData,
  };
};