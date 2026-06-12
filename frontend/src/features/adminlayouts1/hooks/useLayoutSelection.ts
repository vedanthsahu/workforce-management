"use client";

import { useState, useCallback } from "react";

export type LayoutSelection = {
  siteId:       string;
  buildingId:   string;
  floorId:      string;
  siteName:     string;
  buildingName: string;
  floorName:    string;
};

const DEFAULT_SELECTION: LayoutSelection = {
  siteId:       "",
  buildingId:   "",
  floorId:      "",
  siteName:     "",
  buildingName: "",
  floorName:    "",
};

// FIX: Accepts an optional lazy initializer function.
// This lets FloorLayoutsPage seed the correct initial value (URL params
// or localStorage) at creation time — avoiding the double-render that
// the old useEffect restore pattern caused.
export const useLayoutSelection = (initializer?: () => LayoutSelection) => {
  const [selection, setSelectionRaw] = useState<LayoutSelection>(
    () => (initializer ? initializer() : DEFAULT_SELECTION)
  );

  // Stable setter reference — won't cause child re-renders
  const setSelection = useCallback((next: LayoutSelection) => {
    setSelectionRaw(next);
  }, []);

  return { selection, setSelection };
};