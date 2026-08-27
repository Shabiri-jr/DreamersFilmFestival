import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { searchAdminTickets } from "@/lib/admin/data";
import { admissionLabel } from "@/lib/tickets/presentation";

function issuedTime(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const tickets = await searchAdminTickets(q);
  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">Credential operations</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">Tickets</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#17120f]/58">Search issued credentials without exposing public-access or QR secrets.</p>
        </div>
        <form className="flex w-full max-w-xl gap-2" role="search">
          <label className="sr-only" htmlFor="ticket-search">Search tickets</label>
          <input id="ticket-search" name="q" defaultValue={q} maxLength={120} className="form-input" placeholder="Ticket, order, customer, WhatsApp, category" />
          <button aria-label="Search tickets" className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#17120f] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]"><MagnifyingGlass size={20} /></button>
        </form>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-[#17120f]/20 bg-white p-10 text-center text-sm text-[#17120f]/55">No issued tickets match this search.</div>
      ) : (
        <div className="mt-7 overflow-hidden rounded-2xl bg-white ring-1 ring-[#17120f]/10">
          <div className="grid gap-3 p-3 lg:hidden">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.ticketCode}`} className="rounded-xl bg-[#f5f1e8] p-4 focus-visible:outline-2 focus-visible:outline-[#086544]">
                <div className="flex justify-between gap-3"><span className="font-mono text-sm font-extrabold">{ticket.ticketCode}</span><span className="text-xs font-extrabold uppercase">{ticket.status}</span></div>
                <p className="mt-2 font-extrabold">{ticket.customerName}</p>
                <p className="mt-1 text-xs text-[#17120f]/50">{ticket.ticketTypeName} · {admissionLabel(ticket.admissionCount, ticket.ticketTypeName)} · {ticket.orderNumber}</p>
              </Link>
            ))}
          </div>
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="bg-[#17120f] text-xs tracking-[0.08em] text-white uppercase"><tr>{["Ticket", "Customer", "Type", "Admission", "Order", "Status", "Issued"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#17120f]/8">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-4 py-4"><Link href={`/admin/tickets/${ticket.ticketCode}`} className="font-mono font-extrabold text-[#086544] hover:underline">{ticket.ticketCode}</Link></td>
                  <td className="px-4 py-4"><span className="font-bold">{ticket.customerName}</span><span className="block text-xs text-[#17120f]/45">{ticket.phone}</span></td>
                  <td className="px-4 py-4 font-bold">{ticket.ticketTypeName}</td>
                  <td className="px-4 py-4">{admissionLabel(ticket.admissionCount, ticket.ticketTypeName)}</td>
                  <td className="px-4 py-4 font-mono text-xs">{ticket.orderNumber}</td>
                  <td className="px-4 py-4 font-extrabold uppercase">{ticket.status}</td>
                  <td className="px-4 py-4 text-xs">{issuedTime(ticket.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
