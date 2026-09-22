import { ArrowLeft, CalendarBlank, MapPin } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VenueExplorer } from "@/components/venue/venue-explorer";
import { getFestivalSettings } from "@/lib/festival/data";
import { formatFestivalDate, formatFestivalTime } from "@/lib/format";
import { getVenueCoordinates } from "@/lib/venue/config";

export const metadata: Metadata = {
  title: "Find the venue",
  description: "Explore the map, follow your location and find your way to The Dreamers Film Festival in Ibadan.",
};

export default async function VenuePage() {
  const settings = await getFestivalSettings();
  return (
    <div className="festival-page bg-[#17120f] text-[#fff7e7]">
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-[1400px] px-4 pt-9 pb-16 sm:px-6 lg:px-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#fff7e7]/65 hover:text-[#eaa42c] focus-visible:outline-2 focus-visible:outline-[#eaa42c]"><ArrowLeft size={17} />Back to the festival</Link>
        <div className="mt-7 mb-9 grid gap-6 md:grid-cols-[1fr_0.7fr] md:items-end">
          <div><p className="section-eyebrow text-[#eaa42c]">All roads lead to stories</p><h1 className="section-title venue-page-title text-[#fff7e7]">Find your way<br />to the festival.</h1></div>
          <div className="space-y-3 text-sm leading-6 text-[#fff7e7]/70">
            <p className="flex items-start gap-3"><CalendarBlank size={21} className="mt-0.5 shrink-0 text-[#eaa42c]" /><span>{formatFestivalDate(settings.eventDate)}<br />{formatFestivalTime(settings.eventTime, settings.eventEndTime)}</span></p>
            <p className="flex items-start gap-3"><MapPin size={21} className="mt-0.5 shrink-0 text-[#eaa42c]" /><span>{settings.venue}</span></p>
          </div>
        </div>
        <VenueExplorer venue={settings.venue} destination={getVenueCoordinates()} />
      </main>
      <SiteFooter supportWhatsapp={settings.supportWhatsapp} />
    </div>
  );
}
