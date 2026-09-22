import "server-only";

import { DREAMERS_HUB_COORDINATES, parseVenueCoordinates } from "@/lib/venue/location";

export function getVenueCoordinates() {
  if (!process.env.VENUE_LATITUDE && !process.env.VENUE_LONGITUDE) return DREAMERS_HUB_COORDINATES;
  return parseVenueCoordinates(process.env.VENUE_LATITUDE, process.env.VENUE_LONGITUDE);
}
