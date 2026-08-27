"use client";

import { ArrowRight, Minus, Plus, ShieldCheck } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import {
  createCustomerOrderAction,
} from "@/lib/orders/actions";
import type { CheckoutActionState } from "@/lib/orders/actions";
import { formatAdmissions, formatNaira } from "@/lib/format";
import type { CustomerTicketType } from "@/types/domain";
import {
  ReferralCodeForm,
  type AppliedReferral,
} from "@/components/referral-code-form";

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="min-h-5 text-sm font-bold text-[#a91f14]" role="alert">
      {message}
    </p>
  );
}

export function CheckoutForm({
  ticket,
  initialQuantity,
  idempotencyKey,
  appliedReferral,
}: {
  ticket: CustomerTicketType;
  initialQuantity: number;
  idempotencyKey: string;
  appliedReferral: AppliedReferral | null;
}) {
  const [state, action, isPending] = useActionState(
    createCustomerOrderAction,
    {
      status: "idle",
      message: "",
      fieldErrors: {},
    } satisfies CheckoutActionState,
  );
  const [quantity, setQuantity] = useState(initialQuantity);
  const finiteLimits = [ticket.maximumPerOrder, ticket.quantityAvailable].filter(
    (value): value is number => value !== null,
  );
  const maximum = finiteLimits.length > 0 ? Math.min(...finiteLimits) : null;
  const canIncrease = maximum === null || quantity < maximum;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.65fr)] lg:items-start lg:gap-10">
      <div className="rounded-[2rem] bg-[#17120f]/7 p-1.5 ring-1 ring-[#17120f]/8">
        <div className="rounded-[calc(2rem-0.375rem)] bg-[#fff7e7] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8">
          <div className="border-b border-[#17120f]/10 pb-6">
            <p className="text-[0.68rem] font-extrabold tracking-[0.2em] text-[#e84b16] uppercase">
              Step 02 / Your details
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none font-extrabold tracking-tight text-[#17120f] uppercase sm:text-5xl">
              Who is this order for?
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#17120f]/62">
              We use your WhatsApp number for order support and later ticket delivery.
            </p>
          </div>

          {state.status === "error" && (
            <div
              className="mt-6 rounded-2xl border border-[#a91f14]/24 bg-[#a91f14]/7 p-4 text-sm font-bold text-[#8d1b13]"
              role="alert"
            >
              {state.message}
            </div>
          )}

          <form id="checkout-form" action={action} className="mt-7 space-y-5" aria-busy={isPending}>
            <input type="hidden" name="ticketTypeId" value={ticket.id} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

            <div className="grid gap-2">
              <label htmlFor="customerName" className="text-sm font-extrabold text-[#17120f]">
                Full name <span aria-hidden="true" className="text-[#a91f14]">*</span>
              </label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                aria-invalid={Boolean(state.fieldErrors.customerName)}
                aria-describedby="customerName-error"
                className="form-input"
                placeholder="Your full name"
              />
              <FieldError id="customerName-error" message={state.fieldErrors.customerName} />
            </div>

            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-extrabold text-[#17120f]">
                WhatsApp number <span aria-hidden="true" className="text-[#a91f14]">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                aria-invalid={Boolean(state.fieldErrors.phone)}
                aria-describedby="phone-help phone-error"
                className="form-input"
                placeholder="+234 809 368 2647"
              />
              <p id="phone-help" className="text-xs leading-5 text-[#17120f]/54">
                Nigerian numbers may start with 0 or +234. International numbers should include + and country code.
              </p>
              <FieldError id="phone-error" message={state.fieldErrors.phone} />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-extrabold text-[#17120f]">
                Email address <span className="font-medium text-[#17120f]/46">(optional)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={Boolean(state.fieldErrors.email)}
                aria-describedby="email-error"
                className="form-input"
                placeholder="you@example.com"
              />
              <FieldError id="email-error" message={state.fieldErrors.email} />
            </div>

            <fieldset className="border-t border-[#17120f]/10 pt-5">
              <legend className="text-sm font-extrabold text-[#17120f]">Ticket quantity</legend>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-extrabold">{ticket.name}</p>
                  <p className="mt-1 text-xs text-[#17120f]/52">
                    {formatAdmissions(ticket.admissionsPerUnit)} per unit
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1 || isPending}
                    className="quantity-button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    <Minus size={17} weight="bold" />
                  </button>
                  <input
                    aria-label="Quantity"
                    name="quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maximum ?? undefined}
                    value={quantity}
                    disabled={isPending}
                    className="h-11 w-14 rounded-xl border border-[#17120f]/14 bg-[#fff7e7] text-center font-extrabold tabular-nums outline-none focus:border-[#086544] focus:shadow-[0_0_0_3px_rgba(8,101,68,0.12)]"
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isSafeInteger(next) && next >= 1 && (maximum === null || next <= maximum)) {
                        setQuantity(next);
                      }
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={!canIncrease || isPending}
                    className="quantity-button"
                    onClick={() => {
                      if (canIncrease) setQuantity((current) => current + 1);
                    }}
                  >
                    <Plus size={17} weight="bold" />
                  </button>
                </div>
              </div>
              <FieldError id="quantity-error" message={state.fieldErrors.quantity} />
            </fieldset>
          </form>

          <ReferralCodeForm appliedReferral={appliedReferral} />
        </div>
      </div>

      <aside className="rounded-[2rem] bg-[#e84b16] p-1.5 text-[#fff7e7] ring-1 ring-[#17120f]/8 lg:sticky lg:top-28">
        <div className="rounded-[calc(2rem-0.375rem)] bg-[#17120f] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-7">
          <p className="text-[0.68rem] font-extrabold tracking-[0.2em] text-[#eaa42c] uppercase">
            Order summary
          </p>
          <div className="mt-6 flex items-start justify-between gap-4 border-b border-white/12 pb-5">
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
                {ticket.name}
              </p>
              <p className="mt-1 text-sm text-[#f3ead8]/58">
                {formatAdmissions(ticket.admissionsPerUnit)}
              </p>
            </div>
            <p className="font-bold tabular-nums">× {quantity}</p>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4 text-[#f3ead8]/62">
              <dt>Ticket price</dt>
              <dd className="font-bold tabular-nums">{formatNaira(ticket.price)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-[#f3ead8]/62">
              <dt>Quantity</dt>
              <dd className="font-bold tabular-nums">{quantity}</dd>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/12 pt-5">
              <dt className="font-extrabold uppercase">Total</dt>
              <dd className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[#eaa42c] tabular-nums">
                {formatNaira(ticket.price * quantity)}
              </dd>
            </div>
          </dl>

          <button
            type="submit"
            form="checkout-form"
            disabled={isPending}
            className="group mt-7 flex min-h-13 w-full items-center justify-between rounded-full bg-[#e84b16] py-2 pr-2 pl-5 text-sm font-extrabold uppercase transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]"
          >
            {isPending ? "Creating order..." : "Continue to payment"}
            <span className="grid size-9 place-items-center rounded-full bg-[#17120f]/18 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
              <ArrowRight size={18} weight="bold" />
            </span>
          </button>
          <p className="mt-4 flex gap-2 text-xs leading-5 text-[#f3ead8]/52">
            <ShieldCheck size={18} weight="bold" className="shrink-0 text-[#086544]" />
            Price and total are rechecked securely before your order is created.
          </p>
        </div>
      </aside>
    </div>
  );
}
