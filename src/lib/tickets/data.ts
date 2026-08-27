import "server-only";

import QRCode from "qrcode";

import { getServerEnvironment } from "@/lib/env/server";
import { getFestivalSettings } from "@/lib/festival/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowPublicTicketValidation } from "@/lib/security/public-rate-limit";
import {
  buildPublicPassUrl,
  buildQrValidationUrl,
  hashTicketCredential,
  isTicketCredential,
} from "@/lib/tickets/credentials";
import { formatEventDate, formatEventTime } from "@/lib/tickets/presentation";
import type { TicketStatus } from "@/types/domain";

export type OrderPassLink = Readonly<{
  id: string;
  unitIndex: number;
  ticketCode: string;
  ticketTypeName: string;
  admissionCount: number;
  status: TicketStatus;
  issuedAt: string;
  passUrl: string;
  downloadUrl: string;
}>;

export type DigitalPass = OrderPassLink & Readonly<{
  orderNumber: string;
  holderName: string;
  customerPhone: string;
  qrToken: string;
  qrValidationUrl: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  supportWhatsapp: string;
}>;

export type PublicValidation = Readonly<{
  ticketTypeName: string;
  admissionCount: number;
  status: TicketStatus;
}>;

function passLink(
  ticket: {
    id: string;
    unit_index: number;
    ticket_code: string;
    ticket_type_name_snapshot: string;
    admission_count: number;
    status: TicketStatus;
    issued_at: string;
    public_access_token: string;
  },
  appOrigin: string,
): OrderPassLink {
  return {
    id: ticket.id,
    unitIndex: ticket.unit_index,
    ticketCode: ticket.ticket_code,
    ticketTypeName: ticket.ticket_type_name_snapshot,
    admissionCount: ticket.admission_count,
    status: ticket.status,
    issuedAt: ticket.issued_at,
    passUrl: buildPublicPassUrl(appOrigin, ticket.public_access_token),
    downloadUrl: new URL(
      `/pass/${ticket.public_access_token}/download`,
      appOrigin,
    ).toString(),
  };
}

export async function getOrderPassLinks(orderId: string): Promise<OrderPassLink[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id,unit_index,ticket_code,ticket_type_name_snapshot,admission_count,status,issued_at,public_access_token")
    .eq("order_id", orderId)
    .order("unit_index");
  if (error) throw new Error("Issued passes are unavailable.");
  const { appOrigin } = getServerEnvironment();
  return (data ?? []).map((ticket) => passLink(ticket, appOrigin));
}

export async function getDigitalPass(
  publicAccessToken: string,
): Promise<DigitalPass | null> {
  if (!isTicketCredential(publicAccessToken)) return null;
  const supabase = createAdminClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id,order_id,unit_index,ticket_code,qr_token,public_access_token,ticket_type_name_snapshot,admission_count,status,issued_at")
    .eq("public_access_token_hash", hashTicketCredential(publicAccessToken))
    .maybeSingle();
  if (error || !ticket) return null;

  const [{ data: order, error: orderError }, settings] = await Promise.all([
    supabase
      .from("orders")
      .select("order_number,customer_name,phone")
      .eq("id", ticket.order_id)
      .single(),
    getFestivalSettings(),
  ]);
  if (orderError || !order) return null;

  const { appOrigin } = getServerEnvironment();
  return {
    ...passLink(ticket, appOrigin),
    orderNumber: order.order_number,
    holderName: order.customer_name,
    customerPhone: order.phone,
    qrToken: ticket.qr_token,
    qrValidationUrl: buildQrValidationUrl(appOrigin, ticket.qr_token),
    eventName: settings.eventName,
    eventDate: formatEventDate(settings.eventDate),
    eventTime: formatEventTime(settings.eventTime, settings.eventEndTime),
    venue: settings.venue,
    supportWhatsapp: settings.supportWhatsapp,
  };
}

export async function getPublicValidation(
  qrCredential: string,
): Promise<PublicValidation | null> {
  if (!isTicketCredential(qrCredential)) return null;
  if (!(await allowPublicTicketValidation())) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("ticket_type_name_snapshot,admission_count,status")
    .eq("qr_token_hash", hashTicketCredential(qrCredential))
    .maybeSingle();
  if (error || !data) return null;
  return {
    ticketTypeName: data.ticket_type_name_snapshot,
    admissionCount: data.admission_count,
    status: data.status,
  };
}

export async function createPassQrDataUrl(pass: DigitalPass): Promise<string> {
  return QRCode.toDataURL(pass.qrValidationUrl, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 760,
    color: { dark: "#17120fff", light: "#fff7e7ff" },
  });
}
