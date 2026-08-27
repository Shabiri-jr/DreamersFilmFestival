import "server-only";

import { createHash, randomBytes } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

const CODE_PREFIXES: Readonly<Record<string, string>> = {
  dreamer: "DR",
  "d-shift": "DS",
  network: "NW",
  solo: "SO",
  afatakpa: "AF",
};

export type TicketCredentialInput = Readonly<{
  ticketCode: string;
  qrToken: string;
  publicAccessToken: string;
}>;

export function hashTicketCredential(value: string): string {
  if (!TOKEN_PATTERN.test(value)) throw new Error("Ticket credential is invalid.");
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function randomCodeSuffix(length = 6): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function createTicketCredential(slug: string): TicketCredentialInput {
  const prefix = CODE_PREFIXES[slug];
  if (!prefix) throw new Error("Ticket category cannot be issued.");
  return {
    ticketCode: `DFF-${prefix}-${randomCodeSuffix()}`,
    qrToken: randomBytes(32).toString("hex"),
    publicAccessToken: randomBytes(32).toString("hex"),
  };
}

export function createTicketCredentialSet(
  slug: string,
  quantity: number,
): TicketCredentialInput[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Ticket quantity cannot be issued.");
  }
  const credentials = Array.from({ length: quantity }, () =>
    createTicketCredential(slug),
  );
  if (
    new Set(credentials.map((item) => item.ticketCode)).size !== quantity ||
    new Set(credentials.map((item) => item.qrToken)).size !== quantity ||
    new Set(credentials.map((item) => item.publicAccessToken)).size !== quantity
  ) {
    throw new Error("Ticket credential generation must be retried.");
  }
  return credentials;
}

export function buildPublicPassUrl(origin: string, token: string): string {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Ticket access token is invalid.");
  return new URL(`/pass/${token}`, origin).toString();
}

export function buildQrValidationUrl(origin: string, token: string): string {
  if (!TOKEN_PATTERN.test(token)) throw new Error("QR credential is invalid.");
  return new URL(`/validate/${token}`, origin).toString();
}

export function isTicketCredential(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}
