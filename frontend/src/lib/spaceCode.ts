// Conference/meeting/training room SVG ids may carry their capacity as its own
// segment (e.g. "HYD-PRV-F11-MR-C6-01" = capacity 6). That segment exists only
// so the backend can read the capacity from the id -- users should never see
// it, so every place that DISPLAYS a space code goes through this.
//
// Display only: matching, search params, links and svg lookups keep using the
// full stored code.

const ROOM_SEGMENT = /(^|[-_])(cfr|mr|tr)([-_]|$)/i;
const CAPACITY_SEGMENT = /[-_]C[1-9]\d{0,2}(?=[-_]|$)/i;

export function displaySpaceCode(code: string): string;
export function displaySpaceCode(code: string | null | undefined): string | null | undefined;
export function displaySpaceCode(code: string | null | undefined): string | null | undefined {
  if (!code) return code;
  return ROOM_SEGMENT.test(code) ? code.replace(CAPACITY_SEGMENT, "") : code;
}
