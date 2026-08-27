import { randomUUID } from "node:crypto";
import {
  ArrowLeft,
  Bank,
  CheckCircle,
  Clock,
  Receipt,
  WarningCircle,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { OrderAccessDenied } from "@/components/order-access-denied";
import { PaymentSubmissionForm } from "@/components/payment-submission-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getFestivalSettings, getPaymentOrder } from "@/lib/festival/data";
import { formatNaira } from "@/lib/format";
import { hasOrderAccess } from "@/lib/orders/access-token";
import { localDateInLagos } from "@/lib/payments/validation";

export const metadata: Metadata = {
  title: "Complete Your Payment",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber: routeOrderNumber } = await params;
  const orderNumber = routeOrderNumber.toUpperCase();
  const settings = await getFestivalSettings();

  if (!(await hasOrderAccess(orderNumber))) {
    return <OrderAccessDenied supportWhatsapp={settings.supportWhatsapp} orderNumber={orderNumber} />;
  }

  const order = await getPaymentOrder(orderNumber);
  if (!order) {
    return <OrderAccessDenied supportWhatsapp={settings.supportWhatsapp} orderNumber={orderNumber} />;
  }

  const canSubmit = order.paymentStatus === "awaiting_payment" || order.paymentStatus === "rejected";
  const bankConfigured = Boolean(settings.bankName && settings.accountName && settings.accountNumber);
  const supportHref = `https://wa.me/${settings.supportWhatsapp.replace(/\D/g, "")}`;
  const statusLabel = order.paymentStatus === "rejected"
    ? "Needs new evidence"
    : order.paymentStatus === "awaiting_payment"
      ? "Awaiting payment"
      : order.paymentStatus === "submitted"
        ? "Under verification"
        : order.paymentStatus === "verified"
          ? "Payment verified"
          : "Order cancelled";

  return (
    <div className="festival-page min-h-[100dvh] bg-[#f3ead8] text-[#17120f]">
      <SiteHeader />
      <main id="main-content" className="px-4 py-10 sm:px-6 md:py-16 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/tickets" className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-extrabold text-[#17120f]/62 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#086544]">
            <ArrowLeft size={18} weight="bold" /> Back to tickets
          </Link>

          <section className="mt-5 overflow-hidden rounded-[2.25rem] bg-[#17120f] p-1.5 text-[#fff7e7] ring-1 ring-[#17120f]/10">
            <div className="rounded-[calc(2.25rem-0.375rem)] bg-[#17120f] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8 md:p-10">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] text-[#eaa42c] uppercase">
                    <CheckCircle size={18} weight="fill" /> {canSubmit ? "Order ready" : "Order status"}
                  </p>
                  <h1 className="mt-4 max-w-[11ch] font-[family-name:var(--font-display)] text-5xl leading-[0.86] font-extrabold tracking-tight uppercase sm:text-7xl">
                    {canSubmit ? "Complete your payment." : statusLabel}
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#f3ead8]/62">
                    {canSubmit
                      ? "Transfer the exact total, then submit your evidence below. A receipt is reviewed by the festival team before any ticket is issued."
                      : "Your latest order state is shown below. Customer-submitted evidence never verifies a payment automatically."}
                  </p>
                </div>
                <div className="border-l-2 border-[#e84b16] pl-4 md:min-w-52">
                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#f3ead8]/44 uppercase">Order number</p>
                  <p className="mt-2 break-all font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[0.06em] text-[#eaa42c] uppercase tabular-nums">{order.orderNumber}</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#f3ead8]/54"><Clock size={16} weight="bold" /> {statusLabel}</p>
                </div>
              </div>

              <dl className="mt-9 grid gap-px overflow-hidden bg-white/12 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Customer", order.customerName],
                  ["Ticket", order.ticketName],
                  ["Quantity", String(order.quantity)],
                  ["Unit price", formatNaira(order.unitPrice)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#17120f] p-4 sm:p-5">
                    <dt className="text-[0.65rem] font-extrabold tracking-[0.14em] text-[#f3ead8]/42 uppercase">{label}</dt>
                    <dd className="mt-2 text-sm font-extrabold text-[#fff7e7]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-col gap-5 border-t border-white/12 pt-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#f3ead8]/46 uppercase">Amount expected</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold text-[#eaa42c] tabular-nums sm:text-6xl">{formatNaira(order.totalAmount)}</p>
                </div>
                {canSubmit && <CopyButton value={String(order.totalAmount)} label="Copy amount" />}
              </div>
            </div>
          </section>

          {canSubmit && bankConfigured && (
            <section className="mt-7 rounded-[2rem] bg-[#e84b16] p-1.5 ring-1 ring-[#17120f]/8">
              <div className="rounded-[calc(2rem-0.375rem)] bg-[#fff7e7] p-5 sm:p-8">
                <div className="flex items-start gap-3">
                  <Bank size={28} weight="light" className="shrink-0 text-[#e84b16]" />
                  <div>
                    <p className="section-eyebrow">Bank transfer details</p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">Pay this account exactly.</h2>
                  </div>
                </div>
                <dl className="mt-7 border-t border-[#17120f]/12">
                  {[
                    ["Bank", settings.bankName],
                    ["Account name", settings.accountName],
                    ["Account number", settings.accountNumber],
                  ].map(([label, value]) => (
                    <div key={label} className="grid gap-2 border-b border-[#17120f]/12 py-5 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
                      <dt className="text-xs font-extrabold tracking-[0.14em] text-[#17120f]/48 uppercase">{label}</dt>
                      <dd className="m-0 text-lg font-extrabold tabular-nums">{value}</dd>
                      {label === "Account number" && value && <CopyButton value={value} label="Copy number" />}
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {canSubmit && !bankConfigured && (
            <section className="mt-7 rounded-[2rem] border border-[#a91f14]/20 bg-[#fff7e7] p-6 sm:p-8">
              <WarningCircle size={32} weight="light" className="text-[#a91f14]" />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">Bank details are being finalized</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#17120f]/62">Do not transfer to an unconfirmed account. Contact The Dreamers TV and quote order {order.orderNumber}.</p>
              <a href={supportHref} className="dark-cta mt-6" rel="noreferrer">Contact support</a>
            </section>
          )}

          <section className="mt-7 grid gap-5 md:grid-cols-[0.72fr_1.28fr] md:items-start">
            <div className="rounded-3xl border border-[#17120f]/12 bg-[#fff7e7] p-6">
              <Receipt size={26} weight="light" className="text-[#086544]" />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">What happens next</h2>
              <ol className="mt-5 space-y-4 text-sm leading-6 text-[#17120f]/64">
                <li><strong className="text-[#17120f]">01.</strong> Transfer the amount to the configured account.</li>
                <li><strong className="text-[#17120f]">02.</strong> Send accurate details and one readable receipt.</li>
                <li><strong className="text-[#17120f]">03.</strong> A ticket is issued only after administrator verification.</li>
              </ol>
            </div>
            {canSubmit ? (
              <PaymentSubmissionForm
                orderNumber={order.orderNumber}
                expectedAmount={order.totalAmount}
                idempotencyKey={randomUUID()}
                today={localDateInLagos()}
                initiallyOpen={order.paymentStatus === "rejected"}
              />
            ) : (
              <div className="rounded-3xl bg-[#086544] p-6 text-[#fff7e7] sm:p-8">
                <CheckCircle size={30} weight="fill" className="text-[#eaa42c]" />
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">{statusLabel}</h2>
                <p className="mt-3 text-sm leading-7 text-[#f3ead8]/72">
                  {order.paymentStatus === "submitted"
                    ? "We've received your payment information and our team is checking the transfer."
                    : order.paymentStatus === "verified"
                      ? "Your payment has been confirmed. Your Dreamers Pass ticket will be prepared next."
                      : "This order cannot accept payment evidence."}
                </p>
                <Link href={`/order/${order.orderNumber}`} className="cream-cta mt-6 px-5">View order status</Link>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter supportWhatsapp={settings.supportWhatsapp} />
    </div>
  );
}
