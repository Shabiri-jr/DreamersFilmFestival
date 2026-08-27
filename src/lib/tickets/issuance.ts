import "server-only";

import { createTicketCredentialSet } from "@/lib/tickets/credentials";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TicketIssuanceResult =
  | Readonly<{ success: true }>
  | Readonly<{ success: false; error: string }>;

function safeIssuanceError(message: string): string {
  if (/only verified/i.test(message)) return "Only verified orders can receive tickets.";
  if (/permission/i.test(message)) return "You do not have permission to issue tickets.";
  if (/existing ticket count/i.test(message)) {
    return "The existing ticket set needs administrator review before retrying.";
  }
  return "Ticket issuance could not finish. The verified payment is safe and issuance can be retried.";
}

export async function issueTicketsForOrder(
  orderId: string,
): Promise<TicketIssuanceResult> {
  if (!UUID_PATTERN.test(orderId)) return { success: false, error: "Order is invalid." };

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,payment_status,quantity,ticket_type_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    return { success: false, error: "Order is unavailable." };
  }
  if (order.payment_status !== "verified") {
    return { success: false, error: "Only verified orders can receive tickets." };
  }

  const { data: ticketType, error: ticketTypeError } = await supabase
    .from("ticket_types")
    .select("slug")
    .eq("id", order.ticket_type_id)
    .single();
  if (ticketTypeError || !ticketType) {
    return { success: false, error: "Ticket category is unavailable." };
  }

  let lastError = "Ticket issuance failed.";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const credentials = createTicketCredentialSet(ticketType.slug, order.quantity);
    const { error } = await supabase.rpc("issue_order_tickets", {
      p_order_id: order.id,
      p_ticket_codes: credentials.map((item) => item.ticketCode),
      p_qr_tokens: credentials.map((item) => item.qrToken),
      p_public_access_tokens: credentials.map((item) => item.publicAccessToken),
    });
    if (!error) return { success: true };
    lastError = error.message;
    if (!/duplicate|unique/i.test(error.message)) break;
  }

  await supabase.rpc("record_ticket_issuance_failure", { p_order_id: order.id });
  return { success: false, error: safeIssuanceError(lastError) };
}
