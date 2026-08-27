import {
  ArrowRight,
  CheckCircle,
  ClockCountdown,
  Prohibit,
  Receipt,
  WarningCircle,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { OrderAccessDenied } from "@/components/order-access-denied";
import { IssuedPassList } from "@/components/issued-pass-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getFestivalSettings, getPaymentOrder } from "@/lib/festival/data";
import { formatNaira } from "@/lib/format";
import { hasOrderAccess } from "@/lib/orders/access-token";
import type { PaymentStatus } from "@/types/domain";
import { getOrderPassLinks } from "@/lib/tickets/data";
import { formatEventDate, formatEventTime } from "@/lib/tickets/presentation";

export const metadata: Metadata = {
  title: "Order Status",
  robots: { index: false, follow: false },
};

const STATUS_COPY: Record<
  PaymentStatus,
  { eyebrow: string; title: string; message: string }
> = {
  awaiting_payment: {
    eyebrow: "Payment not submitted",
    title: "Complete your payment.",
    message: "This order is ready, but no payment evidence has been received.",
  },
  submitted: {
    eyebrow: "Payment submitted",
    title: "Awaiting verification.",
    message: "We've received your payment information and our team is checking the transfer.",
  },
  verified: {
    eyebrow: "Payment verified",
    title: "Payment confirmed.",
    message: "Your payment has been confirmed. Your ticket credentials are prepared separately and can be retried safely.",
  },
  rejected: {
    eyebrow: "Payment could not be verified",
    title: "Review and resubmit.",
    message: "The previous evidence could not be confirmed. You can submit corrected details from the payment page.",
  },
  cancelled: {
    eyebrow: "Order cancelled",
    title: "This order is closed.",
    message: "This order cannot accept any further payment submissions.",
  },
};

function StatusIcon({ status }: { status: PaymentStatus }) {
  if (status === "submitted") return <ClockCountdown size={42} weight="light" />;
  if (status === "verified") return <CheckCircle size={42} weight="fill" />;
  if (status === "cancelled") return <Prohibit size={42} weight="light" />;
  if (status === "rejected") return <WarningCircle size={42} weight="light" />;
  return <Receipt size={42} weight="light" />;
}

export default async function OrderStatusPage({
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

  const copy = STATUS_COPY[order.paymentStatus];
  const canSubmit = order.paymentStatus === "awaiting_payment" || order.paymentStatus === "rejected";
  const amountMismatch = order.amountPaid !== null && order.amountPaid !== order.totalAmount;
  const passes = order.paymentStatus === "verified" ? await getOrderPassLinks(order.id) : [];
  const passesReady = order.ticketIssuanceStatus === "issued" && passes.length === order.quantity;
  const eventDate = formatEventDate(settings.eventDate);
  const eventTime = formatEventTime(settings.eventTime, settings.eventEndTime);

  return (
    <div className="festival-page min-h-[100dvh] bg-[#f3ead8] text-[#17120f]">
      <SiteHeader />
      <main id="main-content" className="px-4 py-10 sm:px-6 md:py-16 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <section className="overflow-hidden rounded-[2.25rem] bg-[#17120f] p-1.5 text-[#fff7e7]">
            <div className="rounded-[calc(2.25rem-0.375rem)] bg-[#17120f] p-6 sm:p-9 md:p-12">
              <div className="text-[#eaa42c]"><StatusIcon status={order.paymentStatus} /></div>
              <p className="mt-6 text-xs font-extrabold tracking-[0.2em] text-[#eaa42c] uppercase">{copy.eyebrow}</p>
              <h1 className="mt-3 max-w-[12ch] font-[family-name:var(--font-display)] text-5xl leading-[0.88] font-extrabold uppercase sm:text-7xl">{copy.title}</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#f3ead8]/68">{copy.message}</p>

              <dl className="mt-9 grid gap-px overflow-hidden bg-white/12 sm:grid-cols-2">
                <div className="bg-[#17120f] p-5">
                  <dt className="text-[0.65rem] font-extrabold tracking-[0.14em] text-[#f3ead8]/44 uppercase">Order</dt>
                  <dd className="mt-2 break-all font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[0.06em] text-[#fff7e7]">{order.orderNumber}</dd>
                </div>
                <div className="bg-[#17120f] p-5">
                  <dt className="text-[0.65rem] font-extrabold tracking-[0.14em] text-[#f3ead8]/44 uppercase">Payment status</dt>
                  <dd className="mt-2 text-sm font-extrabold text-[#eaa42c] uppercase">{copy.eyebrow}</dd>
                </div>
                <div className="bg-[#17120f] p-5">
                  <dt className="text-[0.65rem] font-extrabold tracking-[0.14em] text-[#f3ead8]/44 uppercase">Ticket</dt>
                  <dd className="mt-2 text-sm font-extrabold">{order.ticketName} × {order.quantity}</dd>
                </div>
                <div className="bg-[#17120f] p-5">
                  <dt className="text-[0.65rem] font-extrabold tracking-[0.14em] text-[#f3ead8]/44 uppercase">Amount expected</dt>
                  <dd className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#eaa42c] tabular-nums">{formatNaira(order.totalAmount)}</dd>
                </div>
                {order.amountPaid !== null && (
                  <div className="bg-[#17120f] p-5 sm:col-span-2">
                    <dt className="text-[0.65rem] font-extrabold tracking-[0.14em] text-[#f3ead8]/44 uppercase">Amount submitted</dt>
                    <dd className="mt-2 flex flex-wrap items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums">
                      {formatNaira(order.amountPaid)}
                      {amountMismatch && (
                        <span className="font-[family-name:var(--font-body)] text-xs font-extrabold tracking-normal text-[#eaa42c] uppercase">Different from expected · team review required</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>

              {order.paymentStatus === "rejected" && order.rejectionReason && (
                <div className="mt-6 rounded-xl border border-[#eaa42c]/30 bg-[#eaa42c]/8 p-4">
                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#eaa42c] uppercase">Reason</p>
                  <p className="mt-2 text-sm leading-6 text-[#fff7e7]/74">{order.rejectionReason}</p>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {canSubmit && (
                  <Link href={`/payment/${order.orderNumber}#payment-submission`} className="primary-cta group">
                    {order.paymentStatus === "rejected" ? "Resubmit payment details" : "Complete payment"} <span className="cta-icon"><ArrowRight size={17} weight="bold" /></span>
                  </Link>
                )}
                <Link href="/tickets" className="secondary-cta">View tickets</Link>
              </div>
            </div>
          </section>

          {order.paymentStatus === "verified" && (
            <section className="mt-7 rounded-[2rem] bg-[#086544] p-1.5 text-[#fff7e7]">
              <div className="rounded-[calc(2rem-0.375rem)] bg-[#086544] p-5 sm:p-8">
                <p className="text-xs font-extrabold tracking-[0.18em] text-[#eaa42c] uppercase">Payment verified</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-[0.9] font-extrabold uppercase sm:text-5xl">
                  {passesReady ? "Your Dreamers Pass is ready." : "Your Dreamers Pass is being prepared."}
                </h2>
                {passesReady ? (
                  <div className="mt-7">
                    <p className="mb-4 text-sm leading-6 text-[#fff7e7]/68">
                      {passes.length === 1 ? "Your pass has" : `Your ${passes.length} passes each have`} a unique QR credential. Keep every secure link private.
                    </p>
                    <IssuedPassList
                      passes={passes}
                      customerName={order.customerName}
                      venue={settings.venue}
                      eventDate={eventDate}
                      eventTime={eventTime}
                    />
                  </div>
                ) : (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#fff7e7]/68">
                    Your payment is safe and remains verified. The festival team can retry ticket preparation without asking you to pay again.
                  </p>
                )}
              </div>
            </section>
          )}

          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-6 text-[#17120f]/52">
            Your receipt and payment details remain private. Ticket credentials are created only for verified orders.
          </p>
        </div>
      </main>
      <SiteFooter supportWhatsapp={settings.supportWhatsapp} />
    </div>
  );
}
