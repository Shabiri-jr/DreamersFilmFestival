import { NextRequest, NextResponse } from "next/server";

import {
  clearReferralAttributionCookie,
  readReferralAttributionCookie,
  writeReferralAttributionCookie,
} from "@/lib/referrals/cookies";
import { inspectReferralCode } from "@/lib/referrals/server";

const SAFE_RETURN_PATHS = new Set(["/", "/tickets"]);

export async function GET(request: NextRequest) {
  const requestedReturnPath = request.nextUrl.searchParams.get("returnTo") ?? "/tickets";
  const returnPath = SAFE_RETURN_PATHS.has(requestedReturnPath)
    ? requestedReturnPath
    : "/tickets";
  const redirectUrl = new URL(returnPath, request.url);
  const code = request.nextUrl.searchParams.get("code") ?? "";

  try {
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
        return NextResponse.redirect(redirectUrl);
      }

      await clearReferralAttributionCookie();
    }

    const candidate = await inspectReferralCode(code, "referral_link");
    if (candidate.status === "active") {
      await writeReferralAttributionCookie(candidate.attribution);
    }
  } catch {
    redirectUrl.searchParams.set("referral", "unavailable");
  }

  return NextResponse.redirect(redirectUrl);
}

