import { ArrowLeft, FilePdf, Image as ImageIcon, Warning, WarningCircle } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminReviewActions } from "@/components/admin-review-actions";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { IssuedPassList } from "@/components/issued-pass-list";
import { issueTicketsAction } from "@/lib/admin/actions";
import { getAdminOrderReview } from "@/lib/admin/data";
import { getAmountDifference } from "@/lib/admin/review";
import { formatNaira } from "@/lib/format";
import { getFestivalSettings } from "@/lib/festival/data";
import { formatEventDate, formatEventTime } from "@/lib/tickets/presentation";

function formatAdminDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value));
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#17120f]/10 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xs font-extrabold tracking-[0.14em] text-[#e84b16] uppercase">{title}</h2>{children}</section>;
}

function Details({ items }: { items: Array<[string, React.ReactNode]> }) {
  return <dl className="mt-4 divide-y divide-[#17120f]/8">{items.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9.5rem_1fr]"><dt className="text-xs font-bold text-[#17120f]/46">{label}</dt><dd className="m-0 min-w-0 break-words text-sm font-bold tabular-nums">{value}</dd></div>)}</dl>;
}

export default async function AdminOrderReviewPage({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ result?: string; error?: string }> }) {
  const { orderNumber: rawOrderNumber } = await params;
  const query = await searchParams;
  const [order, settings] = await Promise.all([
    getAdminOrderReview(rawOrderNumber.toUpperCase()),
    getFestivalSettings(),
  ]);
  if (!order) notFound();
  const submission = order.currentSubmission;
  const difference = submission ? getAmountDifference(order.totalAmount, submission.amountPaid) : null;
  return (
    <div>
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-extrabold text-[#17120f]/60 hover:text-[#17120f]"><ArrowLeft size={18} /> Back to payment queue</Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold tracking-[0.14em] text-[#e84b16] uppercase">Order review</p><h1 className="mt-1 break-all font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">{order.orderNumber}</h1></div><AdminStatusBadge status={order.paymentStatus} /></div>
      {query.result === "verified_issued" && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Payment verified and tickets issued successfully. {order.promoter ? `${order.promoter.name} earned ${formatNaira(order.commissionPreview)}.` : "This was a direct sale with no commission."}</div>}
      {query.result === "verified_pending" && <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">Payment verified successfully, but ticket issuance needs a retry. The payment and any earned commission remain valid.</div>}
      {query.result === "tickets_issued" && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Ticket issuance completed without changing the verified payment or commission.</div>}
      {query.result === "rejected" && <div role="status" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">Payment rejected. The customer can now correct and resubmit their payment information.</div>}
      {query.error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{query.error === "invalid" ? "The review request was invalid." : query.error}</div>}

      {(submission?.amountMismatch || submission?.potentialDuplicate) && <section className="mt-5 grid gap-3 md:grid-cols-2">{submission.amountMismatch && difference && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><WarningCircle size={24} className="text-amber-800" /><p className="mt-3 text-xs font-extrabold tracking-[0.1em] text-amber-900 uppercase">{difference.kind} — {formatNaira(difference.amount)} difference</p><p className="mt-2 text-sm text-amber-950/70">This warning does not approve or reject the payment. Check the bank record.</p></div>}{submission.potentialDuplicate && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><Warning size={24} className="text-amber-800" /><p className="mt-3 text-xs font-extrabold tracking-[0.1em] text-amber-900 uppercase">Possible duplicate transaction reference</p><p className="mt-2 text-sm text-amber-950/70">Investigate without assuming fraud. Related orders: {order.duplicateOrderNumbers.length ? order.duplicateOrderNumbers.join(", ") : "another protected order"}.</p></div>}</section>}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <DetailCard title="Customer"><Details items={[["Customer name", order.customerName], ["WhatsApp", order.phone], ["Email", order.email ?? "Not supplied"], ["Order number", order.orderNumber], ["Order created", formatAdminDate(order.createdAt)]]} /></DetailCard>
        <DetailCard title="Order snapshot"><Details items={[["Ticket type", order.ticketName], ["Quantity", order.quantity], ["Unit price", formatNaira(order.unitPrice)], ["Total expected", formatNaira(order.totalAmount)]]} /><p className="mt-3 text-xs leading-5 text-[#17120f]/46">Historical values shown from the order snapshot, not today’s catalogue.</p></DetailCard>
        <DetailCard title="Payment submission">{submission ? <Details items={[["Sender name", submission.senderName], ["Bank used", submission.senderBank], ["Amount submitted", formatNaira(submission.amountPaid)], ["Expected amount", formatNaira(submission.expectedAmount)], ["Difference", difference?.kind === "match" ? "Exact amount" : `${difference?.kind} · ${formatNaira(difference?.amount ?? 0)}`], ["Transaction reference", submission.paymentReference ?? "Not supplied"], ["Payment date", submission.paymentDate], ["Payment time", submission.paymentTime ?? "Not supplied"], ["Submitted at", formatAdminDate(submission.createdAt)], ["Evidence status", submission.status]]} /> : <p className="mt-4 text-sm text-[#17120f]/55">No payment evidence has been submitted.</p>}</DetailCard>
        <DetailCard title="Promoter attribution">{order.promoter ? <><Details items={[["Referred by", order.promoter.name], ["Referral code", order.promoter.referralCode], ["Attribution source", order.promoter.referralSource === "referral_link" ? "Referral link" : "Manual code"], ["Promoter status", order.promoter.isActive ? "Active" : "Inactive — historical attribution retained"], ["Commission on verification", formatNaira(order.commissionPreview)], ["Commission status", order.commission?.status ?? "Not created"]]} /><p className="mt-3 text-xs leading-5 text-[#17120f]/46">{order.quantity} × captured commission rate. Promoter inactivity blocks new referrals, not this historical obligation.</p></> : <Details items={[["Promoter", "Direct sale"], ["Commission", formatNaira(0)]]} />}</DetailCard>
      </div>

      {submission && <section className="mt-4 rounded-2xl border border-[#17120f]/10 bg-[#17120f] p-5 text-white sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold tracking-[0.14em] text-[#eaa42c] uppercase">Private receipt</p><h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Authorized evidence view</h2><p className="mt-2 text-sm text-white/58">Loaded through a no-store, role-protected server endpoint.</p></div><a href={`/admin/api/receipts/${submission.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#17120f] uppercase">{submission.receiptKind === "pdf" ? <FilePdf size={20} /> : <ImageIcon size={20} />} View payment receipt</a></div>{submission.receiptKind === "image" && <div className="mt-5 overflow-hidden rounded-xl bg-white/5"><Image unoptimized width={1200} height={900} src={`/admin/api/receipts/${submission.id}`} alt={`Payment receipt for order ${order.orderNumber}`} className="max-h-[36rem] w-full object-contain" /></div>}</section>}

      {(order.verifiedAt || order.rejectedAt) && <section className="mt-4 rounded-2xl border border-[#17120f]/10 bg-white p-5 text-sm"><p className="font-extrabold uppercase">Review record</p><p className="mt-2 text-[#17120f]/60">{order.paymentStatus === "verified" ? `Verified by ${order.verifiedByName} at ${formatAdminDate(order.verifiedAt)}.` : `Rejected by ${order.rejectedByName} at ${formatAdminDate(order.rejectedAt)}.`}</p>{order.rejectionReason && <p className="mt-2 rounded-lg bg-red-50 p-3 text-red-900">{order.rejectionReason}</p>}</section>}

      {order.paymentStatus === "verified" && (
        <section className="mt-4 rounded-[1.75rem] bg-[#086544] p-1.5 text-white">
          <div className="rounded-[calc(1.75rem-0.375rem)] bg-[#086544] p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[0.14em] text-[#eaa42c] uppercase">Ticket issuance</p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">
                  {order.ticketIssuanceStatus === "issued" ? "Issued" : order.ticketIssuanceStatus === "failed" ? "Issuance failed" : "Not issued"}
                </h2>
                <p className="mt-2 text-sm text-white/62">Attempts: {order.ticketIssuanceAttempts}{order.ticketIssuanceLastAttemptAt ? ` · Last attempt ${formatAdminDate(order.ticketIssuanceLastAttemptAt)}` : ""}</p>
              </div>
              {order.ticketIssuanceStatus !== "issued" && (
                <form action={issueTicketsAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="orderNumber" value={order.orderNumber} />
                  <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#fff7e7] px-6 text-sm font-extrabold text-[#17120f] uppercase focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#eaa42c]">
                    {order.ticketIssuanceStatus === "failed" ? "Retry issuance" : "Issue tickets"}
                  </button>
                </form>
              )}
            </div>
            {order.tickets.length > 0 && (
              <div className="mt-6">
                <IssuedPassList
                  passes={order.tickets}
                  customerName={order.customerName}
                  targetPhone={order.phone}
                  venue={settings.venue}
                  eventDate={formatEventDate(settings.eventDate)}
                  eventTime={formatEventTime(settings.eventTime, settings.eventEndTime)}
                />
                <p className="mt-4 text-xs leading-5 text-white/52">WhatsApp opens a prepared message to the normalized customer number. Attachments are not automatic; the PNG can be downloaded separately.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {order.paymentStatus === "submitted" && submission?.status === "submitted" && <div className="mt-4"><AdminReviewActions orderId={order.id} submissionId={submission.id} orderNumber={order.orderNumber} customerName={order.customerName} expectedAmount={order.totalAmount} submittedAmount={submission.amountPaid} promoterName={order.promoter?.name ?? null} commissionPreview={order.commissionPreview} /></div>}

      {order.submissions.length > 1 && <DetailCard title="Submission history"><div className="mt-4 space-y-2">{order.submissions.map((item) => <div key={item.id} className="flex flex-col justify-between gap-2 rounded-xl bg-[#f5f1e8] p-3 text-sm sm:flex-row"><span className="font-bold">{formatAdminDate(item.createdAt)} · {item.senderName}</span><span className="font-extrabold uppercase">{item.status}</span></div>)}</div></DetailCard>}
    </div>
  );
}
