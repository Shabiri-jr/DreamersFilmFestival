import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  createReferralAttribution,
  type ReferralAttribution,
} from "@/lib/referrals/domain";
import { REFERRAL_SOURCES } from "@/types/domain";
import type { ReferralSource } from "@/types/domain";

export const REFERRAL_ATTRIBUTION_COOKIE = "dreamers_referral_attribution";
export const REFERRAL_ATTRIBUTION_WINDOW_SECONDS = 60 * 60 * 24 * 30;

type AttributionTokenPayload = ReferralAttribution &
  Readonly<{
    version: 1;
    issuedAt: number;
    expiresAt: number;
  }>;

function requireStrongSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error("Referral attribution secret must be at least 32 characters.");
  }
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function isReferralSource(value: unknown): value is ReferralSource {
  return (
    typeof value === "string" &&
    (REFERRAL_SOURCES as readonly string[]).includes(value)
  );
}

export function createReferralAttributionToken(
  attribution: ReferralAttribution,
  secret: string,
  now = new Date(),
): string {
  requireStrongSecret(secret);

  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: AttributionTokenPayload = {
    ...createReferralAttribution(
      attribution.promoterId,
      attribution.referralCode,
      attribution.source,
    ),
    version: 1,
    issuedAt,
    expiresAt: issuedAt + REFERRAL_ATTRIBUTION_WINDOW_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyReferralAttributionToken(
  token: string,
  secret: string,
  now = new Date(),
): ReferralAttribution | null {
  requireStrongSecret(secret);

  const [encodedPayload, suppliedSignature, extraPart] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extraPart) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  const suppliedBytes = Buffer.from(suppliedSignature, "utf8");
  const expectedBytes = Buffer.from(expectedSignature, "utf8");

  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AttributionTokenPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    if (
      payload.version !== 1 ||
      typeof payload.promoterId !== "string" ||
      typeof payload.referralCode !== "string" ||
      !isReferralSource(payload.source) ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.issuedAt > nowSeconds ||
      payload.expiresAt <= nowSeconds
    ) {
      return null;
    }

    return createReferralAttribution(
      payload.promoterId,
      payload.referralCode,
      payload.source,
    );
  } catch {
    return null;
  }
}
