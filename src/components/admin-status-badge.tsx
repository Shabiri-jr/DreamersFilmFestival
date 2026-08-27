import type { PaymentStatus } from "@/types/domain";

const STATUS = {
  awaiting_payment: { label: "Awaiting payment", tone: "bg-slate-100 text-slate-700" },
  submitted: { label: "Pending review", tone: "bg-amber-100 text-amber-900" },
  verified: { label: "Verified", tone: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", tone: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", tone: "bg-zinc-200 text-zinc-700" },
} satisfies Record<PaymentStatus, { label: string; tone: string }>;

export function AdminStatusBadge({ status }: { status: PaymentStatus }) {
  const item = STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold tracking-[0.06em] uppercase ${item.tone}`}>{item.label}</span>;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return STATUS[status].label;
}
