const CENTRE = { lat: 51.5074, lng: -0.1278 };
const RADIUS_KM = 30;

function distanceKm(lat: number, lng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - CENTRE.lat);
  const dLng = rad(lng - CENTRE.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(CENTRE.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Coordinates win over text, since "London Road, Brighton" is not London. */
export function isInLondon(e: { lat?: number; lng?: number; venue?: string }): boolean {
  if (e.lat != null && e.lng != null) return distanceKm(e.lat, e.lng) <= RADIUS_KM;
  return /\blondon\b/i.test(e.venue ?? "");
}
