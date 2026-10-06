// Blocks can only be set from today up to six months ahead. Shared by the
// Block Spaces page and the modify / re-block panel so both use one window.

// Six months from today, with the day clamped to the target month's length
// (31 Aug + 6 months -> 28/29 Feb, not a spill into March).
export const maxBlockDate = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 7, 0).getDate();
  return new Date(
    now.getFullYear(),
    now.getMonth() + 6,
    Math.min(now.getDate(), lastDay),
  ).toLocaleDateString("en-CA");
};
