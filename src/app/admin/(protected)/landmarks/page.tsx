import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { LandmarkLabelForm } from "@/components/venue/landmark-label-form";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getVenueLandmarks } from "@/lib/venue/data";

export const metadata: Metadata = { title: "Map landmarks" };

export default async function AdminLandmarksPage() {
  await requireSuperAdmin();
  const { landmarks, available } = await getVenueLandmarks();
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">Help guests find the Hub</p><h1 className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">Map landmarks</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#17120f]/65">Name the numbered pins on your map. Saved labels appear on the festival homepage and venue map.</p></div>
        <Link href="/venue" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#17120f]/15 bg-white px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-[#086544]">Preview map<ArrowUpRight size={18} /></Link>
      </div>
      {!available && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-900">Saved labels are temporarily unavailable. Please try again later.</p>}
      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {landmarks.map((landmark, index) => <LandmarkLabelForm key={landmark.id} landmark={landmark} number={index + 1} available={available} />)}
      </div>
    </div>
  );
}
