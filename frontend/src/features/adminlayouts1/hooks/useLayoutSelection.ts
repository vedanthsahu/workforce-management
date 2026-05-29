"use client";

import { useState } from "react";

export type LayoutSelection = {
  siteId: string;
  buildingId: string;
  floorId: string;
  siteName: string;
  buildingName: string;
  floorName: string;
};

export const useLayoutSelection = () => {
  const [selection, setSelection] = useState<LayoutSelection>({
    siteId: "",
    buildingId: "",
    floorId: "",
    siteName: "",
    buildingName: "",
    floorName: "",
  });

  return { selection, setSelection };
};