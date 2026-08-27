import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IssuedPassList } from "@/components/issued-pass-list";
import { getAdminTicketDetail } from "@/lib/admin/data";
import { getFestivalSettings } from "@/lib/festival/data";
import { admissionLabel, formatEventDate, formatEventTime } from "@/lib/tickets/presentation";

function detailDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value));
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketCode: string }>;
}) {
  const { ticketCode: rawCode } = await params;
  const [ticket, settings] = await Promise.all([
    getAdminTicketDetail(rawCode.toUpperCase()),
    getFestivalSettings(),
  ]);
  if (!ticket) notFound();
  const details: Array<[string, string]> = [
    ["Ticket code", ticket.ticketCode],
    ["Customer", ticket.customerName],
    ["WhatsApp", ticket.phone],
    ["Ticket type", ticket.ticketTypeName],
    ["Admission", admissionLabel(ticket.admissionCount, ticket.ticketTypeName)],
    ["Order", ticket.orderNumber],
    ["Payment", ticket.paymentStatus],
    ["Verified", detailDate(ticket.verifiedAt)],
    ["Ticket status", ticket.status],
    ["Issued", detailDate(ticket.issuedAt)],
  ];
  return (
    <div>
      <Link href="/admin/tickets" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-extrabold text-[#17120f]/60 hover:text-[#17120f]"><ArrowLeft size={18} /> Back to tickets</Link>
      <p className="mt-4 text-xs font-extrabold tracking-[0.14em] text-[#e84b16] uppercase">Ticket detail</p>
      <h1 className="mt-1 break-all font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">{ticket.ticketCode}</h1>
      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#17120f]/10 sm:p-7">
        <dl className="divide-y divide-[#17120f]/8">{details.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs font-bold text-[#17120f]/45">{label}</dt><dd className="break-words text-sm font-extrabold tabular-nums">{value}</dd></div>)}</dl>
      </section>
      <section className="mt-5 rounded-[1.75rem] bg-[#086544] p-5 text-white sm:p-7">
        <h2 className="font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">Digital pass</h2>
        <p className="mt-2 mb-5 text-sm text-white/58">The customer link is a separate bearer credential. The QR secret is not shown as text.</p>
        <IssuedPassList passes={[ticket.pass]} customerName={ticket.customerName} targetPhone={ticket.phone} venue={settings.venue} eventDate={formatEventDate(settings.eventDate)} eventTime={formatEventTime(settings.eventTime, settings.eventEndTime)} />
      </section>
    </div>
  );
}
