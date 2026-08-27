import { randomUUID } from "node:crypto";
import { ArrowLeft, Ticket } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout-form";
import type { AppliedReferral } from "@/components/referral-code-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveTicketBySlug, getFestivalSettings } from "@/lib/festival/data";
import { readReferralAttributionCookie } from "@/lib/referrals/cookies";
import { inspectReferralCode } from "@/lib/referrals/server";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Create your Dreamers Film Festival ticket order.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; quantity?: string }>;
}) {
  const params = await searchParams;
  if (!params.ticket) redirect("/tickets");

  const [settings, ticket] = await Promise.all([
    getFestivalSettings(),
    getActiveTicketBySlug(params.ticket),
  ]);

  if (!ticket) {
    return (
      <UnavailableCheckout
        supportWhatsapp={settings.supportWhatsapp}
        title="This ticket is no longer available"
        detail="Return to the ticket list and choose an available festival pass."
      />
    );
  }

  if (!settings.salesEnabled) {
    return (
      <UnavailableCheckout
        supportWhatsapp={settings.supportWhatsapp}
        title="Ticket sales are currently closed"
        detail="Checkout is paused. Your browser has not created an order."
      />
    );
  }

  if (ticket.quantityAvailable === 0) {
    return (
      <UnavailableCheckout
        supportWhatsapp={settings.supportWhatsapp}
        title="This ticket is sold out"
        detail="Return to the ticket list to see the remaining festival passes."
      />
    );
  }

  const finiteLimits = [ticket.maximumPerOrder, ticket.quantityAvailable].filter(
    (value): value is number => value !== null,
  );
  const maximum = finiteLimits.length > 0 ? Math.min(...finiteLimits) : null;
  const requestedQuantity = Number(params.quantity ?? "1");
  const initialQuantity = Number.isSafeInteger(requestedQuantity)
    ? Math.max(
        1,
        maximum === null
          ? requestedQuantity
          : Math.min(requestedQuantity, maximum),
      )
    : 1;

  let appliedReferral: AppliedReferral | null = null;
  const storedAttribution = await readReferralAttributionCookie();
  if (storedAttribution) {
    const referral = await inspectReferralCode(
      storedAttribution.referralCode,
      storedAttribution.source,
    );
    if (
      referral.status === "active" &&
      referral.attribution.promoterId === storedAttribution.promoterId
    ) {
      appliedReferral = {
        code: storedAttribution.referralCode,
        promoterName: referral.promoterName,
      };
    }
  }

  return (
    <div className="festival-page min-h-[100dvh] bg-[#f3ead8] text-[#17120f]">
      <SiteHeader />
      <main id="main-content" className="px-4 py-10 sm:px-6 md:py-16 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <Link
            href="/tickets"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-extrabold text-[#17120f]/62 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#086544]"
          >
            <ArrowLeft size={18} weight="bold" />
            Back to tickets
          </Link>
          <div className="mt-6">
            <CheckoutForm
              ticket={ticket}
              initialQuantity={initialQuantity}
              idempotencyKey={randomUUID()}
              appliedReferral={appliedReferral}
            />
          </div>
        </div>
      </main>
      <SiteFooter supportWhatsapp={settings.supportWhatsapp} />
    </div>
  );
}

function UnavailableCheckout({
  supportWhatsapp,
  title,
  detail,
}: {
  supportWhatsapp: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="festival-page min-h-[100dvh] bg-[#f3ead8] text-[#17120f]">
      <SiteHeader />
      <main id="main-content" className="grid min-h-[65dvh] place-items-center px-4 py-16">
        <div className="max-w-xl text-center">
          <Ticket size={48} weight="light" className="mx-auto text-[#e84b16]" />
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-none font-extrabold uppercase">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#17120f]/62">{detail}</p>
          <Link href="/tickets" className="dark-cta mt-7">
            View available tickets
          </Link>
        </div>
      </main>
      <SiteFooter supportWhatsapp={supportWhatsapp} />
    </div>
  );
}

