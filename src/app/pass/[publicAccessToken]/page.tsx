import { DownloadSimple, WhatsappLogo } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DigitalPassCard } from "@/components/digital-pass";
import { createPassQrDataUrl, getDigitalPass } from "@/lib/tickets/data";
import { buildTicketWhatsappMessage, buildWhatsappUrl } from "@/lib/tickets/whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Digital Dreamers Pass",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicPassPage({
  params,
}: {
  params: Promise<{ publicAccessToken: string }>;
}) {
  const { publicAccessToken } = await params;
  const pass = await getDigitalPass(publicAccessToken);
  if (!pass) notFound();
  const qrDataUrl = await createPassQrDataUrl(pass);
  const message = buildTicketWhatsappMessage({
    customerName: pass.holderName,
    ticketTypeName: pass.ticketTypeName,
    ticketCode: pass.ticketCode,
    admissionCount: pass.admissionCount,
    passUrl: pass.passUrl,
    venue: pass.venue,
    eventDate: pass.eventDate,
    eventTime: pass.eventTime,
  });

  return (
    <main id="main-content" className="festival-page min-h-[100dvh] bg-[#0f0d0b] px-2 py-8 text-[#fff7e7] sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-eyebrow">Your digital credential</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase sm:text-5xl">
              Dreamers Pass
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#fff7e7]/56">
            Keep this secure link private. Festival staff will scan the QR at the entrance during check-in.
          </p>
        </div>

        <DigitalPassCard pass={pass} qrDataUrl={qrDataUrl} />

        <div className="mx-auto mt-7 grid w-full max-w-[34rem] gap-3 sm:grid-cols-2">
          <a href={pass.downloadUrl} className="cream-cta group" download>
            Download PNG <span className="cta-icon"><DownloadSimple size={18} weight="bold" /></span>
          </a>
          <a
            href={buildWhatsappUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-cta group"
          >
            Share via WhatsApp <span className="cta-icon"><WhatsappLogo size={18} weight="bold" /></span>
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-[34rem] text-center text-xs leading-5 text-[#fff7e7]/46">
          WhatsApp opens with a prepared message and secure link. Downloaded images must be attached separately.
        </p>
      </div>
    </main>
  );
}
