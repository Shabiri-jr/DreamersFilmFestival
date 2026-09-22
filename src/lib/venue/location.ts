export type Coordinates = [longitude: number, latitude: number];

// Exact destination from the organiser's https://maps.app.goo.gl/gixcm7FrkKnnE7wS6
// Use the !3d/!4d destination, not the @ camera centre in the expanded Google URL.
export const DREAMERS_HUB_COORDINATES: Coordinates = [3.83631, 7.370485];

// City overview only. Never use this as the venue's destination.
export const IBADAN_OVERVIEW: Coordinates = [3.947, 7.377];

export function parseVenueCoordinates(
  latitude: string | undefined,
  longitude: string | undefined,
): Coordinates | null {
  if (!latitude?.trim() || !longitude?.trim()) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

export function googleMapsUrl(venue: string, destination: Coordinates | null) {
  const url = new URL(destination
    ? "https://www.google.com/maps/dir/"
    : "https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set(destination ? "destination" : "query",
    destination ? `${destination[1]},${destination[0]}` : venue);
  return url.toString();
}

export function distanceMetres(from: Coordinates, to: Coordinates): number {
  const rad = Math.PI / 180;
  const a = Math.sin((to[1] - from[1]) * rad / 2) ** 2
    + Math.cos(from[1] * rad) * Math.cos(to[1] * rad)
    * Math.sin((to[0] - from[0]) * rad / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function formatDistance(metres: number): string {
  return metres < 1_000
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1_000).toFixed(1)} km`;
}

export type DrivingRoute = {
  geometry: { type: "LineString"; coordinates: Coordinates[] };
  distance: number;
  duration: number;
};

export function parseDrivingRoute(value: unknown): DrivingRoute | null {
  if (!value || typeof value !== "object" || !("code" in value) || value.code !== "Ok"
    || !("routes" in value) || !Array.isArray(value.routes)) return null;
  const route = value.routes[0];
  if (!route || !Number.isFinite(route.distance) || route.distance < 0
    || !Number.isFinite(route.duration) || route.duration < 0
    || route.geometry?.type !== "LineString" || !Array.isArray(route.geometry.coordinates)
    || route.geometry.coordinates.length < 2) return null;
  if (!route.geometry.coordinates.every((point: unknown) => Array.isArray(point)
    && point.length >= 2 && typeof point[0] === "number" && typeof point[1] === "number"
    && Number.isFinite(point[0]) && Number.isFinite(point[1])
    && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)) return null;
  return { geometry: route.geometry, distance: route.distance, duration: route.duration };
}
