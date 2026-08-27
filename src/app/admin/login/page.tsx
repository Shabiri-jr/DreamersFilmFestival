import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { FestivalMark } from "@/components/festival-mark";
import { getCurrentAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Staff Sign In" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requestedNext = (await searchParams).next === "/check-in" ? "/check-in" : undefined;
  const admin = await getCurrentAdmin();
  if (admin) redirect(admin.role === "gate_staff" || requestedNext ? "/check-in" : "/admin");
  return (
    <main id="main-content" className="grid min-h-[100dvh] place-items-center bg-[#17120f] px-4 py-10 text-[#17120f]">
      <section className="w-full max-w-md rounded-[2rem] bg-[#fff7e7] p-6 shadow-2xl sm:p-9">
        <FestivalMark className="h-11 w-auto text-[#e84b16]" />
        <p className="mt-8 text-xs font-extrabold tracking-[0.18em] text-[#e84b16] uppercase">Festival operations</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none font-extrabold uppercase">Staff sign in</h1>
        <p className="mt-4 text-sm leading-6 text-[#17120f]/60">Use your authorized Dreamers Pass staff account. Customer accounts cannot access this area.</p>
        <AdminLoginForm next={requestedNext} />
      </section>
    </main>
  );
}
