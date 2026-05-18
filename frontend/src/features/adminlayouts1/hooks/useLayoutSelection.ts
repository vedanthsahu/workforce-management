"use client";

import { useState } from "react";

export type LayoutSelection = {
  office: string;
  tower: string;
  floor: string;
};

export const useLayoutSelection = () => {
  const [selection, setSelection] = useState<LayoutSelection>({
    office: "Hyderabad Office",
    tower: "Tower 1",
    floor: "3rd Floor",
  });

  return {
    selection,
    setSelection,
  };
};