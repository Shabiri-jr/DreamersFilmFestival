import "server-only";

import {
  createReferralAttribution,
  normalizeReferralCode,
  type ReferralAttribution,
} from "@/lib/referrals/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReferralSource } from "@/types/domain";

export type ReferralLookupResult =
  | Readonly<{ status: "invalid" | "not_found" | "inactive" }>
  | Readonly<{
      status: "active";
      attribution: ReferralAttribution;
      promoterName: string;
    }>;

export async function inspectReferralCode(
  referralCode: string,
  source: ReferralSource,
): Promise<ReferralLookupResult> {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return { status: "invalid" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promoters")
    .select("id, name, referral_code, is_active")
    .eq("referral_code", normalizedCode)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to validate referral code.", { cause: error });
  }

  if (!data) {
    return { status: "not_found" };
  }

  if (!data.is_active) {
    return { status: "inactive" };
  }

  return {
    status: "active",
    attribution: createReferralAttribution(data.id, data.referral_code, source),
    promoterName: data.name,
  };
}

export async function resolveActiveReferral(
  referralCode: string,
  source: ReferralSource,
): Promise<ReferralAttribution | null> {
  const result = await inspectReferralCode(referralCode, source);
  return result.status === "active" ? result.attribution : null;
}
