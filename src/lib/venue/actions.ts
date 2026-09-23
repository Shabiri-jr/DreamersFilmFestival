"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/admin/auth";
import { assertTrustedOrigin } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";
import { parseLandmarkLabel } from "@/lib/venue/landmarks";

export type LandmarkLabelState = { error?: string; saved?: boolean };

export async function saveLandmarkLabel(_previousState: LandmarkLabelState, formData: FormData): Promise<LandmarkLabelState> {
  await assertTrustedOrigin();
  await requireSuperAdmin();
  const input = parseLandmarkLabel(formData.get("landmarkId"), formData.get("label"));
  if (!input) return { error: "Choose a valid landmark and enter a label of 2–80 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("venue_landmark_labels").upsert(input, { onConflict: "landmark_id" });
  if (error) return { error: "The label could not be saved. Please try again." };

  revalidatePath("/");
  revalidatePath("/venue");
  revalidatePath("/admin/landmarks");
  return { saved: true };
}
