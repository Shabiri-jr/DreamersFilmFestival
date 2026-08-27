"use client";

import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";

export default function CheckInError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="grid min-h-[100dvh] place-items-center bg-[#17120f] px-4 text-[#fff7e7]">
      <section className="w-full max-w-md rounded-[1.75rem] border border-[#ff8b6b]/25 bg-[#a91f14]/16 p-6 text-center">
        <WarningCircle size={48} weight="fill" className="mx-auto text-[#ff8b6b]" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">Gate service unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-[#fff7e7]/65">No ticket was checked in locally. Confirm the phone is online, then retry the secure connection.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-13 w-full rounded-xl bg-[#fff7e7] px-5 font-extrabold text-[#17120f] uppercase"><ArrowClockwise className="mr-2 inline" size={20} /> Retry connection</button>
      </section>
    </main>
  );
}
