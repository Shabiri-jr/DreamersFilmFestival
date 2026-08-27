import Link from "next/link";

import { logoutAdmin } from "@/lib/admin/actions";
import { getCurrentAdmin } from "@/lib/admin/auth";

export default async function UnauthorizedPage() {
  const admin = await getCurrentAdmin();
  return (
    <main id="main-content" className="grid min-h-[100dvh] place-items-center bg-[#f3ead8] px-4 text-[#17120f]">
      <section className="max-w-lg rounded-2xl border border-[#17120f]/12 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-extrabold tracking-[0.14em] text-red-700 uppercase">Access denied</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase">Access not assigned</h1>
        <p className="mt-4 text-sm leading-7 text-[#17120f]/62">Your staff role does not allow this area. Gate access, payment review, receipts, revenue, and promoter finance remain separated by role.</p>
        {admin ? <form action={logoutAdmin} className="mt-6"><button className="min-h-12 rounded-xl bg-[#17120f] px-5 text-sm font-extrabold text-white uppercase">Sign out</button></form> : <Link href="/admin/login" className="dark-cta mt-6 px-5">Return to sign in</Link>}
      </section>
    </main>
  );
}
