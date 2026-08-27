import { ArrowSquareOut, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSuperAdmin } from "@/lib/admin/auth";
import { getCheckInHistory, getGateDashboard } from "@/lib/check-in/data";

export const metadata: Metadata = { title: "Check-in History" };

function safeDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export default async function CheckInHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const from = safeDate(params.from);
  const to = safeDate(params.to);
  const [history, dashboard] = await Promise.all([
    getCheckInHistory({ query, from, to }),
    getGateDashboard(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold tracking-[0.15em] text-[#e84b16] uppercase">Festival operations</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none font-extrabold uppercase">Check-in history</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#17120f]/58">A permanent record of successful gate redemptions. Payment admins and gate staff cannot view this finance-adjacent operational report.</p>
        </div>
        <Link href="/check-in" className="flex min-h-12 items-center gap-2 rounded-xl bg-[#086544] px-5 text-sm font-extrabold text-white uppercase"><ArrowSquareOut size={19} /> Open gate scanner</Link>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-[#17120f] p-5 text-white"><p className="text-3xl font-extrabold">{dashboard.passesCheckedIn}</p><p className="mt-1 text-xs font-bold text-white/55">Passes checked in</p></div>
        <div className="rounded-2xl bg-[#086544] p-5 text-white"><p className="text-3xl font-extrabold">{dashboard.peopleAdmitted}</p><p className="mt-1 text-xs font-bold text-white/60">People admitted</p></div>
        <div className="rounded-2xl border border-[#17120f]/10 bg-white p-5"><p className="text-3xl font-extrabold">{dashboard.passesRemaining}</p><p className="mt-1 text-xs font-bold text-[#17120f]/50">Passes remaining</p></div>
        <div className="rounded-2xl border border-[#17120f]/10 bg-white p-5"><p className="text-3xl font-extrabold">{dashboard.checkInPercentage}%</p><p className="mt-1 text-xs font-bold text-[#17120f]/50">Pass redemption</p></div>
      </section>

      <form className="mt-6 grid gap-3 rounded-2xl border border-[#17120f]/10 bg-white p-4 md:grid-cols-[minmax(12rem,1fr)_auto_auto_auto]">
        <label className="min-w-0"><span className="sr-only">Search check-ins</span><input name="q" defaultValue={query} minLength={2} maxLength={120} placeholder="Ticket, holder, type, or staff" className="form-input" /></label>
        <label><span className="sr-only">From date</span><input name="from" type="date" defaultValue={from} className="form-input" /></label>
        <label><span className="sr-only">To date</span><input name="to" type="date" defaultValue={to} className="form-input" /></label>
        <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#17120f] px-5 text-sm font-extrabold text-white uppercase"><MagnifyingGlass size={18} /> Filter</button>
      </form>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#17120f]/10 bg-white">
        <div className="border-b border-[#17120f]/8 px-5 py-4"><p className="text-sm font-extrabold">{history.length} recorded check-in{history.length === 1 ? "" : "s"}</p></div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#17120f]/50">No successful check-ins match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="bg-[#f3ead8] text-[0.68rem] tracking-[0.1em] text-[#17120f]/55 uppercase"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Ticket</th><th className="px-5 py-3">Holder</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">People</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Staff</th></tr></thead>
              <tbody className="divide-y divide-[#17120f]/8">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-[#17120f]/58">{formatTimestamp(item.checkedInAt)}</td>
                    <td className="px-5 py-4 font-mono font-extrabold">{item.ticketCode}</td>
                    <td className="px-5 py-4 font-bold">{item.holderName}</td>
                    <td className="px-5 py-4">{item.ticketTypeName}</td>
                    <td className="px-5 py-4 font-extrabold">{item.admissionCount}</td>
                    <td className="px-5 py-4 uppercase">{item.source}</td>
                    <td className="px-5 py-4">{item.staffName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
