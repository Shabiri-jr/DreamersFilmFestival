"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import { useActionState } from "react";

import { saveLandmarkLabel } from "@/lib/venue/actions";
import type { VenueLandmark } from "@/lib/venue/landmarks";

export function LandmarkLabelForm({ landmark, number, available }: { landmark: VenueLandmark; number: number; available: boolean }) {
  const [state, action, pending] = useActionState(saveLandmarkLabel, {});
  return (
    <form action={action} className="rounded-2xl border border-[#17120f]/10 bg-white p-5 sm:p-6">
      <input type="hidden" name="landmarkId" value={landmark.id} />
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#086544] text-sm font-extrabold text-white">{number}</span>
        <div><h2 className="font-extrabold">Landmark {number}</h2><p className="mt-1 text-xs text-[#17120f]/55">{landmark.coordinates[1]}, {landmark.coordinates[0]}</p></div>
      </div>
      <label htmlFor={`label-${landmark.id}`} className="text-sm font-bold">Landmark name</label>
      <input id={`label-${landmark.id}`} name="label" defaultValue={landmark.name} required minLength={2} maxLength={80} disabled={pending || !available} aria-describedby={`feedback-${landmark.id}`} className="form-input mt-2 disabled:opacity-60" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a href={landmark.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md text-xs font-bold text-[#086544] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086544]">View pin in Google Maps<ArrowUpRight size={15} /></a>
        <button type="submit" disabled={pending || !available} className="min-h-11 rounded-xl bg-[#17120f] px-5 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#086544] disabled:opacity-50">{pending ? "Saving…" : "Save label"}</button>
      </div>
      <div id={`feedback-${landmark.id}`} className="mt-3 text-sm font-bold">
        {state.error && <p role="alert" className="text-[#a91f14]">{state.error}</p>}
        {state.saved && <p role="status" className="text-[#086544]">Label saved.</p>}
      </div>
    </form>
  );
}
