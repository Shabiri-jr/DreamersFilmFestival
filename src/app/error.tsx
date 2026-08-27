"use client";

import { WarningCircle } from "@phosphor-icons/react";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main-content" className="grid min-h-[100dvh] place-items-center bg-[#f3ead8] px-4 py-16 text-[#17120f]">
      <div className="max-w-xl text-center">
        <WarningCircle size={50} weight="light" className="mx-auto text-[#e84b16]" />
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-none font-extrabold uppercase">
          We could not load this page
        </h1>
        <p className="mt-4 text-base leading-7 text-[#17120f]/62">
          Check your connection and try again. If the problem continues, contact The Dreamers TV.
        </p>
        <button type="button" className="dark-cta mt-7" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

