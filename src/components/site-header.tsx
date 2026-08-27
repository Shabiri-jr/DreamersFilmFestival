"use client";

import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { FestivalMark } from "@/components/festival-mark";

const navigation = [
  { label: "Tickets", href: "/tickets" },
  { label: "Event info", href: "/#event" },
  { label: "FAQ", href: "/#faq" },
] as const;

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-[1400px] items-center justify-between rounded-full border border-white/12 bg-[#17120f]/92 p-1.5 pl-3 text-[#fff7e7] shadow-[0_16px_50px_rgba(58,18,8,0.18)] backdrop-blur-xl"
      >
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-2.5 rounded-full px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]"
          onClick={() => setIsOpen(false)}
        >
          <FestivalMark className="size-8 text-[#e84b16] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-12" />
          <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-[0.08em] uppercase">
            Dreamers Pass
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-[#f3ead8]/74 transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/7 hover:text-[#fff7e7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/tickets"
            className="group ml-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#e84b16] py-1.5 pr-1.5 pl-5 text-sm font-extrabold text-[#fff7e7] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]"
          >
            Get tickets
            <span className="grid size-8 place-items-center rounded-full bg-[#17120f]/16 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight size={17} weight="bold" />
            </span>
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          className="grid size-11 place-items-center rounded-full bg-white/8 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c] md:hidden"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
        </button>
      </nav>

      <div
        id="mobile-navigation"
        className={`absolute right-3 left-3 mx-auto mt-2 max-w-[1400px] overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#17120f]/96 p-2 text-[#fff7e7] shadow-[0_18px_60px_rgba(58,18,8,0.26)] backdrop-blur-xl transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-5 sm:left-5 md:hidden ${
          isOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-3 opacity-0"
        }`}
      >
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex min-h-12 items-center rounded-2xl px-4 font-bold transition-colors duration-200 hover:bg-white/7 focus-visible:outline-2 focus-visible:outline-[#eaa42c]"
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/tickets"
          className="mt-1 flex min-h-12 items-center justify-between rounded-2xl bg-[#e84b16] px-4 font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]"
          onClick={() => setIsOpen(false)}
        >
          Get tickets
          <ArrowUpRight size={20} weight="bold" />
        </Link>
      </div>
    </header>
  );
}
