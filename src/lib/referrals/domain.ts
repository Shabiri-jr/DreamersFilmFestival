import type { ReferralSource } from "@/types/domain";

export const REFERRAL_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

export type ReferralAttribution = Readonly<{
  promoterId: string;
  referralCode: string;
  source: ReferralSource;
}>;

export function normalizeReferralCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function createReferralAttribution(
  promoterId: string,
  referralCode: string,
  source: ReferralSource,
): ReferralAttribution {
  const normalizedCode = normalizeReferralCode(referralCode);

  if (!promoterId || !normalizedCode) {
    throw new Error("Referral attribution is invalid.");
  }

  return {
    promoterId,
    referralCode: normalizedCode,
    source,
  };
}

export function preserveReferralAttribution(
  existing: ReferralAttribution | null,
  candidate: ReferralAttribution | null,
): ReferralAttribution | null {
  return existing ?? candidate;
}

export function calculateCommission(
  quantity: number,
  commissionRate: number,
): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("Ticket quantity must be a positive integer.");
  }

  if (!Number.isFinite(commissionRate) || commissionRate < 0) {
    throw new Error("Commission rate must be a non-negative number.");
  }

  return quantity * commissionRate;
}

export function buildReferralLink(
  appOrigin: string,
  referralCode: string,
): string {
  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    throw new Error("Referral code is invalid.");
  }

  const referralUrl = new URL("/tickets", appOrigin);
  referralUrl.searchParams.set("ref", normalizedCode);
  return referralUrl.toString();
}

