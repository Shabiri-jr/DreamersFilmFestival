"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { rejectPaymentAction, verifyPaymentAction } from "@/lib/admin/actions";
import { REJECTION_PRESETS, resolveRejectionReason } from "@/lib/admin/review";
import { formatNaira } from "@/lib/format";

type ReviewActionProps = Readonly<{
  orderId: string;
  submissionId: string;
  orderNumber: string;
  customerName: string;
  expectedAmount: number;
  submittedAmount: number;
  promoterName: string | null;
  commissionPreview: number;
}>;

function ActionButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className}>{pending ? pendingLabel : label}</button>;
}

export function AdminReviewActions(props: ReviewActionProps) {
  const verifyDialog = useRef<HTMLDialogElement>(null);
  const rejectDialog = useRef<HTMLDialogElement>(null);
  const [preset, setPreset] = useState("payment_not_found");
  const [customReason, setCustomReason] = useState("");
  const reason = resolveRejectionReason(preset, customReason);

  return (
    <section className="rounded-2xl border border-[#17120f]/12 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#e84b16] uppercase">Financial decision</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#17120f] uppercase">Complete this review</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#17120f]/60">Compare this evidence with the festival bank record. A matching receipt never approves itself.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => rejectDialog.current?.showModal()} className="min-h-12 rounded-xl border border-red-300 bg-white px-5 text-sm font-extrabold text-red-800 uppercase hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Reject payment</button>
          <button type="button" onClick={() => verifyDialog.current?.showModal()} className="min-h-12 rounded-xl bg-[#086544] px-5 text-sm font-extrabold text-white uppercase hover:bg-[#064d35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]">Verify payment</button>
        </div>
      </div>

      <dialog ref={verifyDialog} className="m-auto w-[min(92vw,34rem)] rounded-2xl bg-white p-0 text-[#17120f] shadow-2xl backdrop:bg-[#17120f]/70">
        <form action={verifyPaymentAction} className="p-6 sm:p-8">
          <input type="hidden" name="orderId" value={props.orderId} />
          <input type="hidden" name="submissionId" value={props.submissionId} />
          <input type="hidden" name="orderNumber" value={props.orderNumber} />
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#086544] uppercase">Final confirmation</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">Verify this payment?</h3>
          <dl className="mt-6 divide-y divide-[#17120f]/10 border-y border-[#17120f]/10 text-sm">
            {[
              ["Order", props.orderNumber], ["Customer", props.customerName],
              ["Expected", formatNaira(props.expectedAmount)], ["Submitted", formatNaira(props.submittedAmount)],
              ["Promoter", props.promoterName ?? "Direct sale"], ["Commission earned", formatNaira(props.commissionPreview)],
            ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><dt className="text-[#17120f]/52">{label}</dt><dd className="text-right font-extrabold tabular-nums">{value}</dd></div>)}
          </dl>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => verifyDialog.current?.close()} className="min-h-12 rounded-xl border border-[#17120f]/16 px-4 text-sm font-extrabold uppercase">Cancel</button>
            <ActionButton label="Confirm verification" pendingLabel="Verifying payment…" className="min-h-12 rounded-xl bg-[#086544] px-4 text-sm font-extrabold text-white uppercase disabled:opacity-60" />
          </div>
        </form>
      </dialog>

      <dialog ref={rejectDialog} className="m-auto w-[min(92vw,36rem)] rounded-2xl bg-white p-0 text-[#17120f] shadow-2xl backdrop:bg-[#17120f]/70">
        <form action={rejectPaymentAction} className="p-6 sm:p-8">
          <input type="hidden" name="orderId" value={props.orderId} />
          <input type="hidden" name="submissionId" value={props.submissionId} />
          <input type="hidden" name="orderNumber" value={props.orderNumber} />
          <p className="text-xs font-extrabold tracking-[0.14em] text-red-700 uppercase">Customer-visible decision</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">Reject this payment?</h3>
          <label htmlFor="reasonPreset" className="mt-6 block text-xs font-extrabold tracking-[0.1em] uppercase">Reason</label>
          <select id="reasonPreset" name="reasonPreset" value={preset} onChange={(event) => setPreset(event.target.value)} className="form-input mt-2">
            {Object.entries(REJECTION_PRESETS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            <option value="other">Other — write an explanation</option>
          </select>
          {preset === "other" && <textarea name="customReason" value={customReason} onChange={(event) => setCustomReason(event.target.value)} required minLength={3} maxLength={1000} rows={4} className="form-input mt-3 min-h-28 resize-y" aria-label="Custom rejection explanation" />}
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900"><strong>Customer will see:</strong><br />{reason ?? "Enter a clear explanation."}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => rejectDialog.current?.close()} className="min-h-12 rounded-xl border border-[#17120f]/16 px-4 text-sm font-extrabold uppercase">Cancel</button>
            <ActionButton label="Confirm rejection" pendingLabel="Rejecting payment…" className="min-h-12 rounded-xl bg-red-700 px-4 text-sm font-extrabold text-white uppercase disabled:opacity-60" />
          </div>
        </form>
      </dialog>
    </section>
  );
}
