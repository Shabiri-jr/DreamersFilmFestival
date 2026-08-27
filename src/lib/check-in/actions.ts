"use server";

import { revalidatePath } from "next/cache";

import {
  isCheckInSource,
  isTicketId,
  mapGateTicket,
  normalizeGateSearchQuery,
  parseQrCredentialPayload,
  type GateRpcRow,
} from "@/lib/check-in/domain";
import {
  searchGateTickets,
  validateGateTicket,
} from "@/lib/check-in/data";
import { getServerEnvironment } from "@/lib/env/server";
import { assertTrustedOrigin } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";
import { hashTicketCredential } from "@/lib/tickets/credentials";
import type {
  CheckInSource,
  GateTicketResult,
} from "@/types/domain";

export type GateActionResponse = Readonly<{
  result?: GateTicketResult;
  results?: GateTicketResult[];
  error?: string;
}>;

function gateError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  if (/too many/i.test(message)) return "Too many attempts. Wait one minute and try again.";
  if (/permission|gate access|active staff/i.test(message)) return "Your gate access is no longer active. Sign in again.";
  return "The gate service could not complete this request. Check your connection and try again.";
}

export async function validateGateCredentialAction(
  payload: string,
): Promise<GateActionResponse> {
  await assertTrustedOrigin();
  const credential = parseQrCredentialPayload(
    payload,
    getServerEnvironment().appOrigin,
  );
  if (!credential) return { result: mapGateTicket(undefined) };
  try {
    return { result: await validateGateTicket(hashTicketCredential(credential)) };
  } catch (error) {
    return { error: gateError(error) };
  }
}

export async function searchGateTicketsAction(
  query: string,
): Promise<GateActionResponse> {
  await assertTrustedOrigin();
  const normalized = normalizeGateSearchQuery(query);
  if (!normalized) return { error: "Enter at least 4 characters from a ticket code, order number, name, or phone." };
  try {
    return { results: await searchGateTickets(normalized) };
  } catch (error) {
    return { error: gateError(error) };
  }
}

export async function redeemGateTicketAction(
  ticketId: string,
  source: CheckInSource,
): Promise<GateActionResponse> {
  await assertTrustedOrigin();
  if (!isTicketId(ticketId) || !isCheckInSource(source)) {
    return { result: mapGateTicket(undefined) };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("redeem_gate_ticket", {
      p_ticket_id: ticketId,
      p_source: source,
    });
    if (error) throw error;
    revalidatePath("/check-in");
    revalidatePath("/admin/check-ins");
    return { result: mapGateTicket(data?.[0] as GateRpcRow | undefined) };
  } catch (error) {
    return { error: gateError(error) };
  }
}
