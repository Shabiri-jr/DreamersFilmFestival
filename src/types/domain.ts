export const ADMIN_ROLES = [
  "super_admin",
  "payment_admin",
  "gate_staff",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PAYMENT_STATUSES = [
  "awaiting_payment",
  "submitted",
  "verified",
  "rejected",
  "cancelled",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TICKET_STATUSES = [
  "valid",
  "checked_in",
  "cancelled",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CHECK_IN_SOURCES = ["qr", "manual"] as const;

export type CheckInSource = (typeof CHECK_IN_SOURCES)[number];

export const GATE_TICKET_OUTCOMES = [
  "valid",
  "already_used",
  "cancelled",
  "invalid",
  "checked_in",
] as const;

export type GateTicketOutcome = (typeof GATE_TICKET_OUTCOMES)[number];

export type GateTicketResult = Readonly<{
  outcome: GateTicketOutcome;
  ticketId: string | null;
  ticketCode: string | null;
  holderName: string | null;
  ticketTypeName: string | null;
  admissionCount: number | null;
  ticketStatus: TicketStatus | null;
  checkedInAt: string | null;
  checkedInByName: string | null;
  orderNumber: string | null;
}>;

export type GateDashboard = Readonly<{
  eventName: string;
  eventDate: string;
  venue: string;
  venueCapacity: number | null;
  validPassesIssued: number;
  passesCheckedIn: number;
  passesRemaining: number;
  peopleAdmitted: number;
  maximumPotentialAttendance: number;
  checkInPercentage: number;
}>;

export type CheckInHistoryItem = Readonly<{
  id: string;
  checkedInAt: string;
  ticketCode: string;
  holderName: string;
  ticketTypeName: string;
  admissionCount: number;
  source: CheckInSource;
  staffName: string;
}>;

export const TICKET_ISSUANCE_STATUSES = [
  "not_issued",
  "issued",
  "failed",
] as const;

export type TicketIssuanceStatus =
  (typeof TICKET_ISSUANCE_STATUSES)[number];

export const REFERRAL_SOURCES = ["referral_link", "manual_code"] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export const COMMISSION_STATUSES = [
  "pending",
  "earned",
  "paid",
  "cancelled",
] as const;

export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const PAYMENT_SUBMISSION_STATUSES = [
  "submitted",
  "accepted",
  "rejected",
  "superseded",
] as const;

export type PaymentSubmissionStatus =
  (typeof PAYMENT_SUBMISSION_STATUSES)[number];

export type TicketType = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  commissionAmount: number;
  benefits: string[];
  admissionsPerUnit: number;
  quantityAvailable: number | null;
  maximumPerOrder: number | null;
  isActive: boolean;
}>;

export type CustomerTicketType = Readonly<
  Omit<TicketType, "commissionAmount">
>;

export type FestivalSettings = Readonly<{
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventEndTime: string | null;
  venue: string;
  supportWhatsapp: string;
  salesEnabled: boolean;
}>;

export type BankTransferSettings = Readonly<{
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
}>;

export type OrderSummary = Readonly<{
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  ticketTypeId: string;
  quantity: number;
  totalAmount: number;
  checkoutIdempotencyKey: string;
  unitPriceSnapshot: number;
  commissionRateSnapshot: number;
  promoterId: string | null;
  referralCode: string | null;
  referralSource: ReferralSource | null;
  paymentStatus: PaymentStatus;
}>;

export type PaymentOrder = Readonly<{
  id: string;
  orderNumber: string;
  customerName: string;
  ticketName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  amountPaid: number | null;
  paymentSubmittedAt: string | null;
  rejectionReason: string | null;
  ticketIssuanceStatus: TicketIssuanceStatus;
}>;

export type PromoterSummary = Readonly<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referralCode: string;
  isActive: boolean;
}>;

export type CommissionSummary = Readonly<{
  id: string;
  promoterId: string;
  orderId: string;
  amount: number;
  status: CommissionStatus;
  earnedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}>;

export type TicketSummary = Readonly<{
  id: string;
  orderId: string;
  ticketCode: string;
  ticketTypeId: string;
  attendeeName: string;
  status: TicketStatus;
  unitIndex: number;
  ticketTypeName: string;
  admissionCount: number;
  issuedAt: string;
}>;
