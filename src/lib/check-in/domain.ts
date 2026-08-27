import type {
  CheckInSource,
  GateTicketOutcome,
  GateTicketResult,
} from "@/types/domain";

const QR_CREDENTIAL_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GATE_OUTCOMES = new Set<GateTicketOutcome>([
  "valid",
  "already_used",
  "cancelled",
  "invalid",
  "checked_in",
]);

export type GateRpcRow = Readonly<{
  outcome: string;
  ticket_id: string | null;
  ticket_code: string | null;
  holder_name: string | null;
  ticket_type_name: string | null;
  admission_count: number | null;
  ticket_status: GateTicketResult["ticketStatus"];
  checked_in_at: string | null;
  checked_in_by_name: string | null;
  order_number: string | null;
}>;

export function parseQrCredentialPayload(
  payload: string,
  appOrigin: string,
): string | null {
  const value = payload.trim();
  if (QR_CREDENTIAL_PATTERN.test(value)) return value;
  if (value.length > 500) return null;

  try {
    const expectedOrigin = new URL(appOrigin).origin;
    const scannedUrl = new URL(value);
    if (
      scannedUrl.origin !== expectedOrigin ||
      scannedUrl.username ||
      scannedUrl.password ||
      scannedUrl.search ||
      scannedUrl.hash
    ) {
      return null;
    }
    const match = scannedUrl.pathname.match(/^\/validate\/([0-9a-f]{64})\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function normalizeGateSearchQuery(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 4 && normalized.length <= 120
    ? normalized
    : null;
}

export function isTicketId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isCheckInSource(value: string): value is CheckInSource {
  return value === "qr" || value === "manual";
}

export function mapGateTicket(row: GateRpcRow | undefined): GateTicketResult {
  if (!row || !GATE_OUTCOMES.has(row.outcome as GateTicketOutcome)) {
    return invalidGateTicket();
  }
  return {
    outcome: row.outcome as GateTicketOutcome,
    ticketId: row.ticket_id,
    ticketCode: row.ticket_code,
    holderName: row.holder_name,
    ticketTypeName: row.ticket_type_name,
    admissionCount: row.admission_count,
    ticketStatus: row.ticket_status,
    checkedInAt: row.checked_in_at,
    checkedInByName: row.checked_in_by_name,
    orderNumber: row.order_number,
  };
}

export function invalidGateTicket(): GateTicketResult {
  return {
    outcome: "invalid",
    ticketId: null,
    ticketCode: null,
    holderName: null,
    ticketTypeName: null,
    admissionCount: null,
    ticketStatus: null,
    checkedInAt: null,
    checkedInByName: null,
    orderNumber: null,
  };
}
