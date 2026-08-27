import { Ticket } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TicketSelectorCard } from "@/components/ticket-selector-card";
import { getActiveTicketTypes, getFestivalSettings } from "@/lib/festival/data";

export const metadata: Metadata = {
  title: "Festival Tickets",
  description: "Choose your ticket for The Dreamers Film Festival.",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[]; referral?: string }>;
}) {
  const params = await searchParams;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  if (referralCode) {
    redirect(
      `/api/referrals/capture?code=${encodeURIComponent(referralCode)}&returnTo=${encodeURIComponent("/tickets")}`,
    );
  }

  const [settings, tickets] = await Promise.all([
    getFestivalSettings(),
    getActiveTicketTypes(),
  ]);

  return (
    <div className="festival-page min-h-[100dvh] bg-[#f3ead8] text-[#17120f]">
      <SiteHeader />
      <main id="main-content">
        <section className="px-4 pt-16 pb-12 sm:px-6 md:pt-24 md:pb-16 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-7 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <p className="section-eyebrow">Step 01 / Choose a pass</p>
              <h1 className="mt-3 max-w-[10ch] font-[family-name:var(--font-display)] text-[clamp(4rem,10vw,7.5rem)] leading-[0.82] font-extrabold tracking-[-0.04em] uppercase">
                Grab your tickets.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-[#17120f]/64 md:justify-self-end">
              Select one ticket category and choose how many units you need. Group and couple passes clearly show how many people they admit.
            </p>
          </div>
        </section>

        {params.referral === "unavailable" && (
          <p className="mx-auto mb-6 max-w-[1400px] px-4 text-sm font-bold text-[#a91f14] sm:px-6 lg:px-10">
            We could not confirm that referral link. You can still purchase without it.
          </p>
        )}

        {!settings.salesEnabled && (
          <section className="mx-4 mb-10 border-y border-[#17120f]/18 bg-[#17120f] px-5 py-9 text-[#fff7e7] sm:mx-6 sm:px-8 lg:mx-10">
            <div className="mx-auto max-w-[1400px]">
              <p className="text-xs font-extrabold tracking-[0.18em] text-[#eaa42c] uppercase">Sales update</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">
                Ticket sales are currently closed
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f3ead8]/64">
                You can review the ticket categories, but checkout is unavailable until festival sales reopen.
              </p>
            </div>
          </section>
        )}

        <section className="px-4 pb-20 sm:px-6 md:pb-28 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            {tickets.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 md:gap-7">
                {tickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className={
                      index === tickets.length - 1 && tickets.length % 2 === 1
                        ? "md:col-span-2 md:mx-auto md:w-1/2"
                        : ""
                    }
                  >
                    <TicketSelectorCard ticket={ticket} salesEnabled={settings.salesEnabled} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-[#17120f]/12 bg-[#fff7e7] px-5 py-16 text-center">
                <Ticket size={46} weight="light" className="mx-auto text-[#e84b16]" />
                <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">
                  No active tickets yet
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#17120f]/60">
                  The festival team is preparing the ticket catalogue. Please check again shortly.
                </p>
                <Link href="/" className="secondary-cta mt-6 border-[#17120f]/18 text-[#17120f]">
                  Back to festival
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter supportWhatsapp={settings.supportWhatsapp} />
    </div>
  );
}
