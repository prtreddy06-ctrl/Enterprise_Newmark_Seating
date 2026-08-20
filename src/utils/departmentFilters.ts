// Some zones' "department" field ends up holding a facility/room-type label
// (Executive Cabins, Conference Rooms, Pantry, etc.) rather than a real
// employee department — a byproduct of how default/bulk-generated floor
// layouts name their zones. Department-wise reports and analytics should
// never present these as if they were departments with 0 staff; instead
// they're counted separately as facility/room counts.
const FACILITY_LABEL_PATTERNS: RegExp[] = [
  /executive cabin/i, /^facilities?$/i, /facilities\s*&?\s*operations/i,
  /front office/i, /general workspace/i, /^conference/i, /amenities/i,
  /excess space/i, /reception/i, /cafeteria/i, /\bpantry\b/i, /restroom/i,
  /\blounge\b/i, /meeting room/i, /board room/i, /network room/i, /^store$/i,
  /collab(?:oration)? area/i, /emergency exit/i, /stairwell/i
];

export function isFacilityLabel(label?: string | null): boolean {
  if (!label) return true;
  return FACILITY_LABEL_PATTERNS.some(p => p.test(label));
}
