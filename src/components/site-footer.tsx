import Link from "next/link";

import { FestivalMark } from "@/components/festival-mark";

export function SiteFooter({ supportWhatsapp }: { supportWhatsapp: string }) {
  const whatsappHref = `https://wa.me/${supportWhatsapp.replace(/\D/g, "")}`;

  return (
    <footer className="border-t border-[#17120f]/12 bg-[#efe2ca] px-4 py-10 text-[#17120f] sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#086544]"
          >
            <FestivalMark className="size-10 text-[#e84b16]" />
            <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[0.08em] uppercase">
              Dreamers Pass
            </span>
          </Link>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#17120f]/66">
            The official direct ticket path for The Dreamers Film Festival.
            Stories. Passion. Impact.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
          <Link className="footer-link" href="/tickets">
            Tickets
          </Link>
          <Link className="footer-link" href="/#event">
            Event info
          </Link>
          <Link className="footer-link" href="/#faq">
            FAQ
          </Link>
          <a className="footer-link" href={whatsappHref} rel="noreferrer">
            WhatsApp support
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-[1400px] flex-col gap-2 border-t border-[#17120f]/12 pt-6 text-xs font-bold tracking-[0.08em] text-[#17120f]/48 uppercase sm:flex-row sm:justify-between">
        <p>© 2026 The Dreamers Film Festival</p>
        <p>Ibadan, Oyo State</p>
      </div>
    </footer>
  );
}

