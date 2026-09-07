// Seat/room markers in uploaded floor-plan SVGs carry an id following a
// "SITE-BUILDING-FLOOR-...-NUMBER" convention (e.g. "HYD-PRV-F11-B-129",
// "HYD-PRV-F11-CBN-04"). Some exporters wrap each seat's shapes in a
// `<g id="...">`; others (seen in practice — a real upload had 2790073
// chars and exactly zero <g> elements) put the id directly on a flat
// <path>/<rect>/<polygon> with no wrapping group at all. So this scans
// EVERY element with an id, of any tag name, rather than assuming <g>.
//
// A regex like /<g\s+id="([^"]+)"/ also only matches when `id` is literally
// the first attribute on the tag — design tools don't guarantee attribute
// order or quote style. Parsing with DOMParser sidesteps both problems; the
// regex below only exists as a fallback for when DOMParser itself fails.
const SEAT_ID_PATTERN = /^\d+$|^[A-Za-z]+-.*-\d+$/;

interface FoundId {
  id: string;
  tag: string;
}

function extractElementIdsViaDom(svgText: string, label: string): FoundId[] | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      console.log(`[${label}] DOMParser could not parse this file as SVG, falling back to regex scan:`, parseError.textContent);
      return null;
    }
    const elements = Array.from(doc.querySelectorAll("[id]"));
    const byTag = elements.reduce<Record<string, number>>((acc, el) => {
      acc[el.tagName] = (acc[el.tagName] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`[${label}] DOM parse OK — ${elements.length} element(s) with an id attribute, by tag:`, byTag);

    if (elements.length === 0) {
      // No `id` anywhere in the document — check whether the exporter kept
      // names under a different attribute instead (Figma's raw SVG export
      // sometimes drops `id` but keeps `data-name`; some tools use `class`,
      // `aria-label`, or a <title> child per shape).
      const withDataName = doc.querySelectorAll("[data-name]");
      const withAriaLabel = doc.querySelectorAll("[aria-label]");
      const withClass = doc.querySelectorAll("[class]");
      const titles = doc.querySelectorAll("title");
      const allTags = Array.from(doc.querySelectorAll("*")).reduce<Record<string, number>>((acc, el) => {
        acc[el.tagName] = (acc[el.tagName] ?? 0) + 1;
        return acc;
      }, {});
      console.log(`[${label}] No ids at all — this file has no per-shape identifiers. Diagnostic scan:`, {
        totalElementsByTag: allTags,
        elementsWithDataName: withDataName.length,
        sampleDataNames: Array.from(withDataName).slice(0, 10).map((el) => el.getAttribute("data-name")),
        elementsWithAriaLabel: withAriaLabel.length,
        sampleAriaLabels: Array.from(withAriaLabel).slice(0, 10).map((el) => el.getAttribute("aria-label")),
        elementsWithClass: withClass.length,
        sampleClasses: Array.from(withClass).slice(0, 10).map((el) => el.getAttribute("class")),
        titleElementCount: titles.length,
        sampleTitles: Array.from(titles).slice(0, 10).map((el) => el.textContent),
      });
    }

    return elements.map((el) => ({ id: el.id, tag: el.tagName }));
  } catch (err) {
    console.log(`[${label}] DOMParser threw, falling back to regex scan:`, err);
    return null;
  }
}

function extractElementIdsViaRegex(svgText: string): FoundId[] {
  const found: FoundId[] = [];
  const regex = /<(\w+)\b[^>]*\sid=["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(svgText)) !== null) {
    found.push({ tag: match[1], id: match[2] });
  }
  return found;
}

/**
 * Extracts seat/room ids from raw SVG text, logging (via console.log, under
 * the given `label`) how many ids were found in the document vs. how many
 * matched the seat naming convention — open devtools to see why a given
 * file detects 0 seats.
 */
export function extractSeatIds(svgText: string, label = "extractSeatIds"): string[] {
  console.log(`[${label}] Scanning SVG (${svgText.length} chars). First 200 chars:`, svgText.slice(0, 200));

  const found = extractElementIdsViaDom(svgText, label) ?? extractElementIdsViaRegex(svgText);

  const matched: string[] = [];
  const rejected: string[] = [];
  for (const { id } of found) {
    if (SEAT_ID_PATTERN.test(id)) matched.push(id);
    else rejected.push(id);
  }

  console.log(
    `[${label}] ${found.length} id'd element(s) found in SVG, ${matched.length} matched the seat-id pattern (${SEAT_ID_PATTERN}), ${rejected.length} rejected.`,
    { matched, rejected: rejected.slice(0, 50) },
  );

  return matched;
}
