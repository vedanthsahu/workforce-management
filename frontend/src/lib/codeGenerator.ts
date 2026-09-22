// Derives short uppercase codes from names, following SeatBook's
// office/building/floor naming convention: a single-word name yields its
// first 3 letters (e.g. "Hyderabad" -> "HYD"); a multi-word name yields the
// first word's first 3 letters and the last word's first 3 letters,
// dash-joined (e.g. "Roxana Towers" -> "ROX-TOW", "Mumbai HQ" -> "MUM-HQ").
// Building/Floor codes are then built by appending their own segment to
// their parent's code (e.g. "HYD" + "Roxana Towers" -> "HYD-ROX-TOW").

export function nameSegment(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return `${words[0].slice(0, 3).toUpperCase()}-${words[words.length - 1].slice(0, 3).toUpperCase()}`;
}

export function officeCodeFromName(name: string): string {
  return nameSegment(name);
}

export function codeWithParent(parentCode: string, name: string): string {
  const segment = nameSegment(name);
  if (!parentCode) return segment;
  return segment ? `${parentCode}-${segment}` : parentCode;
}

// Appends "-01", "-02", ... to `baseCode` until it no longer collides with
// anything in `existingCodes` (case-insensitive). Returns `baseCode` as-is
// when it's already unique.
export function uniqueCode(baseCode: string, existingCodes: Iterable<string>): string {
  if (!baseCode) return baseCode;

  const taken = new Set(
    Array.from(existingCodes, (code) => code.trim().toUpperCase())
  );

  if (!taken.has(baseCode.toUpperCase())) return baseCode;

  let suffix = 1;
  let candidate: string;
  do {
    candidate = `${baseCode}-${String(suffix).padStart(2, "0")}`;
    suffix += 1;
  } while (taken.has(candidate.toUpperCase()));

  return candidate;
}
