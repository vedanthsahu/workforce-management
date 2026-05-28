// // // // // // hooks/useLayoutDetails.ts

// // // // // import { useEffect, useState } from "react";
// // // // // import { getLayoutsByFloor } from "../services/layoutService";
// // // // // import { Layout } from "../types/layout.types";

// // // // // export const useLayoutDetails = (
// // // // //   layoutId: string | null,
// // // // //   floorId: string | null
// // // // // ) => {
// // // // //   const [layout, setLayout] = useState<Layout | null>(null);

// // // // //   useEffect(() => {
// // // // //     if (!layoutId || !floorId) return;

// // // // //     loadLayout();
// // // // //   }, [layoutId, floorId]);

// // // // //   const loadLayout = async () => {
// // // // //     try {
// // // // //       const data = await getLayoutsByFloor(floorId!);

// // // // //       const selected = data.find(
// // // // //         (item: Layout) => item.layout_id === layoutId
// // // // //       );

// // // // //       setLayout(selected || null);
// // // // //     } catch (err) {
// // // // //       console.error(err);
// // // // //     }
// // // // //   };

// // // // //   return { layout };
// // // // // };

// // // // import { useState, useEffect } from "react";
// // // // import { Building, Floor, Layout, Site } from "../types/layout.types";
// // // // import { fetchBuildings, fetchFloors, fetchSites, getLayoutsByFloor } from "../services/layoutService";


// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // // useCascadeLocation
// // // // // ─────────────────────────────────────────────────────────────────────────────

// // // // interface UseCascadeLocationReturn {
// // // //   sites: Site[];
// // // //   buildings: Building[];
// // // //   floors: Floor[];
// // // //   selectedSiteId: string;
// // // //   selectedBuildingId: string;
// // // //   selectedFloorId: string;
// // // //   setSelectedSiteId: (id: string) => void;
// // // //   setSelectedBuildingId: (id: string) => void;
// // // //   setSelectedFloorId: (id: string) => void;
// // // //   loadingSites: boolean;
// // // //   loadingBuildings: boolean;
// // // //   loadingFloors: boolean;
// // // // }

// // // // export function useCascadeLocation(): UseCascadeLocationReturn {
// // // //   const [sites, setSites] = useState<Site[]>([]);
// // // //   const [buildings, setBuildings] = useState<Building[]>([]);
// // // //   const [floors, setFloors] = useState<Floor[]>([]);
// // // //   const [selectedSiteId, setSelectedSiteId] = useState("");
// // // //   const [selectedBuildingId, setSelectedBuildingId] = useState("");
// // // //   const [selectedFloorId, setSelectedFloorId] = useState("");
// // // //   const [loadingSites, setLoadingSites] = useState(false);
// // // //   const [loadingBuildings, setLoadingBuildings] = useState(false);
// // // //   const [loadingFloors, setLoadingFloors] = useState(false);

// // // //   // load sites on mount
// // // //   useEffect(() => {
// // // //     setLoadingSites(true);
// // // //     fetchSites()
// // // //       .then((data) => {
// // // //         setSites(data);
// // // //         if (data.length > 0) setSelectedSiteId(data[0].id);
// // // //       })
// // // //       .catch(console.error)
// // // //       .finally(() => setLoadingSites(false));
// // // //   }, []);

// // // //   // load buildings when site changes
// // // //   useEffect(() => {
// // // //     if (!selectedSiteId) return;
// // // //     setBuildings([]);
// // // //     setFloors([]);
// // // //     setSelectedBuildingId("");
// // // //     setSelectedFloorId("");
// // // //     setLoadingBuildings(true);
// // // //     fetchBuildings(selectedSiteId)
// // // //       .then((data) => {
// // // //         setBuildings(data);
// // // //         if (data.length > 0) setSelectedBuildingId(data[0].id);
// // // //       })
// // // //       .catch(console.error)
// // // //       .finally(() => setLoadingBuildings(false));
// // // //   }, [selectedSiteId]);

// // // //   // load floors when building changes
// // // //   useEffect(() => {
// // // //     if (!selectedBuildingId) return;
// // // //     setFloors([]);
// // // //     setSelectedFloorId("");
// // // //     setLoadingFloors(true);
// // // //     fetchFloors(selectedBuildingId)
// // // //       .then((data) => {
// // // //         setFloors(data);
// // // //         if (data.length > 0) setSelectedFloorId(data[0].id);
// // // //       })
// // // //       .catch(console.error)
// // // //       .finally(() => setLoadingFloors(false));
// // // //   }, [selectedBuildingId]);

// // // //   return {
// // // //     sites,
// // // //     buildings,
// // // //     floors,
// // // //     selectedSiteId,
// // // //     selectedBuildingId,
// // // //     selectedFloorId,
// // // //     setSelectedSiteId,
// // // //     setSelectedBuildingId,
// // // //     setSelectedFloorId,
// // // //     loadingSites,
// // // //     loadingBuildings,
// // // //     loadingFloors,
// // // //   };
// // // // }

// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // // useFloorLayouts
// // // // // ─────────────────────────────────────────────────────────────────────────────

// // // // interface UseFloorLayoutsReturn {
// // // //   layouts: Layout[];
// // // //   selectedLayoutId: string;
// // // //   selectedLayout: Layout | null;
// // // //   setSelectedLayoutId: (id: string) => void;
// // // //   loading: boolean;
// // // // }

// // // // export function useFloorLayouts(floorId: string): UseFloorLayoutsReturn {
// // // //   const [layouts, setLayouts] = useState<Layout[]>([]);
// // // //   const [selectedLayoutId, setSelectedLayoutId] = useState("");
// // // //   const [loading, setLoading] = useState(false);

// // // //   useEffect(() => {
// // // //     if (!floorId) {
// // // //       setLayouts([]);
// // // //       setSelectedLayoutId("");
// // // //       return;
// // // //     }
// // // //     setLoading(true);
// // // //     setLayouts([]);
// // // //     setSelectedLayoutId("");
// // // //     getLayoutsByFloor(floorId)
// // // //       .then((data) => {
// // // //         setLayouts(data);
// // // //         const published = data.find((l) => l.is_published);
// // // //         const autoSelect = published ?? data[0];
// // // //         if (autoSelect) setSelectedLayoutId(autoSelect.layout_id);
// // // //       })
// // // //       .catch(console.error)
// // // //       .finally(() => setLoading(false));
// // // //   }, [floorId]);

// // // //   const selectedLayout =
// // // //     layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

// // // //   return {
// // // //     layouts,
// // // //     selectedLayoutId,
// // // //     selectedLayout,
// // // //     setSelectedLayoutId,
// // // //     loading,
// // // //   };
// // // // }

// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // // useLayoutSvg
// // // // // ─────────────────────────────────────────────────────────────────────────────

// // // // interface UseLayoutSvgReturn {
// // // //   svgContent: string | null;
// // // //   loading: boolean;
// // // //   error: boolean;
// // // // }

// // // // export function useLayoutSvg(fileUrl: string | null): UseLayoutSvgReturn {
// // // //   const [svgContent, setSvgContent] = useState<string | null>(null);
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [error, setError] = useState(false);

// // // //   useEffect(() => {
// // // //     // Only fetch real https:// URLs — skip s3:// pseudo-URIs
// // // //     if (!fileUrl || !fileUrl.startsWith("https://")) {
// // // //       setSvgContent(null);
// // // //       setError(false);
// // // //       return;
// // // //     }
// // // //     setSvgContent(null);
// // // //     setError(false);
// // // //     setLoading(true);
// // // //     fetch(fileUrl)
// // // //       .then((res) => {
// // // //         if (!res.ok) throw new Error(`HTTP ${res.status}`);
// // // //         return res.text();
// // // //       })
// // // //       .then((text) => {
// // // //         // Make the SVG fluid so it fills its container
// // // //         const fluid = text
// // // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // // //         setSvgContent(fluid);
// // // //       })
// // // //       .catch(() => setError(true))
// // // //       .finally(() => setLoading(false));
// // // //   }, [fileUrl]);

// // // //   return { svgContent, loading, error };
// // // // }

// // // import { useState, useEffect } from "react";
// // // import { Building, Floor, Layout, Site } from "../types/layout.types";
// // // import { fetchBuildings, fetchFloors, fetchSites, getLayoutsByFloor } from "../services/layoutService";


// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // useCascadeLocation
// // // // ─────────────────────────────────────────────────────────────────────────────

// // // interface UseCascadeLocationReturn {
// // //   sites: Site[];
// // //   buildings: Building[];
// // //   floors: Floor[];
// // //   selectedSiteId: string;
// // //   selectedBuildingId: string;
// // //   selectedFloorId: string;
// // //   setSelectedSiteId: (id: string) => void;
// // //   setSelectedBuildingId: (id: string) => void;
// // //   setSelectedFloorId: (id: string) => void;
// // //   loadingSites: boolean;
// // //   loadingBuildings: boolean;
// // //   loadingFloors: boolean;
// // // }

// // // export function useCascadeLocation(): UseCascadeLocationReturn {
// // //   const [sites, setSites] = useState<Site[]>([]);
// // //   const [buildings, setBuildings] = useState<Building[]>([]);
// // //   const [floors, setFloors] = useState<Floor[]>([]);
// // //   const [selectedSiteId, setSelectedSiteId] = useState("");
// // //   const [selectedBuildingId, setSelectedBuildingId] = useState("");
// // //   const [selectedFloorId, setSelectedFloorId] = useState("");
// // //   const [loadingSites, setLoadingSites] = useState(false);
// // //   const [loadingBuildings, setLoadingBuildings] = useState(false);
// // //   const [loadingFloors, setLoadingFloors] = useState(false);

// // //   // load sites on mount
// // //   useEffect(() => {
// // //     setLoadingSites(true);
// // //     fetchSites()
// // //       .then((data) => {
// // //         setSites(data);
// // //         if (data.length > 0) setSelectedSiteId(String(data[0].id));
// // //       })
// // //       .catch(console.error)
// // //       .finally(() => setLoadingSites(false));
// // //   }, []);

// // //   // load buildings when site changes
// // //   useEffect(() => {
// // //     if (!selectedSiteId) return;
// // //     setBuildings([]);
// // //     setFloors([]);
// // //     setSelectedBuildingId("");
// // //     setSelectedFloorId("");
// // //     setLoadingBuildings(true);
// // //     fetchBuildings(selectedSiteId)
// // //       .then((data) => {
// // //         setBuildings(data);
// // //         if (data.length > 0) setSelectedBuildingId(String(data[0].id));
// // //       })
// // //       .catch(console.error)
// // //       .finally(() => setLoadingBuildings(false));
// // //   }, [selectedSiteId]);

// // //   // load floors when building changes
// // //   useEffect(() => {
// // //     if (!selectedBuildingId) return;
// // //     setFloors([]);
// // //     setSelectedFloorId("");
// // //     setLoadingFloors(true);
// // //     fetchFloors(selectedBuildingId)
// // //       .then((data) => {
// // //         setFloors(data);
// // //         if (data.length > 0) setSelectedFloorId(String(data[0].id));
// // //       })
// // //       .catch(console.error)
// // //       .finally(() => setLoadingFloors(false));
// // //   }, [selectedBuildingId]);

// // //   return {
// // //     sites,
// // //     buildings,
// // //     floors,
// // //     selectedSiteId,
// // //     selectedBuildingId,
// // //     selectedFloorId,
// // //     setSelectedSiteId,
// // //     setSelectedBuildingId,
// // //     setSelectedFloorId,
// // //     loadingSites,
// // //     loadingBuildings,
// // //     loadingFloors,
// // //   };
// // // }

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // useFloorLayouts
// // // // ─────────────────────────────────────────────────────────────────────────────

// // // interface UseFloorLayoutsReturn {
// // //   layouts: Layout[];
// // //   selectedLayoutId: string;
// // //   selectedLayout: Layout | null;
// // //   setSelectedLayoutId: (id: string) => void;
// // //   loading: boolean;
// // // }

// // // export function useFloorLayouts(floorId: string): UseFloorLayoutsReturn {
// // //   const [layouts, setLayouts] = useState<Layout[]>([]);
// // //   const [selectedLayoutId, setSelectedLayoutId] = useState("");
// // //   const [loading, setLoading] = useState(false);

// // //   useEffect(() => {
// // //     if (!floorId) {
// // //       setLayouts([]);
// // //       setSelectedLayoutId("");
// // //       return;
// // //     }
// // //     setLoading(true);
// // //     setLayouts([]);
// // //     setSelectedLayoutId("");
// // //     getLayoutsByFloor(floorId)
// // //       .then((data) => {
// // //         setLayouts(data);
// // //         const published = data.find((l) => l.is_published);
// // //         const autoSelect = published ?? data[0];
// // //         if (autoSelect) setSelectedLayoutId(autoSelect.layout_id);
// // //       })
// // //       .catch(console.error)
// // //       .finally(() => setLoading(false));
// // //   }, [floorId]);

// // //   const selectedLayout =
// // //     layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

// // //   return {
// // //     layouts,
// // //     selectedLayoutId,
// // //     selectedLayout,
// // //     setSelectedLayoutId,
// // //     loading,
// // //   };
// // // }

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // useLayoutSvg
// // // // ─────────────────────────────────────────────────────────────────────────────

// // // interface UseLayoutSvgReturn {
// // //   svgContent: string | null;
// // //   loading: boolean;
// // //   error: boolean;
// // // }

// // // export function useLayoutSvg(fileUrl: string | null): UseLayoutSvgReturn {
// // //   const [svgContent, setSvgContent] = useState<string | null>(null);
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState(false);

// // //   useEffect(() => {
// // //     // Only fetch real https:// URLs — skip s3:// pseudo-URIs
// // //     if (!fileUrl || !fileUrl.startsWith("https://")) {
// // //       setSvgContent(null);
// // //       setError(false);
// // //       return;
// // //     }
// // //     setSvgContent(null);
// // //     setError(false);
// // //     setLoading(true);
// // //     fetch(fileUrl)
// // //       .then((res) => {
// // //         if (!res.ok) throw new Error(`HTTP ${res.status}`);
// // //         return res.text();
// // //       })
// // //       .then((text) => {
// // //         // Make the SVG fluid so it fills its container
// // //         const fluid = text
// // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // //         setSvgContent(fluid);
// // //       })
// // //       .catch(() => setError(true))
// // //       .finally(() => setLoading(false));
// // //   }, [fileUrl]);

// // //   return { svgContent, loading, error };
// // // }

// // import { useState, useEffect } from "react";
// // import { Building, Floor, Layout, Site } from "../types/layout.types";
// // import { fetchBuildings, fetchFloors, fetchSites, getLayoutsByFloor } from "../services/layoutService";

// // interface UseCascadeLocationReturn {
// //   sites: Site[];
// //   buildings: Building[];
// //   floors: Floor[];
// //   selectedSiteId: string;
// //   selectedBuildingId: string;
// //   selectedFloorId: string;
// //   setSelectedSiteId: (id: string) => void;
// //   setSelectedBuildingId: (id: string) => void;
// //   setSelectedFloorId: (id: string) => void;
// //   loadingSites: boolean;
// //   loadingBuildings: boolean;
// //   loadingFloors: boolean;
// // }

// // export function useCascadeLocation(): UseCascadeLocationReturn {
// //   const [sites, setSites] = useState<Site[]>([]);
// //   const [buildings, setBuildings] = useState<Building[]>([]);
// //   const [floors, setFloors] = useState<Floor[]>([]);
// //   const [selectedSiteId, setSelectedSiteId] = useState("");
// //   const [selectedBuildingId, setSelectedBuildingId] = useState("");
// //   const [selectedFloorId, setSelectedFloorId] = useState("");
// //   const [loadingSites, setLoadingSites] = useState(false);
// //   const [loadingBuildings, setLoadingBuildings] = useState(false);
// //   const [loadingFloors, setLoadingFloors] = useState(false);

// //   // load sites on mount
// //   useEffect(() => {
// //     setLoadingSites(true);
// //     fetchSites()
// //       .then((data) => {
// //         console.log("[useCascadeLocation] raw sites:", data);
// //         console.log("[useCascadeLocation] first site id:", data[0]?.id, "| type:", typeof data[0]?.id);
// //         setSites(data);
// //         if (data.length > 0) {
// //           const id = String(data[0].id);
// //           console.log("[useCascadeLocation] setting selectedSiteId:", id, "| type:", typeof id);
// //           setSelectedSiteId(id);
// //         }
// //       })
// //       .catch(console.error)
// //       .finally(() => setLoadingSites(false));
// //   }, []);

// //   // load buildings when site changes
// //   useEffect(() => {
// //     if (!selectedSiteId) return;
// //     console.log("[useCascadeLocation] selectedSiteId changed:", selectedSiteId, "| type:", typeof selectedSiteId);
// //     setBuildings([]);
// //     setFloors([]);
// //     setSelectedBuildingId("");
// //     setSelectedFloorId("");
// //     setLoadingBuildings(true);
// //     fetchBuildings(selectedSiteId)
// //       .then((data) => {
// //         console.log("[useCascadeLocation] raw buildings:", data);
// //         console.log("[useCascadeLocation] first building id:", data[0]?.id, "| type:", typeof data[0]?.id);
// //         setBuildings(data);
// //         if (data.length > 0) {
// //           const id = String(data[0].id);
// //           console.log("[useCascadeLocation] setting selectedBuildingId:", id, "| type:", typeof id);
// //           setSelectedBuildingId(id);
// //         }
// //       })
// //       .catch(console.error)
// //       .finally(() => setLoadingBuildings(false));
// //   }, [selectedSiteId]);

// //   // load floors when building changes
// //   useEffect(() => {
// //     if (!selectedBuildingId) return;
// //     console.log("[useCascadeLocation] selectedBuildingId changed:", selectedBuildingId, "| type:", typeof selectedBuildingId);
// //     setFloors([]);
// //     setSelectedFloorId("");
// //     setLoadingFloors(true);
// //     fetchFloors(selectedBuildingId)
// //       .then((data) => {
// //         console.log("[useCascadeLocation] raw floors:", data);
// //         console.log("[useCascadeLocation] first floor id:", data[0]?.id, "| type:", typeof data[0]?.id);
// //         setFloors(data);
// //         if (data.length > 0) {
// //           const id = String(data[0].id);
// //           console.log("[useCascadeLocation] setting selectedFloorId:", id, "| type:", typeof id);
// //           setSelectedFloorId(id);
// //         }
// //       })
// //       .catch(console.error)
// //       .finally(() => setLoadingFloors(false));
// //   }, [selectedBuildingId]);

// //   return {
// //     sites,
// //     buildings,
// //     floors,
// //     selectedSiteId,
// //     selectedBuildingId,
// //     selectedFloorId,
// //     setSelectedSiteId,
// //     setSelectedBuildingId,
// //     setSelectedFloorId,
// //     loadingSites,
// //     loadingBuildings,
// //     loadingFloors,
// //   };
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // useFloorLayouts
// // // ─────────────────────────────────────────────────────────────────────────────

// // interface UseFloorLayoutsReturn {
// //   layouts: Layout[];
// //   selectedLayoutId: string;
// //   selectedLayout: Layout | null;
// //   setSelectedLayoutId: (id: string) => void;
// //   loading: boolean;
// // }

// // export function useFloorLayouts(floorId: string): UseFloorLayoutsReturn {
// //   const [layouts, setLayouts] = useState<Layout[]>([]);
// //   const [selectedLayoutId, setSelectedLayoutId] = useState("");
// //   const [loading, setLoading] = useState(false);

// //   useEffect(() => {
// //     if (!floorId) {
// //       setLayouts([]);
// //       setSelectedLayoutId("");
// //       return;
// //     }
// //     console.log("[useFloorLayouts] floorId changed:", floorId, "| type:", typeof floorId);
// //     setLoading(true);
// //     setLayouts([]);
// //     setSelectedLayoutId("");
// //     getLayoutsByFloor(floorId)
// //       .then((data) => {
// //         console.log("[useFloorLayouts] raw layouts:", data);
// //         setLayouts(data);
// //         const published = data.find((l) => l.is_published);
// //         const autoSelect = published ?? data[0];
// //         if (autoSelect) {
// //           console.log("[useFloorLayouts] auto-selecting layout_id:", autoSelect.layout_id);
// //           setSelectedLayoutId(autoSelect.layout_id);
// //         }
// //       })
// //       .catch(console.error)
// //       .finally(() => setLoading(false));
// //   }, [floorId]);

// //   const selectedLayout =
// //     layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

// //   return {
// //     layouts,
// //     selectedLayoutId,
// //     selectedLayout,
// //     setSelectedLayoutId,
// //     loading,
// //   };
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // useLayoutSvg
// // // ─────────────────────────────────────────────────────────────────────────────

// // interface UseLayoutSvgReturn {
// //   svgContent: string | null;
// //   loading: boolean;
// //   error: boolean;
// // }

// // export function useLayoutSvg(fileUrl: string | null): UseLayoutSvgReturn {
// //   const [svgContent, setSvgContent] = useState<string | null>(null);
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState(false);

// //   useEffect(() => {
// //     if (!fileUrl || !fileUrl.startsWith("https://")) {
// //       setSvgContent(null);
// //       setError(false);
// //       return;
// //     }
// //     setSvgContent(null);
// //     setError(false);
// //     setLoading(true);
// //     fetch(fileUrl)
// //       .then((res) => {
// //         if (!res.ok) throw new Error(`HTTP ${res.status}`);
// //         return res.text();
// //       })
// //       .then((text) => {
// //         const fluid = text
// //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// //         setSvgContent(fluid);
// //       })
// //       .catch(() => setError(true))
// //       .finally(() => setLoading(false));
// //   }, [fileUrl]);

// //   return { svgContent, loading, error };
// // }

// import { useState, useEffect } from "react";
// import { Building, Floor, Layout, Site } from "../types/layout.types";
// import {
//   fetchBuildings,
//   fetchFloors,
//   fetchSites,
//   getLayoutsByFloor,
// } from "../services/layoutService";

// // ─────────────────────────────────────────────────────────────────────────────
// // useCascadeLocation
// // ─────────────────────────────────────────────────────────────────────────────

// import { LayoutSeatStats } from "../types/layout.types";

// // Replace this URL with your actual seat-stats endpoint.
// // Expected shape: GET /api/layouts/:layoutId/seat-stats
// // → { layout_id, total_seats, configured_seats, unconfigured_seats,
// //     non_bookable_seats, bookable_seats }
// async function fetchSeatStats(layoutId: string): Promise<LayoutSeatStats> {
//   const res = await fetch(`/api/layouts/${layoutId}/seat-stats`);
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   return res.json();
// }

// interface UseLayoutSeatStatsResult {
//   stats: LayoutSeatStats | null;
//   loading: boolean;
//   error: boolean;
// }

// export function useLayoutSeatStats(layoutId: string | null): UseLayoutSeatStatsResult {
//   const [stats,   setStats]   = useState<LayoutSeatStats | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error,   setError]   = useState(false);

//   useEffect(() => {
//     if (!layoutId) { setStats(null); setError(false); return; }
//     setLoading(true);
//     setError(false);
//     fetchSeatStats(layoutId)
//       .then(setStats)
//       .catch(() => setError(true))
//       .finally(() => setLoading(false));
//   }, [layoutId]);

//   return { stats, loading, error };
// }
// interface UseCascadeLocationOptions {
//   initialSiteId?: string;
//   initialBuildingId?: string;
//   initialFloorId?: string;
// }

// interface UseCascadeLocationReturn {
//   sites: Site[];
//   buildings: Building[];
//   floors: Floor[];
//   selectedSiteId: string;
//   selectedBuildingId: string;
//   selectedFloorId: string;
//   setSelectedSiteId: (id: string) => void;
//   setSelectedBuildingId: (id: string) => void;
//   setSelectedFloorId: (id: string) => void;
//   loadingSites: boolean;
//   loadingBuildings: boolean;
//   loadingFloors: boolean;
// }

// export function useCascadeLocation(
//   options: UseCascadeLocationOptions = {}
// ): UseCascadeLocationReturn {
//   const { initialSiteId = "", initialBuildingId = "", initialFloorId = "" } = options;

//   const [sites, setSites] = useState<Site[]>([]);
//   const [buildings, setBuildings] = useState<Building[]>([]);
//   const [floors, setFloors] = useState<Floor[]>([]);

//   const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId);
//   const [selectedBuildingId, setSelectedBuildingId] = useState(initialBuildingId);
//   const [selectedFloorId, setSelectedFloorId] = useState(initialFloorId);

//   const [loadingSites, setLoadingSites] = useState(false);
//   const [loadingBuildings, setLoadingBuildings] = useState(false);
//   const [loadingFloors, setLoadingFloors] = useState(false);

//   // load sites on mount
//   useEffect(() => {
//     setLoadingSites(true);
//     fetchSites()
//       .then((data) => {
//         setSites(data);
//         // only auto-select first if no prefill was provided
//         if (!initialSiteId && data.length > 0) {
//           setSelectedSiteId(String(data[0].id));
//         }
//       })
//       .catch(console.error)
//       .finally(() => setLoadingSites(false));
//   }, []);

//   // load buildings when site changes
//   useEffect(() => {
//     if (!selectedSiteId) return;
//     setBuildings([]);
//     setFloors([]);
//     // only reset downstream if not a prefill-triggered run
//     if (selectedSiteId !== initialSiteId) {
//       setSelectedBuildingId("");
//       setSelectedFloorId("");
//     }
//     setLoadingBuildings(true);
//     fetchBuildings(selectedSiteId)
//       .then((data) => {
//         setBuildings(data);
//         if (!initialBuildingId && data.length > 0) {
//           setSelectedBuildingId(String(data[0].id));
//         } else if (initialBuildingId) {
//           // ensure the prefilled value is applied after buildings load
//           setSelectedBuildingId(initialBuildingId);
//         }
//       })
//       .catch(console.error)
//       .finally(() => setLoadingBuildings(false));
//   }, [selectedSiteId]);

//   // load floors when building changes
//   useEffect(() => {
//     if (!selectedBuildingId) return;
//     setFloors([]);
//     if (selectedBuildingId !== initialBuildingId) {
//       setSelectedFloorId("");
//     }
//     setLoadingFloors(true);
//     fetchFloors(selectedBuildingId)
//       .then((data) => {
//         setFloors(data);
//         if (!initialFloorId && data.length > 0) {
//           setSelectedFloorId(String(data[0].id));
//         } else if (initialFloorId) {
//           setSelectedFloorId(initialFloorId);
//         }
//       })
//       .catch(console.error)
//       .finally(() => setLoadingFloors(false));
//   }, [selectedBuildingId]);

//   return {
//     sites,
//     buildings,
//     floors,
//     selectedSiteId,
//     selectedBuildingId,
//     selectedFloorId,
//     setSelectedSiteId,
//     setSelectedBuildingId,
//     setSelectedFloorId,
//     loadingSites,
//     loadingBuildings,
//     loadingFloors,
//   };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // useFloorLayouts
// // ─────────────────────────────────────────────────────────────────────────────

// interface UseFloorLayoutsOptions {
//   initialLayoutId?: string;
// }

// interface UseFloorLayoutsReturn {
//   layouts: Layout[];
//   selectedLayoutId: string;
//   selectedLayout: Layout | null;
//   setSelectedLayoutId: (id: string) => void;
//   loading: boolean;
// }

// export function useFloorLayouts(
//   floorId: string,
//   options: UseFloorLayoutsOptions = {}
// ): UseFloorLayoutsReturn {
//   const { initialLayoutId = "" } = options;

//   const [layouts, setLayouts] = useState<Layout[]>([]);
//   const [selectedLayoutId, setSelectedLayoutId] = useState(initialLayoutId);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!floorId) {
//       setLayouts([]);
//       setSelectedLayoutId("");
//       return;
//     }
//     setLoading(true);
//     setLayouts([]);
//     setSelectedLayoutId("");
//     getLayoutsByFloor(floorId)
//       .then((data) => {
//         setLayouts(data);
//         if (initialLayoutId && data.find((l) => l.layout_id === initialLayoutId)) {
//           // prefill wins if it exists in the list
//           setSelectedLayoutId(initialLayoutId);
//         } else {
//           // fallback: published first, then first in list
//           const published = data.find((l) => l.is_published);
//           const autoSelect = published ?? data[0];
//           if (autoSelect) setSelectedLayoutId(autoSelect.layout_id);
//         }
//       })
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, [floorId]);

//   const selectedLayout =
//     layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

//   return {
//     layouts,
//     selectedLayoutId,
//     selectedLayout,
//     setSelectedLayoutId,
//     loading,
//   };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // useLayoutSvg
// // ─────────────────────────────────────────────────────────────────────────────

// interface UseLayoutSvgReturn {
//   svgContent: string | null;
//   loading: boolean;
//   error: boolean;
// }

// export function useLayoutSvg(fileUrl: string | null): UseLayoutSvgReturn {
//   const [svgContent, setSvgContent] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(false);

//   useEffect(() => {
//     if (!fileUrl || !fileUrl.startsWith("https://")) {
//       setSvgContent(null);
//       setError(false);
//       return;
//     }
//     setSvgContent(null);
//     setError(false);
//     setLoading(true);
//     fetch(fileUrl)
//       .then((res) => {
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         return res.text();
//       })
//       .then((text) => {
//         const fluid = text
//           .replace(/\bwidth="[^"]*"/, 'width="100%"')
//           .replace(/\bheight="[^"]*"/, 'height="100%"');
//         setSvgContent(fluid);
//       })
//       .catch(() => setError(true))
//       .finally(() => setLoading(false));
//   }, [fileUrl]);

//   return { svgContent, loading, error };
// }

import { useState, useEffect } from "react";
import { Building, Floor, Layout, LayoutSeatStats, Site } from "../types/layout.types";
import {
  fetchBuildings,
  fetchFloors,
  fetchSites,
  getLayoutsByFloor,
} from "../services/layoutService";

// ─────────────────────────────────────────────────────────────────────────────
// useLayoutSeatStats — static mock, swap for real fetch when API is ready
// ─────────────────────────────────────────────────────────────────────────────

function getMockStats(layoutId: string): LayoutSeatStats {
  return {
    layout_id:          layoutId,
    total_seats:        48,
    configured_seats:   42,
    unconfigured_seats: 6,
    non_bookable_seats: 4,
    bookable_seats:     38,
  };
}

interface UseLayoutSeatStatsResult {
  stats: LayoutSeatStats | null;
  loading: boolean;
  error: boolean;
}

export function useLayoutSeatStats(layoutId: string | null): UseLayoutSeatStatsResult {
  const [stats,   setStats]   = useState<LayoutSeatStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!layoutId) { setStats(null); return; }
    setLoading(true);
    const t = setTimeout(() => {
      setStats(getMockStats(layoutId));
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [layoutId]);

  return { stats, loading, error: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// useCascadeLocation
// ─────────────────────────────────────────────────────────────────────────────

interface UseCascadeLocationOptions {
  initialSiteId?: string;
  initialBuildingId?: string;
  initialFloorId?: string;
}

interface UseCascadeLocationReturn {
  sites: Site[];
  buildings: Building[];
  floors: Floor[];
  selectedSiteId: string;
  selectedBuildingId: string;
  selectedFloorId: string;
  setSelectedSiteId: (id: string) => void;
  setSelectedBuildingId: (id: string) => void;
  setSelectedFloorId: (id: string) => void;
  loadingSites: boolean;
  loadingBuildings: boolean;
  loadingFloors: boolean;
}

export function useCascadeLocation(
  options: UseCascadeLocationOptions = {}
): UseCascadeLocationReturn {
  const { initialSiteId = "", initialBuildingId = "", initialFloorId = "" } = options;

  const [sites,     setSites]     = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors,    setFloors]    = useState<Floor[]>([]);

  const [selectedSiteId,     setSelectedSiteId]     = useState(initialSiteId);
  const [selectedBuildingId, setSelectedBuildingId] = useState(initialBuildingId);
  const [selectedFloorId,    setSelectedFloorId]    = useState(initialFloorId);

  const [loadingSites,     setLoadingSites]     = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors,    setLoadingFloors]    = useState(false);

  // load sites on mount
  useEffect(() => {
    setLoadingSites(true);
    fetchSites()
      .then((data) => {
        setSites(data);
        if (!initialSiteId && data.length > 0) {
          setSelectedSiteId(String(data[0].id));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSites(false));
  }, []);

  // load buildings when site changes
  useEffect(() => {
    if (!selectedSiteId) return;
    setBuildings([]);
    setFloors([]);
    if (selectedSiteId !== initialSiteId) {
      setSelectedBuildingId("");
      setSelectedFloorId("");
    }
    setLoadingBuildings(true);
    fetchBuildings(selectedSiteId)
      .then((data) => {
        setBuildings(data);
        if (!initialBuildingId && data.length > 0) {
          setSelectedBuildingId(String(data[0].id));
        } else if (initialBuildingId) {
          setSelectedBuildingId(initialBuildingId);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingBuildings(false));
  }, [selectedSiteId]);

  // load floors when building changes
  useEffect(() => {
    if (!selectedBuildingId) return;
    setFloors([]);
    if (selectedBuildingId !== initialBuildingId) {
      setSelectedFloorId("");
    }
    setLoadingFloors(true);
    fetchFloors(selectedBuildingId)
      .then((data) => {
        setFloors(data);
        if (!initialFloorId && data.length > 0) {
          setSelectedFloorId(String(data[0].id));
        } else if (initialFloorId) {
          setSelectedFloorId(initialFloorId);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFloors(false));
  }, [selectedBuildingId]);

  return {
    sites,
    buildings,
    floors,
    selectedSiteId,
    selectedBuildingId,
    selectedFloorId,
    setSelectedSiteId,
    setSelectedBuildingId,
    setSelectedFloorId,
    loadingSites,
    loadingBuildings,
    loadingFloors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useFloorLayouts
// ─────────────────────────────────────────────────────────────────────────────

interface UseFloorLayoutsOptions {
  initialLayoutId?: string;
}

interface UseFloorLayoutsReturn {
  layouts: Layout[];
  selectedLayoutId: string;
  selectedLayout: Layout | null;
  setSelectedLayoutId: (id: string) => void;
  loading: boolean;
}

export function useFloorLayouts(
  floorId: string,
  options: UseFloorLayoutsOptions = {}
): UseFloorLayoutsReturn {
  const { initialLayoutId = "" } = options;

  const [layouts,          setLayouts]          = useState<Layout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState(initialLayoutId);
  const [loading,          setLoading]          = useState(false);

  useEffect(() => {
    if (!floorId) {
      setLayouts([]);
      setSelectedLayoutId("");
      return;
    }
    setLoading(true);
    setLayouts([]);
    setSelectedLayoutId("");
    getLayoutsByFloor(floorId)
      .then((data) => {
        setLayouts(data);
        if (initialLayoutId && data.find((l) => l.layout_id === initialLayoutId)) {
          setSelectedLayoutId(initialLayoutId);
        } else {
          const published  = data.find((l) => l.is_published);
          const autoSelect = published ?? data[0];
          if (autoSelect) setSelectedLayoutId(autoSelect.layout_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [floorId]);

  const selectedLayout = layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

  return {
    layouts,
    selectedLayoutId,
    selectedLayout,
    setSelectedLayoutId,
    loading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLayoutSvg
// ─────────────────────────────────────────────────────────────────────────────

interface UseLayoutSvgReturn {
  svgContent: string | null;
  loading: boolean;
  error: boolean;
}

export function useLayoutSvg(fileUrl: string | null): UseLayoutSvgReturn {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(false);

  useEffect(() => {
    if (!fileUrl || !fileUrl.startsWith("https://")) {
      setSvgContent(null);
      setError(false);
      return;
    }
    setSvgContent(null);
    setError(false);
    setLoading(true);
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const fluid = text
          .replace(/\bwidth="[^"]*"/, 'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        setSvgContent(fluid);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileUrl]);

  return { svgContent, loading, error };
}