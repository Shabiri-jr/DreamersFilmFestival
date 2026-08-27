import {
  ArrowUpRight,
  CalendarBlank,
  FilmSlate,
  MapPin,
  Ticket,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TicketPreviewCard } from "@/components/ticket-preview-card";
import { getActiveTicketTypes, getFestivalSettings } from "@/lib/festival/data";
import { formatFestivalDate, formatFestivalTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "The Dreamers Film Festival",
  description:
    "Get tickets for The Dreamers Film Festival in Ibadan on 26 September 2026.",
};

const faqItems = [
  {
    question: "When will I receive my ticket?",
    answer:
      "Tickets are issued only after your bank transfer has been submitted and verified. Creating an order or making a transfer does not issue a ticket automatically.",
  },
  {
    question: "Does one Network pass admit five people?",
    answer:
      "Yes. One Network ticket product admits a group of five. Every attendee will receive an independent entry credential after payment verification.",
  },
  {
    question: "Can I buy more than one ticket?",
    answer:
      "Yes. Choose the quantity for one ticket category in each order. The current system intentionally keeps one category per order.",
  },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[]; referral?: string }>;
}) {
  const params = await searchParams;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  if (referralCode) {
    redirect(
      `/api/referrals/capture?code=${encodeURIComponent(referralCode)}&returnTo=${encodeURIComponent("/")}`,
    );
  }

  const [settings, tickets] = await Promise.all([
    getFestivalSettings(),
    getActiveTicketTypes(),
  ]);

  return (
    <div className="festival-page bg-[#17120f] text-[#fff7e7]">
      <SiteHeader />
      <main id="main-content">
        {params.referral === "unavailable" && (
          <p className="mx-auto mt-4 max-w-[1400px] px-4 text-sm font-bold text-[#eaa42c] sm:px-6">
            We could not confirm that referral link. You can still choose a ticket normally.
          </p>
        )}

        <section className="relative mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1400px] items-center gap-10 overflow-hidden px-4 py-12 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:py-16 lg:px-10">
          <div className="relative z-10 max-w-3xl reveal reveal-one">
            <p className="inline-flex items-center gap-3 text-xs font-extrabold tracking-[0.22em] text-[#eaa42c] uppercase">
              <span className="h-px w-9 bg-[#086544]" aria-hidden="true" />
              Stories. Passion. Impact.
            </p>
            <h1 className="mt-5 max-w-[10ch] font-[family-name:var(--font-display)] text-[clamp(4.25rem,12vw,9rem)] leading-[0.78] font-extrabold tracking-[-0.045em] text-[#fff7e7] uppercase">
              The Dreamers <span className="text-[#e84b16]">Film Festival</span>
            </h1>
            <div className="mt-7 grid max-w-2xl gap-3 text-sm font-bold text-[#f3ead8]/72 sm:grid-cols-2">
              <p className="flex min-h-11 items-center gap-3 border-t border-white/14 pt-3">
                <CalendarBlank size={21} weight="bold" className="text-[#eaa42c]" />
                {formatFestivalDate(settings.eventDate)} · {formatFestivalTime(settings.eventTime, settings.eventEndTime)}
              </p>
              <p className="flex min-h-11 items-center gap-3 border-t border-white/14 pt-3">
                <MapPin size={21} weight="bold" className="text-[#eaa42c]" />
                The Dreamers Hub, Ibadan
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/tickets" className="primary-cta group">
                Grab your ticket
                <span className="cta-icon">
                  <ArrowUpRight size={19} weight="bold" />
                </span>
              </Link>
              <Link href="#tickets" className="secondary-cta">
                View tickets
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-[32rem] reveal reveal-three md:justify-self-end">
            <div className="absolute inset-3 rotate-3 bg-[#086544]" aria-hidden="true" />
            <div className="absolute inset-0 -rotate-1 overflow-hidden border border-white/20 bg-[#9d2a0d] p-2 shadow-[0_2.5rem_7rem_rgba(79,22,13,0.38)]">
              <div className="relative h-full overflow-hidden bg-[#17120f]">
                <Image
                  src="/brand/dreamers-festival-poster.jpeg"
                  alt="The Dreamers Film Festival artwork with a film reel, camera, and cinema skyline"
                  fill
                  priority
                  sizes="(max-width: 767px) 92vw, 42vw"
                  className="scale-[1.08] object-cover object-[center_38%]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(23,18,15,0.5),transparent_38%)]" aria-hidden="true" />
              </div>
            </div>
            <div className="film-perforation absolute top-8 -right-3 bottom-8 w-7" aria-hidden="true" />
          </div>
        </section>

        <section id="tickets" className="bg-[#f3ead8] px-4 py-20 text-[#17120f] sm:px-6 md:py-28 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-6 border-b border-[#17120f]/15 pb-9 md:grid-cols-[1fr_0.75fr] md:items-end">
              <div>
                <p className="section-eyebrow">Choose your pass</p>
                <h2 className="section-title">One festival. Five ways in.</h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#17120f]/62 md:justify-self-end">
                Pick the ticket that fits how you want to experience the day. Prices and availability come directly from the festival catalogue.
              </p>
            </div>

            {tickets.length > 0 ? (
              <div className="mt-3">
                {tickets.map((ticket) => (
                  <TicketPreviewCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Ticket size={42} weight="light" className="mx-auto text-[#e84b16]" />
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
                  Tickets are being prepared
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#17120f]/60">
                  No active ticket categories are available right now. Please check again soon.
                </p>
              </div>
            )}

            <div className="mt-9 flex justify-start">
              <Link href="/tickets" className="dark-cta group">
                See ticket details
                <span className="cta-icon bg-white/10">
                  <ArrowUpRight size={18} weight="bold" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#e84b16] px-4 py-20 sm:px-6 md:py-28 lg:px-10">
          <div className="motif-panel absolute inset-y-0 right-0 w-1/2 opacity-20" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <div>
              <p className="section-eyebrow text-[#17120f]">More than a screening</p>
              <h2 className="section-title max-w-[9ch] text-[#17120f]">A day built around stories that move people.</h2>
            </div>
            <div className="grid gap-px bg-[#17120f]/20 sm:grid-cols-3">
              {[
                { icon: FilmSlate, title: "Stories", copy: "Independent voices and cinema with something real to say." },
                { icon: UsersThree, title: "People", copy: "A shared room for audiences, makers, and future collaborators." },
                { icon: Ticket, title: "Access", copy: "A direct ticket path designed for mobile and WhatsApp customers." },
              ].map((item) => (
                <article key={item.title} className="bg-[#e84b16] p-6 sm:min-h-60">
                  <item.icon size={30} weight="light" className="text-[#17120f]" />
                  <h3 className="mt-12 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#17120f] uppercase">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#17120f]/68">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="event" className="bg-[#17120f] px-4 py-20 sm:px-6 md:py-28 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="section-eyebrow text-[#eaa42c]">Save the date</p>
              <h2 className="section-title text-[#fff7e7]">Festival day, clearly mapped.</h2>
            </div>
            <dl className="border-t border-white/14">
              {[
                ["Date", formatFestivalDate(settings.eventDate)],
                ["Time", formatFestivalTime(settings.eventTime, settings.eventEndTime)],
                ["Venue", settings.venue],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-2 border-b border-white/14 py-6 sm:grid-cols-[8rem_1fr]">
                  <dt className="text-xs font-extrabold tracking-[0.16em] text-[#eaa42c] uppercase">{label}</dt>
                  <dd className="m-0 text-base leading-7 text-[#f3ead8]/78">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-[#086544] px-4 py-16 text-[#fff7e7] sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] text-[#eaa42c] uppercase">
                {formatFestivalDate(settings.eventDate)}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase sm:text-5xl">
                Your seat starts here.
              </h2>
            </div>
            {settings.salesEnabled ? (
              <Link href="/tickets" className="cream-cta group">
                Get your ticket
                <span className="cta-icon bg-[#17120f]/8">
                  <ArrowUpRight size={18} weight="bold" />
                </span>
              </Link>
            ) : (
              <p className="font-extrabold text-[#eaa42c] uppercase">Ticket sales are currently closed</p>
            )}
          </div>
        </section>

        <section id="faq" className="bg-[#fff7e7] px-4 py-20 text-[#17120f] sm:px-6 md:py-28 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-[0.65fr_1.35fr]">
            <div>
              <p className="section-eyebrow">Good to know</p>
              <h2 className="section-title">Before you buy.</h2>
            </div>
            <div className="border-t border-[#17120f]/14">
              {faqItems.map((item) => (
                <details key={item.question} className="group border-b border-[#17120f]/14 py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 font-extrabold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#086544]">
                    {item.question}
                    <span className="text-2xl font-light transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-2xl pt-3 text-sm leading-7 text-[#17120f]/62">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter supportWhatsapp={settings.supportWhatsapp} />
    </div>
  );
}
