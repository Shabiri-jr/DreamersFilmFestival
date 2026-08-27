import { ChartBar, IdentificationCard, Scan, SignOut, Ticket, UsersThree } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { logoutAdmin } from "@/lib/admin/actions";
import { requireFinanceAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireFinanceAdmin();
  return (
    <div className="min-h-[100dvh] bg-[#f5f1e8] text-[#17120f]">
      <header className="border-b border-[#17120f]/10 bg-[#17120f] text-white">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#eaa42c]">
            <span className="block font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[0.08em] uppercase">Dreamers Pass</span>
            <span className="block text-[0.62rem] font-bold tracking-[0.18em] text-[#eaa42c] uppercase">Festival operations</span>
          </Link>
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block"><p className="text-sm font-bold">{admin.name}</p><p className="text-[0.65rem] tracking-[0.08em] text-white/50 uppercase">{admin.role.replace("_", " ")}</p></div>
            <form action={logoutAdmin}><button aria-label="Sign out" title="Sign out" className="grid size-11 place-items-center rounded-xl border border-white/15 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]"><SignOut size={19} /></button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full min-w-0 max-w-[90rem] lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Admin navigation" className="min-w-0 max-w-full overflow-hidden border-b border-[#17120f]/10 bg-white px-4 py-3 lg:min-h-[calc(100dvh-73px)] lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <Link href="/admin" className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-[#086544]"><ChartBar size={19} /> Dashboard</Link>
            <Link href="/admin/orders" className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-[#086544]"><Ticket size={19} /> Payments</Link>
            {admin.role === "super_admin" && <Link href="/admin/tickets" className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-[#086544]"><IdentificationCard size={19} /> Tickets</Link>}
            {admin.role === "super_admin" && <Link href="/check-in" className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-[#086544]"><Scan size={19} /> Gate scanner</Link>}
            {admin.role === "super_admin" && <Link href="/admin/check-ins" className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-[#086544]"><ChartBar size={19} /> Check-ins</Link>}
            {admin.role === "super_admin" && <Link href="/admin/promoters" className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-[#086544]"><UsersThree size={19} /> Promoters</Link>}
          </div>
        </nav>
        <main id="main-content" className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
