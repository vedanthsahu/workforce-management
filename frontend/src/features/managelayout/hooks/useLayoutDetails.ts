// hooks/useLayoutDetails.ts

import { useEffect, useState } from "react";
import { getLayoutsByFloor } from "../services/layoutService";
import { Layout } from "../types/layout.types";

export const useLayoutDetails = (
  layoutId: string | null,
  floorId: string | null
) => {
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    if (!layoutId || !floorId) return;

    loadLayout();
  }, [layoutId, floorId]);

  const loadLayout = async () => {
    try {
      const data = await getLayoutsByFloor(floorId!);

      const selected = data.find(
        (item: Layout) => item.layout_id === layoutId
      );

      setLayout(selected || null);
    } catch (err) {
      console.error(err);
    }
  };

  return { layout };
};