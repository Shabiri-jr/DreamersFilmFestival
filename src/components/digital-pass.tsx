import Image from "next/image";

import type { DigitalPass } from "@/lib/tickets/data";
import { admissionLabel } from "@/lib/tickets/presentation";

export function DigitalPassCard({
  pass,
  qrDataUrl,
}: {
  pass: DigitalPass;
  qrDataUrl: string;
}) {
  const cancelled = pass.status === "cancelled";
  const checkedIn = pass.status === "checked_in";
  return (
    <article
      aria-label={`${pass.ticketTypeName} Dreamers Pass ${pass.ticketCode}`}
      className="pass-shell mx-auto w-full max-w-[34rem]"
    >
      <div className="pass-core">
        <header className="pass-header">
          <div className="pass-motif" aria-hidden="true" />
          <p className="relative text-[0.64rem] font-extrabold tracking-[0.24em] text-[#fff7e7]/76 uppercase">
            The Dreamers Film Festival
          </p>
          <h1 className="relative mt-5 font-[family-name:var(--font-display)] text-[clamp(4.1rem,20vw,7rem)] leading-[0.72] font-extrabold tracking-[-0.045em] text-[#fff7e7] uppercase">
            Dreamers
            <span className="mt-3 block tracking-[0.03em] text-[#17120f]">Pass</span>
          </h1>
          <div className="relative mt-8 flex items-center justify-between gap-4 border-t border-[#fff7e7]/20 pt-4">
            <span className="text-sm font-extrabold tracking-[0.16em] text-[#fff7e7] uppercase">
              {pass.ticketTypeName}
            </span>
            <span className="rounded-full bg-[#17120f] px-4 py-2 text-[0.65rem] font-extrabold tracking-[0.12em] text-[#fff7e7] uppercase">
              {admissionLabel(pass.admissionCount, pass.ticketTypeName)}
            </span>
          </div>
        </header>

        <section className="bg-[#fff7e7] px-3 py-6 text-[#17120f] sm:px-8 sm:py-8">
          <div className="mx-auto max-w-[25rem] rounded-[1.5rem] bg-[#f3ead8] p-2 ring-1 ring-[#17120f]/8 sm:p-3">
            <Image
              unoptimized
              src={qrDataUrl}
              width={760}
              height={760}
              priority
              alt={`QR credential for ticket ${pass.ticketCode}`}
              className="aspect-square h-auto w-full rounded-[1rem] bg-[#fff7e7]"
            />
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-[#17120f]/58">
            Present this QR to festival staff. It does not check itself in when opened.
          </p>
          <p className="mt-4 text-center font-mono text-lg font-extrabold tracking-[0.06em] break-all sm:text-xl">
            {pass.ticketCode}
          </p>
        </section>

        <section className="grid gap-px bg-[#fff7e7]/12 text-[#fff7e7] sm:grid-cols-2">
          <div className="bg-[#17120f] p-5">
            <p className="pass-label">Holder</p>
            <p className="mt-2 text-base font-extrabold">{pass.holderName}</p>
          </div>
          <div className="bg-[#17120f] p-5">
            <p className="pass-label">Status</p>
            <p className={`mt-2 text-base font-extrabold uppercase ${cancelled ? "text-[#ff8b6b]" : "text-[#6ed3a7]"}`}>
              {cancelled ? "Ticket cancelled" : checkedIn ? "Checked in" : "Valid"}
            </p>
          </div>
          <div className="bg-[#17120f] p-5">
            <p className="pass-label">Date & time</p>
            <p className="mt-2 text-sm font-bold">{pass.eventDate}</p>
            <p className="mt-1 text-sm text-[#fff7e7]/62">{pass.eventTime}</p>
          </div>
          <div className="bg-[#17120f] p-5">
            <p className="pass-label">Venue</p>
            <p className="mt-2 text-sm leading-6 font-bold">{pass.venue}</p>
          </div>
        </section>

        <footer className="flex items-center justify-between gap-5 bg-[#086544] px-5 py-5 text-[#fff7e7] sm:px-8">
          <p className="text-[0.64rem] font-extrabold tracking-[0.2em] uppercase">Stories. Passion. Impact.</p>
          <span aria-hidden="true" className="block h-px min-w-12 flex-1 bg-[#fff7e7]/32" />
          <p className="text-[0.64rem] font-extrabold tracking-[0.14em] uppercase">Pass {pass.unitIndex}</p>
        </footer>
      </div>
    </article>
  );
}
