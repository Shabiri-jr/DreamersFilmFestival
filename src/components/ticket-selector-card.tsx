"use client";

import { ArrowRight, Check, Minus, Plus, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { formatNaira, formatPassAdmission } from "@/lib/format";
import type { CustomerTicketType } from "@/types/domain";

const categoryStyles: Record<
  string,
  { bar: string; check: string; label: string }
> = {
  dreamer: {
    bar: "bg-[#086544]",
    check: "text-[#086544]",
    label: "Community pass",
  },
  "d-shift": {
    bar: "bg-[#5f2b83]",
    check: "text-[#5f2b83]",
    label: "Festival pass",
  },
  network: {
    bar: "bg-[#a91f14]",
    check: "text-[#a91f14]",
    label: "Group pass",
  },
  solo: {
    bar: "bg-[#174e8a]",
    check: "text-[#174e8a]",
    label: "Premium pass",
  },
  afatakpa: {
    bar: "bg-[#eaa42c]",
    check: "text-[#eaa42c]",
    label: "VVIP couple pass",
  },
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
  const isVvip = ticket.slug === "afatakpa";
  const styles = categoryStyles[ticket.slug] ?? {
    bar: "bg-[#e84b16]",
    check: "text-[#e84b16]",
    label: "Festival pass",
  };

  return (
    <article
      className={`group h-full rounded-[2rem] p-1.5 ring-1 ring-[#17120f]/8 ${isVvip ? "bg-[#eaa42c]" : "bg-[#17120f]/7"}`}
    >
      <div
        className={`relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-7 ${isVvip ? "bg-[#17120f] text-[#fff7e7]" : "bg-[#fff7e7] text-[#17120f]"}`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-2 ${styles.bar}`}
        />
        <div className="flex items-start justify-between gap-4 pt-2">
          <div>
            <p
              className={`text-[0.68rem] font-extrabold tracking-[0.2em] uppercase ${isVvip ? "text-[#eaa42c]" : "text-[#17120f]/42"}`}
            >
              {styles.label}
            </p>
            <h2
              className={`mt-1 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight uppercase ${isVvip ? "text-[#fff7e7]" : "text-[#17120f]"}`}
            >
              {ticket.name}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase ${isVvip ? "bg-[#eaa42c] text-[#17120f]" : "bg-[#17120f] text-[#fff7e7]"}`}
          >
            {soldOut ? "Sold out" : "Available"}
          </span>
        </div>

        <p
          className={`mt-7 font-[family-name:var(--font-display)] text-4xl font-extrabold tabular-nums sm:text-5xl ${isVvip ? "text-[#eaa42c]" : "text-[#17120f]"}`}
        >
          {formatNaira(ticket.price)}
        </p>
        <p
          className={`mt-3 flex items-center gap-2 text-sm font-bold ${isVvip ? "text-[#f3ead8]/72" : "text-[#17120f]/64"}`}
        >
          <UsersThree size={19} weight="bold" aria-hidden="true" />
          {formatPassAdmission(ticket.slug, ticket.admissionsPerUnit)}
        </p>
        <p
          className={`mt-5 text-sm leading-6 sm:min-h-12 ${isVvip ? "text-[#f3ead8]/64" : "text-[#17120f]/64"}`}
        >
          {ticket.description}
        </p>

        {ticket.benefits.length > 0 && (
          <div
            className={`mt-5 border-t pt-5 ${isVvip ? "border-white/12" : "border-[#17120f]/10"}`}
          >
            <p
              className={`text-[0.64rem] font-extrabold tracking-[0.18em] uppercase ${isVvip ? "text-[#eaa42c]" : "text-[#17120f]/42"}`}
            >
              What&apos;s included
            </p>
            <ul
              className={`mt-3 space-y-2 text-sm ${isVvip ? "text-[#f3ead8]/76" : "text-[#17120f]/70"}`}
            >
              {ticket.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2 leading-5">
                  <Check
                    size={16}
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

        {!soldOut && salesEnabled && (
          <div
            className={`mt-7 border-t pt-5 ${isVvip ? "border-white/12" : "border-[#17120f]/10"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <span
                className={`text-xs font-extrabold tracking-[0.14em] uppercase ${isVvip ? "text-[#f3ead8]/54" : "text-[#17120f]/54"}`}
              >
                Quantity
              </span>
              <div className="flex items-center gap-2" aria-label="Ticket quantity">
                <button
                  type="button"
                  aria-label={`Decrease ${ticket.name} quantity`}
                  disabled={quantity <= 1}
                  className={`grid size-11 place-items-center rounded-full border transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544] ${isVvip ? "border-white/18 text-[#fff7e7]" : "border-[#17120f]/14 text-[#17120f]"}`}
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
                  className={`grid size-11 place-items-center rounded-full border transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544] ${isVvip ? "border-white/18 text-[#fff7e7]" : "border-[#17120f]/14 text-[#17120f]"}`}
                  onClick={() => {
                    if (canIncrease) setQuantity((current) => current + 1);
                  }}
                >
                  <Plus size={17} weight="bold" />
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  className={`text-xs font-bold uppercase ${isVvip ? "text-[#f3ead8]/48" : "text-[#17120f]/48"}`}
                >
                  Total
                </p>
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums">
                  {formatNaira(ticket.price * quantity)}
                </p>
              </div>
              <Link
                href={`/checkout?ticket=${ticket.slug}&quantity=${quantity}`}
                className={`group/link inline-flex min-h-12 items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5 text-sm font-extrabold uppercase transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544] sm:justify-center ${isVvip ? "bg-[#eaa42c] text-[#17120f]" : "bg-[#17120f] text-[#fff7e7]"}`}
              >
                Get {ticket.name} pass
                <span className="grid size-8 place-items-center rounded-full bg-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1">
                  <ArrowRight size={17} weight="bold" />
                </span>
              </Link>
            </div>
            {maximum !== null && (
              <p
                className={`mt-3 text-xs ${isVvip ? "text-[#f3ead8]/48" : "text-[#17120f]/48"}`}
              >
                Maximum {maximum} per order.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
