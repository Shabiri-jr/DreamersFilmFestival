"use client";

import {
  CheckCircle,
  FilePdf,
  ImageSquare,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  submitPaymentAction,
  type PaymentActionState,
} from "@/lib/payments/actions";
import { formatNaira } from "@/lib/format";
import { MAX_RECEIPT_BYTES } from "@/lib/payments/validation";

const BANKS = [
  "Access Bank",
  "GTBank",
  "UBA",
  "Zenith Bank",
  "First Bank",
  "Kuda",
  "OPay",
  "PalmPay",
  "Moniepoint",
];

const INITIAL_STATE: PaymentActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

type Props = Readonly<{
  orderNumber: string;
  expectedAmount: number;
  idempotencyKey: string;
  today: string;
  initiallyOpen?: boolean;
}>;

export function PaymentSubmissionForm({
  orderNumber,
  expectedAmount,
  idempotencyKey,
  today,
  initiallyOpen = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [values, setValues] = useState({
    senderName: "",
    senderBank: "",
    amountPaid: String(expectedAmount),
    paymentReference: "",
    paymentDate: today,
    paymentTime: "",
  });
  const [changedAfterError, setChangedAfterError] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bankListId = useId();
  const boundAction = submitPaymentAction.bind(null, orderNumber);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    INITIAL_STATE,
  );

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function selectReceipt(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = file?.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setReceipt(file);
    setChangedAfterError(true);
  }

  function clearReceipt() {
    selectReceipt(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateValue(event: React.ChangeEvent<HTMLInputElement>) {
    setChangedAfterError(true);
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  if (!isOpen) {
    return (
      <div className="rounded-3xl bg-[#086544] p-6 text-[#fff7e7] sm:p-7">
        <UploadSimple size={28} weight="light" className="text-[#eaa42c]" />
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
          Made the transfer?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#f3ead8]/74">
          Add your transfer details and receipt so the festival team can check your payment.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-6 min-h-12 w-full rounded-full bg-[#fff7e7] px-5 text-sm font-extrabold text-[#17120f] uppercase transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#eaa42c] active:scale-[0.98]"
        >
          I have paid
        </button>
      </div>
    );
  }

  const receiptError =
    (!changedAfterError ? state.fieldErrors.receipt : undefined) ||
    (receipt && receipt.size > MAX_RECEIPT_BYTES
      ? "Your receipt is too large. Please upload a file under 5 MB."
      : undefined);

  return (
    <section
      id="payment-submission"
      className="rounded-[2rem] bg-[#086544] p-1.5 text-[#fff7e7] ring-1 ring-[#17120f]/10"
    >
      <div className="rounded-[calc(2rem-0.375rem)] bg-[#fff7e7] p-5 text-[#17120f] sm:p-8">
        <p className="section-eyebrow">Payment evidence</p>
        <h2 className="mt-2 max-w-[12ch] font-[family-name:var(--font-display)] text-4xl leading-[0.92] font-extrabold uppercase sm:text-5xl">
          Submit for verification.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#17120f]/64">
          This sends payment information for review. It does not verify the transfer or issue a ticket.
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 border-y border-[#17120f]/12 py-4">
          <span className="text-xs font-extrabold tracking-[0.14em] text-[#17120f]/52 uppercase">
            Expected amount
          </span>
          <strong className="font-[family-name:var(--font-display)] text-3xl text-[#086544] tabular-nums">
            {formatNaira(expectedAmount)}
          </strong>
        </div>

        <form
          action={formAction}
          className="mt-7 space-y-6"
          onSubmit={() => setChangedAfterError(false)}
        >
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Sender / account name"
              name="senderName"
              placeholder="Tolu Adebayo"
              autoComplete="name"
              value={values.senderName}
              onChange={updateValue}
              error={state.fieldErrors.senderName}
            />
            <FormField
              label="Bank or payment provider"
              name="senderBank"
              placeholder="Select or type a bank"
              list={bankListId}
              value={values.senderBank}
              onChange={updateValue}
              error={state.fieldErrors.senderBank}
            />
            <datalist id={bankListId}>
              {BANKS.map((bank) => <option value={bank} key={bank} />)}
            </datalist>
            <FormField
              label="Amount paid"
              name="amountPaid"
              type="number"
              inputMode="numeric"
              min="1"
              max="9999999999"
              step="1"
              value={values.amountPaid}
              onChange={updateValue}
              error={state.fieldErrors.amountPaid}
              prefix="₦"
            />
            <FormField
              label="Transaction / transfer reference"
              name="paymentReference"
              placeholder="Enter the reference from your receipt"
              maxLength={120}
              value={values.paymentReference}
              onChange={updateValue}
              error={state.fieldErrors.paymentReference}
            />
            <FormField
              label="Date of payment"
              name="paymentDate"
              type="date"
              value={values.paymentDate}
              onChange={updateValue}
              max={today}
              error={state.fieldErrors.paymentDate}
            />
            <FormField
              label="Approximate transfer time"
              optional
              name="paymentTime"
              type="time"
              value={values.paymentTime}
              onChange={updateValue}
              error={state.fieldErrors.paymentTime}
            />
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="receipt" className="text-sm font-extrabold">
                Payment receipt
              </label>
              <span className="text-xs font-bold text-[#17120f]/48">
                JPG, PNG, WEBP or PDF · max 5 MB
              </span>
            </div>
            <div
              className={`mt-2 overflow-hidden rounded-2xl border-2 border-dashed ${receiptError ? "border-[#a91f14]" : "border-[#17120f]/18"} bg-white/48`}
            >
              {receipt ? (
                <div className="p-4 sm:p-5">
                  {previewUrl ? (
                    // This blob URL is created from the customer's local selection only.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Selected payment receipt preview"
                      className="max-h-64 w-full rounded-xl bg-[#17120f]/5 object-contain"
                    />
                  ) : (
                    <div className="grid min-h-32 place-items-center rounded-xl bg-[#17120f] text-[#fff7e7]">
                      <FilePdf size={42} weight="light" aria-hidden="true" />
                      <span className="sr-only">PDF receipt selected</span>
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-extrabold text-[#086544]">
                        <CheckCircle size={18} weight="fill" /> Receipt added
                      </p>
                      <p className="mt-1 truncate text-xs text-[#17120f]/56">{receipt.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <label htmlFor="receipt" className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[#17120f]/16 px-4 text-xs font-extrabold uppercase focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#086544]">
                        Replace
                      </label>
                      <button
                        type="button"
                        onClick={clearReceipt}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-extrabold text-[#a91f14] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a91f14]"
                      >
                        <Trash size={17} weight="bold" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label htmlFor="receipt" className="flex min-h-44 cursor-pointer flex-col items-center justify-center px-5 py-8 text-center focus-within:outline-2 focus-within:outline-offset-[-4px] focus-within:outline-[#086544]">
                  <ImageSquare size={34} weight="light" className="text-[#086544]" />
                  <span className="mt-3 text-sm font-extrabold uppercase">Upload receipt</span>
                  <span className="mt-1 text-xs text-[#17120f]/52">Choose from camera, photos, or files</span>
                </label>
              )}
              <input
                ref={inputRef}
                id="receipt"
                name="receipt"
                type="file"
                required
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                aria-invalid={Boolean(receiptError)}
                aria-describedby={receiptError ? "receipt-error" : undefined}
                onChange={(event) => selectReceipt(event.target.files?.[0] ?? null)}
              />
            </div>
            {receiptError && <FieldError id="receipt-error">{receiptError}</FieldError>}
          </div>

          {state.status === "error" && !changedAfterError && (
            <div role="alert" className="rounded-xl border border-[#a91f14]/22 bg-[#a91f14]/8 px-4 py-3 text-sm font-bold text-[#8b1b13]">
              {state.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || Boolean(receipt && receipt.size > MAX_RECEIPT_BYTES)}
            className="min-h-13 w-full rounded-full bg-[#17120f] px-6 text-sm font-extrabold text-[#fff7e7] uppercase transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#e84b16] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-58"
          >
            {isPending ? "Uploading receipt & submitting..." : "Submit for verification"}
          </button>
          <p aria-live="polite" className="text-center text-xs leading-5 text-[#17120f]/52">
            {isPending
              ? "Keep this page open while your receipt uploads."
              : "Your ticket is issued only after the festival team confirms your payment."}
          </p>
        </form>
      </div>
    </section>
  );
}

type FormFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  optional?: boolean;
  prefix?: string;
};

function FormField({
  label,
  name,
  error,
  optional,
  prefix,
  ...props
}: FormFieldProps) {
  const errorId = `${name}-error`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-sm font-extrabold">{label}</label>
        {optional && (
          <span className="text-[0.65rem] font-bold tracking-[0.12em] text-[#17120f]/42 uppercase">Optional</span>
        )}
      </div>
      <div className="relative mt-2">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-extrabold text-[#17120f]/52">{prefix}</span>
        )}
        <input
          {...props}
          id={name}
          name={name}
          required={!optional}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`form-input ${prefix ? "pl-9" : ""}`}
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return <p id={id} className="mt-2 text-xs font-bold text-[#a91f14]">{children}</p>;
}
