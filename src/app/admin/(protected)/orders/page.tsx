import { MagnifyingGlass, Warning } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { AdminStatusBadge } from "@/components/admin-status-badge";
import { filterToPaymentStatus, normalizeSearchQuery, parseAdminOrderFilter, type AdminOrderFilter } from "@/lib/admin/review";
import { searchAdminOrders } from "@/lib/admin/data";
import { formatNaira } from "@/lib/format";

const TABS: Array<{ value: AdminOrderFilter; label: string }> = [
  { value: "submitted", label: "Pending review" }, { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" }, { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "cancelled", label: "Cancelled" }, { value: "all", label: "All" },
];

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(value));
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams;
  const filter = parseAdminOrderFilter(params.status);
  const query = normalizeSearchQuery(params.q);
  const orders = await searchAdminOrders(filterToPaymentStatus(filter), query);
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">Payment operations</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">Payment queue</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Payment status filters">{TABS.map((tab) => <Link key={tab.value} href={`/admin/orders?status=${tab.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className={`flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-xs font-extrabold uppercase ${filter === tab.value ? "border-[#17120f] bg-[#17120f] text-white" : "border-[#17120f]/12 bg-white hover:border-[#17120f]/30"}`}>{tab.label}</Link>)}</div>
      <form className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#17120f]/10 bg-white p-3 sm:flex-row" method="get">
        <input type="hidden" name="status" value={filter} />
        <label className="relative flex-1"><span className="sr-only">Search payment orders</span><MagnifyingGlass size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#17120f]/40" /><input name="q" defaultValue={query} maxLength={120} placeholder="Order, customer, phone, reference, sender or promoter" className="form-input" style={{ paddingLeft: "2.75rem" }} /></label>
        <button className="min-h-12 rounded-xl bg-[#17120f] px-6 text-sm font-extrabold text-white uppercase">Search</button>
      </form>
      <p className="mt-4 text-xs font-bold text-[#17120f]/48">{orders.length} result{orders.length === 1 ? "" : "s"} · newest activity first</p>

      {orders.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[#17120f]/20 bg-white p-10 text-center"><h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">No payments found</h2><p className="mt-2 text-sm text-[#17120f]/56">Try another status or search term.</p></div> : <>
        <div className="mt-4 grid gap-3 lg:hidden">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-[#17120f]/10 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/admin/orders/${order.orderNumber}`} className="font-extrabold text-[#086544] underline-offset-4 hover:underline">{order.orderNumber}</Link><p className="mt-1 text-sm font-bold">{order.customerName}</p><p className="text-xs text-[#17120f]/48">{order.phone}</p></div><AdminStatusBadge status={order.paymentStatus} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[#17120f]/45">Ticket</dt><dd className="font-bold">{order.ticketName} × {order.quantity}</dd></div><div><dt className="text-xs text-[#17120f]/45">Expected / submitted</dt><dd className="font-bold tabular-nums">{formatNaira(order.expectedAmount)} / {order.submittedAmount === null ? "—" : formatNaira(order.submittedAmount)}</dd></div><div><dt className="text-xs text-[#17120f]/45">Promoter</dt><dd className="font-bold">{order.promoterName ?? "Direct sale"}</dd></div><div><dt className="text-xs text-[#17120f]/45">Submitted</dt><dd className="font-bold">{shortDate(order.submittedAt)}</dd></div></dl>{(order.amountMismatch || order.potentialDuplicate) && <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs font-extrabold text-amber-900"><Warning size={17} /> Manual warning review required</p>}<Link href={`/admin/orders/${order.orderNumber}`} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#17120f] text-sm font-extrabold text-white uppercase">Open review</Link></article>)}</div>
        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[#17120f]/10 bg-white lg:block"><table className="w-full border-collapse text-left text-sm"><thead className="bg-[#17120f] text-[0.68rem] tracking-[0.08em] text-white uppercase"><tr>{["Order", "Customer", "Ticket", "Expected", "Submitted", "Promoter", "Status", "Submitted", "Action"].map((heading) => <th key={heading} className="px-4 py-3 font-extrabold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#17120f]/8">{orders.map((order) => <tr key={order.id} className="hover:bg-[#f9f5ec]"><td className="px-4 py-4 font-extrabold text-[#086544]">{order.orderNumber}{(order.amountMismatch || order.potentialDuplicate) && <Warning aria-label="Warning" className="ml-2 inline text-amber-700" size={17} />}</td><td className="px-4 py-4"><span className="font-bold">{order.customerName}</span><span className="block text-xs text-[#17120f]/45">{order.phone}</span></td><td className="px-4 py-4 font-bold">{order.ticketName} × {order.quantity}</td><td className="px-4 py-4 font-bold tabular-nums">{formatNaira(order.expectedAmount)}</td><td className="px-4 py-4 font-bold tabular-nums">{order.submittedAmount === null ? "—" : formatNaira(order.submittedAmount)}</td><td className="px-4 py-4">{order.promoterName ?? "Direct sale"}</td><td className="px-4 py-4"><AdminStatusBadge status={order.paymentStatus} /></td><td className="px-4 py-4 text-xs">{shortDate(order.submittedAt)}</td><td className="px-4 py-4"><Link href={`/admin/orders/${order.orderNumber}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#17120f]/15 px-3 font-extrabold uppercase hover:bg-[#17120f] hover:text-white">Review</Link></td></tr>)}</tbody></table></div>
      </>}
    </div>
  );
}
