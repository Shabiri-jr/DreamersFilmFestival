"use client";

import { ArrowRight, Minus, Plus, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { formatAdmissions, formatNaira } from "@/lib/format";
import type { CustomerTicketType } from "@/types/domain";

const categoryStyles: Record<string, string> = {
  dreamer: "bg-[#086544]",
  "d-shift": "bg-[#5f2b83]",
  network: "bg-[#a91f14]",
  solo: "bg-[#174e8a]",
  afatakpa: "bg-[#c95b12]",
};

export function TicketSelectorCard({
  ticket,
  salesEnabled,
}: {
  ticket: CustomerTicketType;
  salesEnabled: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const soldOut = ticket.quantityAvailable === 0;
  const finiteLimits = [ticket.maximumPerOrder, ticket.quantityAvailable].filter(
    (value): value is number => value !== null,
  );
  const maximum = finiteLimits.length > 0 ? Math.min(...finiteLimits) : null;
  const canIncrease = maximum === null || quantity < maximum;

  return (
    <article className="group rounded-[2rem] bg-[#17120f]/7 p-1.5 ring-1 ring-[#17120f]/8">
      <div className="relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#fff7e7] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-7">
        <div
          className={`absolute inset-x-0 top-0 h-2 ${categoryStyles[ticket.slug] ?? "bg-[#e84b16]"}`}
        />
        <div className="flex items-start justify-between gap-4 pt-2">
          <div>
            <p className="text-[0.68rem] font-extrabold tracking-[0.2em] text-[#17120f]/42 uppercase">
              Festival pass
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-[#17120f] uppercase">
              {ticket.name}
            </h2>
          </div>
          <span className="rounded-full bg-[#17120f] px-3 py-1.5 text-xs font-extrabold text-[#fff7e7] uppercase">
            {soldOut ? "Sold out" : "Available"}
          </span>
        </div>

        <p className="mt-7 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[#17120f] tabular-nums sm:text-5xl">
          {formatNaira(ticket.price)}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[#17120f]/64">
          <UsersThree size={19} weight="bold" aria-hidden="true" />
          {formatAdmissions(ticket.admissionsPerUnit)} per unit
        </p>
        <p className="mt-5 min-h-12 text-sm leading-6 text-[#17120f]/64">
          {ticket.description}
        </p>

        {ticket.benefits.length > 0 && (
          <ul className="mt-5 space-y-2 border-t border-[#17120f]/10 pt-5 text-sm text-[#17120f]/70">
            {ticket.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 rounded-full bg-[#086544]" />
                {benefit}
              </li>
            ))}
          </ul>
        )}

        {!soldOut && salesEnabled && (
          <div className="mt-7 border-t border-[#17120f]/10 pt-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-extrabold tracking-[0.14em] text-[#17120f]/54 uppercase">
                Quantity
              </span>
              <div className="flex items-center gap-2" aria-label="Ticket quantity">
                <button
                  type="button"
                  aria-label={`Decrease ${ticket.name} quantity`}
                  disabled={quantity <= 1}
                  className="grid size-11 place-items-center rounded-full border border-[#17120f]/14 text-[#17120f] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus size={17} weight="bold" />
                </button>
                <output
                  aria-live="polite"
                  className="min-w-10 text-center text-lg font-extrabold tabular-nums"
                >
                  {quantity}
                </output>
                <button
                  type="button"
                  aria-label={`Increase ${ticket.name} quantity`}
                  disabled={!canIncrease}
                  className="grid size-11 place-items-center rounded-full border border-[#17120f]/14 text-[#17120f] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]"
                  onClick={() => {
                    if (canIncrease) setQuantity((current) => current + 1);
                  }}
                >
                  <Plus size={17} weight="bold" />
                </button>
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#17120f]/48 uppercase">Total</p>
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums">
                  {formatNaira(ticket.price * quantity)}
                </p>
              </div>
              <Link
                href={`/checkout?ticket=${ticket.slug}&quantity=${quantity}`}
                className="group/link inline-flex min-h-12 items-center gap-3 rounded-full bg-[#17120f] py-2 pr-2 pl-5 text-sm font-extrabold text-[#fff7e7] uppercase transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]"
              >
                Select
                <span className="grid size-8 place-items-center rounded-full bg-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1">
                  <ArrowRight size={17} weight="bold" />
                </span>
              </Link>
            </div>
            {maximum !== null && (
              <p className="mt-3 text-xs text-[#17120f]/48">
                Maximum {maximum} per order.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

