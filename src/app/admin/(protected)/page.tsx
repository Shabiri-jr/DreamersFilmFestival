import { ArrowRight, CurrencyNgn, Receipt, SealCheck, Ticket, TrendUp, WarningCircle, Wallet } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { getAdminDashboardMetrics } from "@/lib/admin/data";
import { formatNaira } from "@/lib/format";

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();
  const cards = [
    { label: "Payments awaiting review", value: String(metrics.pendingCount), icon: Receipt, accent: true },
    { label: "Pending payment value", value: formatNaira(metrics.pendingValue), icon: Wallet },
    { label: "Verified payments", value: String(metrics.verifiedCount), icon: SealCheck },
    { label: "Rejected payments", value: String(metrics.rejectedCount), icon: WarningCircle },
    { label: "Verified revenue", value: formatNaira(metrics.verifiedRevenue), icon: TrendUp },
    { label: "Verified pass units", value: String(metrics.verifiedUnits), icon: Ticket },
    { label: "Commission earned", value: formatNaira(metrics.commissionEarned), icon: CurrencyNgn },
    { label: "Commission outstanding", value: formatNaira(metrics.commissionOutstanding), icon: Wallet },
  ];
  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">Operations overview</p><h1 className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">Payment desk</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#17120f]/58">Review bank-transfer evidence and activate promoter commission only after human confirmation.</p></div>
        <Link href="/admin/orders?status=submitted" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#e84b16] px-5 text-sm font-extrabold text-white uppercase focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#e84b16]">Review pending payments <ArrowRight size={18} weight="bold" /></Link>
      </div>
      <section aria-label="Payment metrics" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent }) => <article key={label} className={`rounded-2xl border p-5 ${accent ? "border-[#e84b16]/40 bg-[#fff0e8]" : "border-[#17120f]/10 bg-white"}`}><div className="flex items-center justify-between"><p className="text-[0.68rem] font-extrabold tracking-[0.1em] text-[#17120f]/52 uppercase">{label}</p><Icon size={20} className={accent ? "text-[#e84b16]" : "text-[#086544]"} /></div><p className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold tabular-nums">{value}</p></article>)}
      </section>
      <aside className="mt-6 rounded-2xl border border-[#17120f]/10 bg-white p-5 text-sm leading-6 text-[#17120f]/60"><strong className="text-[#17120f]">Phase 4 boundary:</strong> verified pass units are paid product units. Digital tickets and QR codes have not been issued yet.</aside>
    </div>
  );
}
