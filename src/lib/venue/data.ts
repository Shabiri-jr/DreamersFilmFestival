import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { VENUE_LANDMARKS, withLandmarkLabels } from "@/lib/venue/landmarks";

export async function getVenueLandmarks() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("venue_landmark_labels").select("landmark_id,label");
  if (error) {
    console.error("Landmark labels are unavailable:", error.code);
    return { landmarks: VENUE_LANDMARKS, available: false };
  }
  return { landmarks: withLandmarkLabels(data), available: true };
}
