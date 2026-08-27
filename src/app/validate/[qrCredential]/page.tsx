import { CheckCircle, Prohibit } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FestivalMark } from "@/components/festival-mark";
import { admissionLabel } from "@/lib/tickets/presentation";
import { getPublicValidation } from "@/lib/tickets/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Ticket Credential",
  robots: { index: false, follow: false, nocache: true },
};

export default async function QrValidationPage({
  params,
}: {
  params: Promise<{ qrCredential: string }>;
}) {
  const { qrCredential } = await params;
  const ticket = await getPublicValidation(qrCredential);
  if (!ticket) notFound();
  const valid = ticket.status === "valid";
  const checkedIn = ticket.status === "checked_in";
  return (
    <main id="main-content" className="festival-page grid min-h-[100dvh] place-items-center bg-[#17120f] px-4 py-10 text-[#fff7e7]">
      <section className="w-full max-w-xl rounded-[2rem] bg-[#fff7e7]/6 p-1.5 ring-1 ring-[#fff7e7]/12">
        <div className="rounded-[calc(2rem-0.375rem)] bg-[#17120f] p-7 sm:p-10">
          <FestivalMark className="size-12 text-[#eaa42c]" />
          <div className={`mt-10 ${valid ? "text-[#6ed3a7]" : "text-[#ff8b6b]"}`}>
            {valid ? <CheckCircle size={50} weight="fill" /> : <Prohibit size={50} weight="fill" />}
          </div>
          <p className="mt-6 text-xs font-extrabold tracking-[0.2em] text-[#eaa42c] uppercase">Dreamers Pass</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
            {valid ? "Ticket credential recognized." : checkedIn ? "Ticket already checked in." : "Ticket cancelled."}
          </h1>
          <dl className="mt-8 divide-y divide-[#fff7e7]/10 border-y border-[#fff7e7]/10 text-sm">
            <div className="flex justify-between gap-5 py-4"><dt className="text-[#fff7e7]/50">Ticket</dt><dd className="font-extrabold">{ticket.ticketTypeName}</dd></div>
            <div className="flex justify-between gap-5 py-4"><dt className="text-[#fff7e7]/50">Admission</dt><dd className="font-extrabold">{admissionLabel(ticket.admissionCount, ticket.ticketTypeName)}</dd></div>
            <div className="flex justify-between gap-5 py-4"><dt className="text-[#fff7e7]/50">Status</dt><dd className="font-extrabold uppercase">{ticket.status}</dd></div>
          </dl>
          <p className="mt-7 text-sm leading-7 text-[#fff7e7]/58">
            {valid ? "Present this QR to authenticated festival staff for check-in. Opening this page does not check the ticket in." : checkedIn ? "This credential has already been redeemed at the festival gate." : "This credential is not valid for entry."}
          </p>
        </div>
      </section>
    </main>
  );
}
