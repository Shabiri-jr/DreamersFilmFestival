"use server";

import {
  clearReferralAttributionCookie,
  readReferralAttributionCookie,
  writeReferralAttributionCookie,
} from "@/lib/referrals/cookies";
import { inspectReferralCode } from "@/lib/referrals/server";
import { assertTrustedOrigin } from "@/lib/security/origin";

export type ReferralActionState = Readonly<{
  status: "idle" | "error" | "success" | "locked";
  message: string;
  code?: string;
  promoterName?: string;
}>;

export async function applyManualReferralAction(
  _previousState: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  try {
    await assertTrustedOrigin();
    const existing = await readReferralAttributionCookie();

    if (existing) {
      const current = await inspectReferralCode(
        existing.referralCode,
        existing.source,
      );
      if (
        current.status === "active" &&
        current.attribution.promoterId === existing.promoterId
      ) {
        return {
          status: "locked",
          message: `Referral code ${existing.referralCode} is already applied.`,
          code: existing.referralCode,
          promoterName: current.promoterName,
        };
      }

      await clearReferralAttributionCookie();
    }

    const code = formData.get("referralCode");
    const result = await inspectReferralCode(
      typeof code === "string" ? code : "",
      "manual_code",
    );

    if (result.status === "inactive") {
      return {
        status: "error",
        message: "This referral code is no longer active.",
      };
    }

    if (result.status !== "active") {
      return {
        status: "error",
        message: "We couldn't find that referral code.",
      };
    }

    await writeReferralAttributionCookie(result.attribution);
    return {
      status: "success",
      message: "Referral code applied.",
      code: result.attribution.referralCode,
      promoterName: result.promoterName,
    };
  } catch {
    return {
      status: "error",
      message: "We couldn't validate that code. Please try again.",
    };
  }
}
