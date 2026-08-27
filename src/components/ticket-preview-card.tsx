import { ArrowUpRight, UsersThree } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { formatAdmissions, formatNaira } from "@/lib/format";
import type { CustomerTicketType } from "@/types/domain";

const categoryStyles: Record<string, string> = {
  dreamer: "bg-[#086544]",
  "d-shift": "bg-[#5f2b83]",
  network: "bg-[#a91f14]",
  solo: "bg-[#174e8a]",
  afatakpa: "bg-[#c95b12]",
};

export function TicketPreviewCard({ ticket }: { ticket: CustomerTicketType }) {
  const soldOut = ticket.quantityAvailable === 0;

  return (
    <article className="group relative overflow-hidden border-t border-[#17120f]/18 py-5 first:border-t-0 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-8">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`mt-1 h-12 w-1.5 shrink-0 ${categoryStyles[ticket.slug] ?? "bg-[#e84b16]"}`}
        />
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
            {ticket.name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#17120f]/58">
            <UsersThree size={18} weight="bold" aria-hidden="true" />
            {formatAdmissions(ticket.admissionsPerUnit)}
          </p>
        </div>
      </div>
      <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums md:mt-0">
        {formatNaira(ticket.price)}
      </p>
      {soldOut ? (
        <span className="mt-4 inline-flex min-h-11 items-center text-sm font-extrabold text-[#a91f14] uppercase md:mt-0">
          Sold out
        </span>
      ) : (
        <Link
          href={`/checkout?ticket=${ticket.slug}&quantity=1`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-extrabold text-[#086544] uppercase transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#086544] md:mt-0"
        >
          Select
          <ArrowUpRight size={19} weight="bold" />
        </Link>
      )}
    </article>
  );
}

