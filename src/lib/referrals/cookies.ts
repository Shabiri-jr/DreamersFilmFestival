import "server-only";

import { cookies } from "next/headers";

import { getReferralAttributionSecret } from "@/lib/env/server";
import type { ReferralAttribution } from "@/lib/referrals/domain";
import {
  createReferralAttributionToken,
  REFERRAL_ATTRIBUTION_COOKIE,
  REFERRAL_ATTRIBUTION_WINDOW_SECONDS,
  verifyReferralAttributionToken,
} from "@/lib/referrals/token";

export async function readReferralAttributionCookie(): Promise<ReferralAttribution | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(REFERRAL_ATTRIBUTION_COOKIE)?.value;
  return token
    ? verifyReferralAttributionToken(token, getReferralAttributionSecret())
    : null;
}

export async function writeReferralAttributionCookie(
  attribution: ReferralAttribution,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    REFERRAL_ATTRIBUTION_COOKIE,
    createReferralAttributionToken(
      attribution,
      getReferralAttributionSecret(),
    ),
    {
      httpOnly: true,
      maxAge: REFERRAL_ATTRIBUTION_WINDOW_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function clearReferralAttributionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFERRAL_ATTRIBUTION_COOKIE);
}

