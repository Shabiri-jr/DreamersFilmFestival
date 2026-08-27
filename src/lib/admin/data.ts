import "server-only";

import { requireFinanceAdmin, requireSuperAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderPassLinks, type OrderPassLink } from "@/lib/tickets/data";
import type {
  CommissionStatus,
  PaymentStatus,
  ReferralSource,
  TicketIssuanceStatus,
  TicketStatus,
} from "@/types/domain";

export type AdminDashboardMetrics = Readonly<{
  pendingCount: number;
  pendingValue: number;
  verifiedCount: number;
  rejectedCount: number;
  verifiedRevenue: number;
  verifiedUnits: number;
  commissionEarned: number;
  commissionOutstanding: number;
}>;

export type AdminQueueOrder = Readonly<{
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  ticketName: string;
  quantity: number;
  expectedAmount: number;
  submittedAmount: number | null;
  promoterName: string | null;
  referralCode: string | null;
  paymentStatus: PaymentStatus;
  submittedAt: string | null;
  submissionId: string | null;
  amountMismatch: boolean;
  potentialDuplicate: boolean;
}>;

type SubmissionDetail = Readonly<{
  id: string;
  senderName: string;
  senderBank: string;
  amountPaid: number;
  expectedAmount: number;
  amountMismatch: boolean;
  paymentReference: string;
  normalizedReference: string;
  potentialDuplicate: boolean;
  paymentDate: string;
  paymentTime: string | null;
  receiptPath: string;
  receiptKind: "image" | "pdf";
  status: "submitted" | "accepted" | "rejected" | "superseded";
  createdAt: string;
}>;

export type AdminOrderReview = Readonly<{
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  ticketName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  rejectionReason: string | null;
  rejectedAt: string | null;
  rejectedByName: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  promoter: null | {
    id: string;
    name: string;
    referralCode: string;
    referralSource: ReferralSource;
    isActive: boolean;
  };
  commissionPreview: number;
  commission: null | {
    id: string;
    amount: number;
    status: CommissionStatus;
  };
  currentSubmission: SubmissionDetail | null;
  submissions: SubmissionDetail[];
  duplicateOrderNumbers: string[];
  ticketIssuanceStatus: TicketIssuanceStatus;
  ticketIssuanceAttempts: number;
  ticketIssuanceLastAttemptAt: string | null;
  tickets: OrderPassLink[];
}>;

export type AdminTicketRow = Readonly<{
  id: string;
  ticketCode: string;
  customerName: string;
  phone: string;
  ticketTypeName: string;
  admissionCount: number;
  orderNumber: string;
  status: TicketStatus;
  issuedAt: string;
}>;

export type AdminTicketDetail = AdminTicketRow & Readonly<{
  paymentStatus: PaymentStatus;
  verifiedAt: string | null;
  pass: OrderPassLink;
}>;

export type PromoterPerformance = Readonly<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referralCode: string;
  isActive: boolean;
  verifiedOrders: number;
  ticketsSold: number;
  verifiedRevenue: number;
  earned: number;
  paid: number;
  balance: number;
}>;

export type PromoterSale = Readonly<{
  buyer: string;
  orderNumber: string;
  ticketName: string;
  quantity: number;
  revenue: number;
  paymentStatus: PaymentStatus;
  commission: number;
  commissionStatus: CommissionStatus | null;
  createdAt: string;
}>;

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  await requireFinanceAdmin();
  const supabase = await createClient();
  const [{ data: orders, error: ordersError }, { data: commissions, error: commissionError }] =
    await Promise.all([
      supabase.from("orders").select("payment_status,total_amount,quantity"),
      supabase.from("commissions").select("amount,status"),
    ]);
  if (ordersError || commissionError) {
    throw new Error("Admin dashboard data is unavailable.");
  }

  const safeOrders = orders ?? [];
  const safeCommissions = commissions ?? [];
  return {
    pendingCount: safeOrders.filter((order) => order.payment_status === "submitted").length,
    pendingValue: safeOrders
      .filter((order) => order.payment_status === "submitted")
      .reduce((sum, order) => sum + Number(order.total_amount), 0),
    verifiedCount: safeOrders.filter((order) => order.payment_status === "verified").length,
    rejectedCount: safeOrders.filter((order) => order.payment_status === "rejected").length,
    verifiedRevenue: safeOrders
      .filter((order) => order.payment_status === "verified")
      .reduce((sum, order) => sum + Number(order.total_amount), 0),
    verifiedUnits: safeOrders
      .filter((order) => order.payment_status === "verified")
      .reduce((sum, order) => sum + order.quantity, 0),
    commissionEarned: safeCommissions
      .filter((commission) => commission.status === "earned" || commission.status === "paid")
      .reduce((sum, commission) => sum + Number(commission.amount), 0),
    commissionOutstanding: safeCommissions
      .filter((commission) => commission.status === "earned")
      .reduce((sum, commission) => sum + Number(commission.amount), 0),
  };
}

export async function searchAdminOrders(
  status: PaymentStatus | null,
  query: string,
): Promise<AdminQueueOrder[]> {
  await requireFinanceAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_admin_payment_orders", {
    p_status: status,
    p_query: query || null,
    p_limit: 200,
  });
  if (error) throw new Error("Payment orders are unavailable.");
  return (data ?? []).map((order) => ({
    id: order.order_id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phone: order.phone,
    ticketName: order.ticket_name,
    quantity: order.quantity,
    expectedAmount: Number(order.expected_amount),
    submittedAmount: order.submitted_amount === null ? null : Number(order.submitted_amount),
    promoterName: order.promoter_name,
    referralCode: order.referral_code,
    paymentStatus: order.payment_status,
    submittedAt: order.payment_submitted_at,
    submissionId: order.submission_id,
    amountMismatch: order.amount_mismatch,
    potentialDuplicate: order.potential_duplicate,
  }));
}

function mapSubmission(submission: {
  id: string;
  sender_name: string;
  sender_bank: string;
  amount_paid: number;
  expected_amount_snapshot: number;
  amount_mismatch: boolean;
  payment_reference: string;
  normalized_reference: string;
  potential_duplicate: boolean;
  payment_date: string;
  payment_time: string | null;
  receipt_path: string;
  status: "submitted" | "accepted" | "rejected" | "superseded";
  created_at: string;
}): SubmissionDetail {
  return {
    id: submission.id,
    senderName: submission.sender_name,
    senderBank: submission.sender_bank,
    amountPaid: Number(submission.amount_paid),
    expectedAmount: Number(submission.expected_amount_snapshot),
    amountMismatch: submission.amount_mismatch,
    paymentReference: submission.payment_reference,
    normalizedReference: submission.normalized_reference,
    potentialDuplicate: submission.potential_duplicate,
    paymentDate: submission.payment_date,
    paymentTime: submission.payment_time,
    receiptPath: submission.receipt_path,
    receiptKind: submission.receipt_path.endsWith(".pdf") ? "pdf" : "image",
    status: submission.status,
    createdAt: submission.created_at,
  };
}

export async function getAdminOrderReview(orderNumber: string): Promise<AdminOrderReview | null> {
  await requireFinanceAdmin();
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,phone,email,created_at,ticket_type_id,quantity,unit_price_snapshot,total_amount,commission_rate_snapshot,payment_status,rejection_reason,rejected_at,rejected_by,verified_at,verified_by,promoter_id,referral_code,referral_source,ticket_issuance_status,ticket_issuance_attempts,ticket_issuance_last_attempt_at")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error("Order review data is unavailable.");
  if (!order) return null;

  const [ticketResult, submissionResult, commissionResult, promoterResult, issuedTickets] = await Promise.all([
    supabase.from("ticket_types").select("name").eq("id", order.ticket_type_id).single(),
    supabase.from("payment_submissions").select("id,sender_name,sender_bank,amount_paid,expected_amount_snapshot,amount_mismatch,payment_reference,normalized_reference,potential_duplicate,payment_date,payment_time,receipt_path,status,created_at").eq("order_id", order.id).order("created_at", { ascending: false }),
    supabase.from("commissions").select("id,amount,status").eq("order_id", order.id).maybeSingle(),
    order.promoter_id
      ? supabase.from("promoters").select("id,name,is_active").eq("id", order.promoter_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getOrderPassLinks(order.id),
  ]);
  if (ticketResult.error || !ticketResult.data || submissionResult.error || commissionResult.error || promoterResult.error) {
    throw new Error("Order review data is incomplete.");
  }

  const submissions = (submissionResult.data ?? []).map(mapSubmission);
  const currentSubmission = submissions[0] ?? null;
  let duplicateOrderNumbers: string[] = [];
  if (currentSubmission?.potentialDuplicate) {
    const { data: matches } = await supabase
      .from("payment_submissions")
      .select("order_id")
      .eq("normalized_reference", currentSubmission.normalizedReference)
      .neq("order_id", order.id);
    const duplicateIds = [...new Set((matches ?? []).map((match) => match.order_id))];
    if (duplicateIds.length > 0) {
      const { data: duplicateOrders } = await supabase
        .from("orders")
        .select("order_number")
        .in("id", duplicateIds);
      duplicateOrderNumbers = (duplicateOrders ?? []).map((item) => item.order_number);
    }
  }

  const actorIds = [order.verified_by, order.rejected_by].filter((value): value is string => Boolean(value));
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from("admin_profiles").select("id,name").in("id", actorIds);
    (actors ?? []).forEach((actor) => actorNames.set(actor.id, actor.name));
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phone: order.phone,
    email: order.email,
    createdAt: order.created_at,
    ticketName: ticketResult.data.name,
    quantity: order.quantity,
    unitPrice: Number(order.unit_price_snapshot),
    totalAmount: Number(order.total_amount),
    paymentStatus: order.payment_status,
    rejectionReason: order.rejection_reason,
    rejectedAt: order.rejected_at,
    rejectedByName: order.rejected_by ? actorNames.get(order.rejected_by) ?? "Authorized administrator" : null,
    verifiedAt: order.verified_at,
    verifiedByName: order.verified_by ? actorNames.get(order.verified_by) ?? "Authorized administrator" : null,
    promoter:
      order.promoter_id && order.referral_code && order.referral_source && promoterResult.data
        ? {
            id: promoterResult.data.id,
            name: promoterResult.data.name,
            referralCode: order.referral_code,
            referralSource: order.referral_source,
            isActive: promoterResult.data.is_active,
          }
        : null,
    commissionPreview: order.promoter_id
      ? order.quantity * Number(order.commission_rate_snapshot)
      : 0,
    commission: commissionResult.data
      ? {
          id: commissionResult.data.id,
          amount: Number(commissionResult.data.amount),
          status: commissionResult.data.status,
        }
      : null,
    currentSubmission,
    submissions,
    duplicateOrderNumbers,
    ticketIssuanceStatus: order.ticket_issuance_status,
    ticketIssuanceAttempts: order.ticket_issuance_attempts,
    ticketIssuanceLastAttemptAt: order.ticket_issuance_last_attempt_at,
    tickets: issuedTickets,
  };
}

export async function searchAdminTickets(query: string): Promise<AdminTicketRow[]> {
  await requireSuperAdmin();
  const normalizedQuery = query.trim().replace(/\s+/g, " ").slice(0, 120);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_admin_tickets", {
    p_query: normalizedQuery || null,
    p_limit: 300,
  });
  if (error) throw new Error("Ticket search is unavailable.");
  return (data ?? []).map((ticket) => ({
    id: ticket.ticket_id,
    ticketCode: ticket.ticket_code,
    customerName: ticket.customer_name,
    phone: ticket.phone,
    ticketTypeName: ticket.ticket_type_name,
    admissionCount: ticket.admission_count,
    orderNumber: ticket.order_number,
    status: ticket.ticket_status,
    issuedAt: ticket.issued_at,
  }));
}

export async function getAdminTicketDetail(
  ticketCode: string,
): Promise<AdminTicketDetail | null> {
  await requireSuperAdmin();
  if (!/^DFF-(DR|DS|NW|SO|AF)-[A-Z2-9]{6}$/.test(ticketCode)) return null;
  const supabase = createAdminClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id,order_id,unit_index,ticket_code,ticket_type_name_snapshot,admission_count,status,issued_at,public_access_token")
    .eq("ticket_code", ticketCode)
    .maybeSingle();
  if (error || !ticket) return null;
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_number,customer_name,phone,payment_status,verified_at")
    .eq("id", ticket.order_id)
    .single();
  if (orderError || !order) return null;
  const orderPasses = await getOrderPassLinks(ticket.order_id);
  const matchingPass = orderPasses.find(
    (item) => item.id === ticket.id,
  );
  if (!matchingPass) return null;
  return {
    id: ticket.id,
    ticketCode: ticket.ticket_code,
    customerName: order.customer_name,
    phone: order.phone,
    ticketTypeName: ticket.ticket_type_name_snapshot,
    admissionCount: ticket.admission_count,
    orderNumber: order.order_number,
    status: ticket.status,
    issuedAt: ticket.issued_at,
    paymentStatus: order.payment_status,
    verifiedAt: order.verified_at,
    pass: matchingPass,
  };
}

export async function getPromoterPerformance(): Promise<PromoterPerformance[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const [{ data: promoters, error: promoterError }, { data: orders, error: orderError }, { data: commissions, error: commissionError }] = await Promise.all([
    supabase.from("promoters").select("id,name,phone,email,referral_code,is_active").order("name"),
    supabase.from("orders").select("id,promoter_id,payment_status,quantity,total_amount"),
    supabase.from("commissions").select("promoter_id,amount,status"),
  ]);
  if (promoterError || orderError || commissionError) throw new Error("Promoter reporting is unavailable.");

  return (promoters ?? []).map((promoter) => {
    const verifiedOrders = (orders ?? []).filter(
      (order) => order.promoter_id === promoter.id && order.payment_status === "verified",
    );
    const promoterCommissions = (commissions ?? []).filter(
      (commission) => commission.promoter_id === promoter.id,
    );
    const earned = promoterCommissions
      .filter((commission) => commission.status === "earned" || commission.status === "paid")
      .reduce((sum, commission) => sum + Number(commission.amount), 0);
    const paid = promoterCommissions
      .filter((commission) => commission.status === "paid")
      .reduce((sum, commission) => sum + Number(commission.amount), 0);
    return {
      id: promoter.id,
      name: promoter.name,
      phone: promoter.phone,
      email: promoter.email,
      referralCode: promoter.referral_code,
      isActive: promoter.is_active,
      verifiedOrders: verifiedOrders.length,
      ticketsSold: verifiedOrders.reduce((sum, order) => sum + order.quantity, 0),
      verifiedRevenue: verifiedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
      earned,
      paid,
      balance: earned - paid,
    };
  });
}

export async function getPromoterDetails(promoterId: string): Promise<{ promoter: PromoterPerformance; sales: PromoterSale[] } | null> {
  const promoters = await getPromoterPerformance();
  const promoter = promoters.find((item) => item.id === promoterId);
  if (!promoter) return null;

  const supabase = await createClient();
  const [{ data: orders, error: orderError }, { data: tickets, error: ticketError }, { data: commissions, error: commissionError }] = await Promise.all([
    supabase.from("orders").select("id,customer_name,order_number,ticket_type_id,quantity,total_amount,payment_status,created_at").eq("promoter_id", promoterId).eq("payment_status", "verified").order("created_at", { ascending: false }),
    supabase.from("ticket_types").select("id,name"),
    supabase.from("commissions").select("order_id,amount,status").eq("promoter_id", promoterId),
  ]);
  if (orderError || ticketError || commissionError) throw new Error("Promoter sales are unavailable.");
  const ticketNames = new Map((tickets ?? []).map((ticket) => [ticket.id, ticket.name]));
  const commissionByOrder = new Map((commissions ?? []).map((commission) => [commission.order_id, commission]));
  return {
    promoter,
    sales: (orders ?? []).map((order) => {
      const commission = commissionByOrder.get(order.id);
      return {
        buyer: order.customer_name,
        orderNumber: order.order_number,
        ticketName: ticketNames.get(order.ticket_type_id) ?? "Ticket",
        quantity: order.quantity,
        revenue: Number(order.total_amount),
        paymentStatus: order.payment_status,
        commission: commission ? Number(commission.amount) : 0,
        commissionStatus: commission?.status ?? null,
        createdAt: order.created_at,
      };
    }),
  };
}
