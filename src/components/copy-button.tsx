"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";

export function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#17120f]/14 px-4 text-xs font-extrabold tracking-[0.08em] uppercase transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#17120f]/5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]"
      onClick={copyValue}
    >
      {copied ? <Check size={17} weight="bold" /> : <Copy size={17} weight="bold" />}
      {copied ? "Copied" : label}
    </button>
  );
}

