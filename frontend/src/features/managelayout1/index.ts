// ─── Manage Spaces Module (Seats / Cabins / Conference Rooms) ─────────────────

// Components
export { default as SeatFiltersBar }     from "./components/SeatFiltersBar";
export { default as SeatTable }          from "./components/SeatTable";
export { default as EditSeatPanel }      from "./components/EditSeatPanel";
export { default as BulkEditModal }      from "./components/BulkEditModal";
export { default as ViewToggle }         from "./components/ViewToggle";
export { default as SpaceCategoryTabs }  from "./components/SpaceCategoryTabs";
export { default as SpaceStatCards }     from "./components/SpaceStatCards";
export { default as AmenityChecklist }   from "./components/AmenityChecklist";

// Services
export * from "./services/seatService";

// Types
export type * from "./types/seat.types";
export type * from "./types/layout.types";

// Space category helpers (Manage Spaces tabs)
export * from "./utils/spaceCategory";