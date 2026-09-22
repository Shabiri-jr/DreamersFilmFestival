"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { Coordinates } from "@/lib/venue/location";

function MapLoading() {
  return (
    <div role="status" className="grid min-h-[36rem] place-items-center bg-[#f3ead8] px-6 text-center text-[#17120f]">
      <div>
        <div className="mx-auto mb-5 h-14 w-14 rotate-12 border-4 border-[#17120f]/15 border-t-[#e84b16]" aria-hidden="true" />
        <p className="font-extrabold">Bringing Ibadan into view</p>
        <p className="mt-2 text-sm text-[#17120f]/65">Loading the interactive map…</p>
      </div>
    </div>
  );
}

const VenueMap = dynamic(() => import("@/components/venue/venue-map"), {
  ssr: false,
  loading: MapLoading,
});

export function VenueExplorer({ venue, destination }: { venue: string; destination: Coordinates | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "250px" });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="venue-explorer overflow-hidden rounded-[1.5rem] border border-[#fff7e7]/15">
      {visible ? <VenueMap venue={venue} destination={destination} /> : <MapLoading />}
    </div>
  );
}
