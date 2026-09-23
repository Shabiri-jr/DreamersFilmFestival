import type { Coordinates } from "@/lib/venue/location";

export type VenueLandmark = {
  id: string;
  name: string;
  shortName: string;
  coordinates: Coordinates;
  mapsUrl: string;
};

export const VENUE_LANDMARKS: VenueLandmark[] = [
  {
    id: "rehoboth-cathedral",
    name: "Rehoboth Cathedral Headquarters",
    shortName: "Rehoboth Cathedral",
    // Destination (!3d/!4d) from the organiser's link, not its camera centre.
    coordinates: [3.8403934, 7.3651071],
    mapsUrl: "https://maps.app.goo.gl/nvL1qm9eLfmF7LAT7",
  },
  {
    id: "mobil-ring-road",
    name: "Mobil Ring Road",
    shortName: "Mobil Ring Road",
    coordinates: [3.8605551, 7.3667024],
    mapsUrl: "https://maps.app.goo.gl/ckYfHk9UibfC5R4J8",
  },
  {
    id: "solam-event-center",
    name: "Solam Event Center Oluyole Ibadan",
    shortName: "Solam Event Center",
    coordinates: [3.8320275, 7.3666441],
    mapsUrl: "https://maps.app.goo.gl/XjLH6C5gmZM85g7s5",
  },
  // These shared links identify coordinates only; names await organiser confirmation.
  {
    id: "landmark-4",
    name: "Landmark 4",
    shortName: "Landmark 4",
    coordinates: [3.838228, 7.370028],
    mapsUrl: "https://maps.app.goo.gl/19sfo51m7hgQP5dYA",
  },
  {
    id: "landmark-5",
    name: "Landmark 5",
    shortName: "Landmark 5",
    coordinates: [3.829314, 7.383382],
    mapsUrl: "https://maps.app.goo.gl/P7LDVEpjkubpG6YJ7",
  },
  {
    id: "landmark-6",
    name: "Landmark 6",
    shortName: "Landmark 6",
    coordinates: [3.833429, 7.371994],
    mapsUrl: "https://maps.app.goo.gl/UeNo9ep9zgNwKV9T6",
  },
];

export function parseLandmarkLabel(id: unknown, value: unknown) {
  if (typeof id !== "string" || !VENUE_LANDMARKS.some((landmark) => landmark.id === id) || typeof value !== "string") return null;
  const label = value.trim().replace(/\s+/g, " ");
  if (label.length < 2 || label.length > 80) return null;
  return { landmark_id: id, label };
}

export function withLandmarkLabels(labels: { landmark_id: string; label: string }[]): VenueLandmark[] {
  return VENUE_LANDMARKS.map((landmark) => {
    const saved = labels.find((item) => item.landmark_id === landmark.id);
    return saved ? { ...landmark, name: saved.label, shortName: saved.label } : landmark;
  });
}
