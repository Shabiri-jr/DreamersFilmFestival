import { ArrowUpRight, Check, UsersThree } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { formatNaira, formatPassAdmission } from "@/lib/format";
import type { CustomerTicketType } from "@/types/domain";

const categoryStyles: Record<string, { bar: string; check: string }> = {
  dreamer: { bar: "bg-[#086544]", check: "text-[#086544]" },
  "d-shift": { bar: "bg-[#5f2b83]", check: "text-[#5f2b83]" },
  network: { bar: "bg-[#a91f14]", check: "text-[#a91f14]" },
  solo: { bar: "bg-[#174e8a]", check: "text-[#174e8a]" },
  afatakpa: { bar: "bg-[#c95b12]", check: "text-[#c95b12]" },
};

export function TicketPreviewCard({ ticket }: { ticket: CustomerTicketType }) {
  const soldOut = ticket.quantityAvailable === 0;
  const styles = categoryStyles[ticket.slug] ?? {
    bar: "bg-[#e84b16]",
    check: "text-[#e84b16]",
  };

  return (
    <article className="group relative overflow-hidden border-t border-[#17120f]/18 py-7 first:border-t-0 md:grid md:grid-cols-[minmax(13rem,0.65fr)_minmax(16rem,1fr)_auto] md:items-start md:gap-8 lg:gap-12">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`mt-1 h-14 w-1.5 shrink-0 ${styles.bar}`}
        />
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
            {ticket.name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#17120f]/58">
            <UsersThree size={18} weight="bold" aria-hidden="true" />
            {formatPassAdmission(ticket.slug, ticket.admissionsPerUnit)}
          </p>
        </div>
      </div>
      <div className="mt-5 md:mt-0">
        <p className="max-w-xl text-sm leading-6 font-semibold text-[#17120f]/66">
          {ticket.description}
        </p>
        {ticket.benefits.length > 0 && (
          <div className="mt-4">
            <p className="text-[0.64rem] font-extrabold tracking-[0.18em] text-[#17120f]/42 uppercase">
              What&apos;s included
            </p>
            <ul className="mt-2 grid gap-x-5 gap-y-1.5 text-sm text-[#17120f]/64 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {ticket.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2 leading-5">
                  <Check
                    size={15}
                    weight="bold"
                    className={`mt-0.5 shrink-0 ${styles.check}`}
                    aria-hidden="true"
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-5 md:mt-0 md:min-w-36 md:flex-col md:items-end">
        <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums">
          {formatNaira(ticket.price)}
        </p>
        {soldOut ? (
          <span className="inline-flex min-h-11 items-center text-sm font-extrabold text-[#a91f14] uppercase">
            Sold out
          </span>
        ) : (
          <Link
            href={`/checkout?ticket=${ticket.slug}&quantity=1`}
            className="inline-flex min-h-11 items-center gap-2 font-extrabold text-[#086544] uppercase transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#086544]"
          >
            Get pass
            <ArrowUpRight size={19} weight="bold" />
          </Link>
        )}
      </div>
    </article>
  );
}
