"use client";

import { useState } from "react";

export const useLayoutForm = () => {
  const [formData, setFormData] = useState({
    site: "",
    building: "",
    floor: "",
    layoutName: "",
  });

  return {
    formData,
    setFormData,
  };
};