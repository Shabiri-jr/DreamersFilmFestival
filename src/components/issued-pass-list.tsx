import { DownloadSimple, Eye, WhatsappLogo } from "@phosphor-icons/react/ssr";

import type { OrderPassLink } from "@/lib/tickets/data";
import { admissionLabel } from "@/lib/tickets/presentation";
import { buildTicketWhatsappMessage, buildWhatsappUrl } from "@/lib/tickets/whatsapp";

export function IssuedPassList({
  passes,
  customerName,
  targetPhone,
  venue,
  eventDate,
  eventTime,
}: {
  passes: OrderPassLink[];
  customerName: string;
  targetPhone?: string;
  venue: string;
  eventDate: string;
  eventTime: string;
}) {
  return (
    <div className="grid gap-4">
      {passes.map((pass) => {
        const message = buildTicketWhatsappMessage({
          customerName,
          ticketTypeName: pass.ticketTypeName,
          ticketCode: pass.ticketCode,
          admissionCount: pass.admissionCount,
          passUrl: pass.passUrl,
          venue,
          eventDate,
          eventTime,
        });
        return (
          <article key={pass.id} className="rounded-[1.5rem] bg-[#fff7e7] p-1.5 text-[#17120f] ring-1 ring-[#17120f]/8">
            <div className="rounded-[calc(1.5rem-0.375rem)] bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">
                    Pass {pass.unitIndex} of {passes.length}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
                    {pass.ticketTypeName} Pass
                  </h3>
                  <p className="mt-2 text-sm font-bold text-[#17120f]/60">
                    {admissionLabel(pass.admissionCount, pass.ticketTypeName)} · {pass.ticketCode}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-2 text-[0.65rem] font-extrabold tracking-[0.12em] uppercase ${pass.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {pass.status === "cancelled" ? "Cancelled" : "Valid"}
                </span>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <a href={pass.passUrl} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#17120f] px-4 text-xs font-extrabold text-white uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]">
                  <Eye size={18} /> View pass
                </a>
                <a href={pass.downloadUrl} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f3ead8] px-4 text-xs font-extrabold uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]">
                  <DownloadSimple size={18} /> Download PNG
                </a>
                <a href={buildWhatsappUrl(message, targetPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#086544] px-4 text-xs font-extrabold text-white uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]">
                  <WhatsappLogo size={18} /> WhatsApp
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
