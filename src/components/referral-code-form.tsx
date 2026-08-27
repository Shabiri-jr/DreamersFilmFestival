"use client";

import { CaretDown, CheckCircle, Tag } from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  applyManualReferralAction,
} from "@/lib/referrals/actions";
import type { ReferralActionState } from "@/lib/referrals/actions";

export type AppliedReferral = Readonly<{
  code: string;
  promoterName: string;
}>;

export function ReferralCodeForm({
  appliedReferral,
}: {
  appliedReferral: AppliedReferral | null;
}) {
  const [state, action, isPending] = useActionState(
    applyManualReferralAction,
    {
      status: "idle",
      message: "",
    } satisfies ReferralActionState,
  );

  if (appliedReferral) {
    return (
      <div className="mt-6 rounded-2xl border border-[#086544]/22 bg-[#086544]/7 p-4 text-[#17120f]">
        <div className="flex gap-3">
          <CheckCircle className="mt-0.5 shrink-0 text-[#086544]" size={22} weight="fill" />
          <div>
            <p className="font-extrabold">Referral code applied</p>
            <p className="mt-1 text-sm text-[#17120f]/62">
              {appliedReferral.code} · Referred by {appliedReferral.promoterName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <details className="group mt-6 rounded-2xl border border-[#17120f]/12 bg-[#17120f]/[0.025] open:bg-[#17120f]/[0.035]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]">
        <span className="flex items-center gap-2">
          <Tag size={19} weight="bold" aria-hidden="true" />
          Have a referral code?
        </span>
        <CaretDown
          size={18}
          weight="bold"
          className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <form action={action} className="border-t border-[#17120f]/10 p-4">
        <label htmlFor="referralCode" className="text-sm font-extrabold">
          Promoter / referral code
        </label>
        <p id="referral-help" className="mt-1 text-xs leading-5 text-[#17120f]/56">
          Optional. Apply a code shared with you before creating the order.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="referralCode"
            name="referralCode"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-describedby="referral-help referral-result"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#17120f]/16 bg-[#fff7e7] px-4 font-bold uppercase outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#086544] focus:shadow-[0_0_0_3px_rgba(8,101,68,0.12)]"
            placeholder="DANIEL"
            disabled={isPending || state.status === "success" || state.status === "locked"}
          />
          <button
            type="submit"
            disabled={isPending || state.status === "success" || state.status === "locked"}
            className="min-h-12 rounded-xl bg-[#17120f] px-5 text-sm font-extrabold text-[#fff7e7] uppercase transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]"
          >
            {isPending ? "Checking..." : "Apply code"}
          </button>
        </div>
        <p
          id="referral-result"
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-3 min-h-5 text-sm font-bold ${
            state.status === "error" ? "text-[#a91f14]" : "text-[#086544]"
          }`}
        >
          {state.message}
        </p>
      </form>
    </details>
  );
}
