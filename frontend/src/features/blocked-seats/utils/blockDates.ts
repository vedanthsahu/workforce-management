// Blocks can only be set from today up to a configurable number of days
// ahead (Configuration -> Blocked Seat Policy -> Maximum Block Window).
// Shared by the Block Spaces page and the modify / re-block panel so both
// use one window.

export const DEFAULT_BLOCK_WINDOW_DAYS = 180;

// `days` from today as YYYY-MM-DD.
export const maxBlockDate = (days: number = DEFAULT_BLOCK_WINDOW_DAYS) => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
  ).toLocaleDateString("en-CA");
};

export const daysLabel = (days: number) => `${days} day${days === 1 ? "" : "s"}`;
