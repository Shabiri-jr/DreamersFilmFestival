import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BankTransferSettings,
  CustomerTicketType,
  FestivalSettings,
  PaymentOrder,
} from "@/types/domain";

function mapBenefits(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function getFestivalSettings(): Promise<
  FestivalSettings & BankTransferSettings
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_settings")
    .select(
      "event_name, event_date, event_time, event_end_time, venue, support_whatsapp, sales_enabled, bank_name, account_name, account_number",
    )
    .eq("id", 1)
    .single();

  if (error || !data) {
    throw new Error("Festival settings are unavailable.", { cause: error });
  }

  return {
    eventName: data.event_name,
    eventDate: data.event_date,
    eventTime: data.event_time,
    eventEndTime: data.event_end_time,
    venue: data.venue,
    supportWhatsapp: data.support_whatsapp,
    salesEnabled: data.sales_enabled,
    bankName: data.bank_name,
    accountName: data.account_name,
    accountNumber: data.account_number,
  };
}

export async function getActiveTicketTypes(): Promise<CustomerTicketType[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ticket_types")
    .select(
      "id, name, slug, description, price, benefits, admissions_per_unit, quantity_available, maximum_per_order, is_active",
    )
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    throw new Error("Ticket types are unavailable.", { cause: error });
  }

  return (data ?? []).map((ticket) => ({
    id: ticket.id,
    name: ticket.name,
    slug: ticket.slug,
    description: ticket.description,
    price: Number(ticket.price),
    benefits: mapBenefits(ticket.benefits),
    admissionsPerUnit: ticket.admissions_per_unit,
    quantityAvailable: ticket.quantity_available,
    maximumPerOrder: ticket.maximum_per_order,
    isActive: ticket.is_active,
  }));
}

export async function getActiveTicketBySlug(
  slug: string,
): Promise<CustomerTicketType | null> {
  const tickets = await getActiveTicketTypes();
  return tickets.find((ticket) => ticket.slug === slug) ?? null;
}

export async function getPaymentOrder(
  orderNumber: string,
): Promise<PaymentOrder | null> {
  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, ticket_type_id, quantity, unit_price_snapshot, total_amount, payment_status, amount_paid, payment_submitted_at, rejection_reason, ticket_issuance_status",
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    throw new Error("Order details are unavailable.", { cause: error });
  }

  if (!order) {
    return null;
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("ticket_types")
    .select("name")
    .eq("id", order.ticket_type_id)
    .single();

  if (ticketError || !ticket) {
    throw new Error("Order ticket details are unavailable.", {
      cause: ticketError,
    });
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    ticketName: ticket.name,
    quantity: order.quantity,
    unitPrice: Number(order.unit_price_snapshot),
    totalAmount: Number(order.total_amount),
    paymentStatus: order.payment_status,
    amountPaid: order.amount_paid === null ? null : Number(order.amount_paid),
    paymentSubmittedAt: order.payment_submitted_at,
    rejectionReason: order.rejection_reason,
    ticketIssuanceStatus: order.ticket_issuance_status,
  };
}
