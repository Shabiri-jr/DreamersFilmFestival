import { LockKey } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function OrderAccessDenied({
  supportWhatsapp,
  orderNumber,
}: {
  supportWhatsapp: string;
  orderNumber: string;
}) {
  return (
    <div className="festival-page min-h-[100dvh] bg-[#f3ead8] text-[#17120f]">
      <SiteHeader />
      <main id="main-content" className="grid min-h-[65dvh] place-items-center px-4 py-16">
        <div className="max-w-xl text-center">
          <LockKey size={48} weight="light" className="mx-auto text-[#e84b16]" />
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-none font-extrabold uppercase">
            This order is not available here
          </h1>
          <p className="mt-4 text-base leading-7 text-[#17120f]/62">
            For privacy, order {orderNumber} can only be opened in the browser that created it. Contact support if you need help.
          </p>
          <Link href="/tickets" className="dark-cta mt-7">Return to tickets</Link>
        </div>
      </main>
      <SiteFooter supportWhatsapp={supportWhatsapp} />
    </div>
  );
}
