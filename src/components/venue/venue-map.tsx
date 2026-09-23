"use client";

import { ArrowUpRight, Crosshair, MapPin, NavigationArrow, Pause, Stack } from "@phosphor-icons/react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

import { useLiveLocation } from "@/components/venue/use-live-location";
import type { VenueLandmark } from "@/lib/venue/landmarks";
import { distanceMetres, formatDistance, googleMapsUrl, IBADAN_OVERVIEW, parseDrivingRoute, type Coordinates, type DrivingRoute } from "@/lib/venue/location";

const EMPTY_ROUTE = { type: "FeatureCollection" as const, features: [] };
maplibregl.setWorkerUrl(`/maps/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
let nextRouteRequestAt = 0;

function markerElement(className: string, label: string) {
  const element = document.createElement("div");
  element.className = className;
  const text = document.createElement("span");
  text.textContent = label;
  element.append(text);
  return element;
}

function fitLandmarks(instance: maplibregl.Map, destination: Coordinates, landmarks: VenueLandmark[], duration: number) {
  const bounds = new maplibregl.LngLatBounds(destination, destination);
  landmarks.forEach((landmark) => bounds.extend(landmark.coordinates));
  instance.fitBounds(bounds, { padding: { top: 100, bottom: 140, left: 36, right: 36 }, maxZoom: 16, duration });
}

export default function VenueMap({ venue, destination, landmarks }: { venue: string; destination: Coordinates | null; landmarks: VenueLandmark[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const landmarkPopups = useRef(new Map<string, maplibregl.Popup>());
  const follow = useRef(true);
  const [following, setFollowing] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pitched, setPitched] = useState(true);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeMessage, setRouteMessage] = useState("");
  const [routePending, setRoutePending] = useState(false);
  const location = useLiveLocation();
  const positionRef = useRef(location.position);
  const longitude = destination?.[0];
  const latitude = destination?.[1];
  const mapsUrl = googleMapsUrl(venue, destination);

  useEffect(() => {
    if (!container.current) return;
    const popups = landmarkPopups.current;
    let disposed = false;
    let instance: maplibregl.Map;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const centre: Coordinates = longitude !== undefined && latitude !== undefined
      ? [longitude, latitude] : IBADAN_OVERVIEW;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: "/maps/dreamers.json",
        center: centre,
        zoom: longitude !== undefined ? 16 : 11,
        pitch: reducedMotion ? 0 : 52,
        bearing: -22,
        maxPitch: 65,
        maxZoom: 19,
        cooperativeGestures: true,
        attributionControl: false,
        canvasContextAttributes: { antialias: false },
      });
    } catch {
      // Schedule outside the effect body, just like the asynchronous map events.
      queueMicrotask(() => { if (!disposed) setFailed(true); });
      return () => { disposed = true; };
    }
    map.current = instance;
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    instance.getCanvas().setAttribute("aria-label", "Interactive street map of the festival venue. Use arrow keys to pan and plus or minus to zoom.");
    const timeout = window.setTimeout(() => { if (!disposed) setFailed(true); }, 20_000);
    instance.on("load", () => {
      if (disposed) return;
      window.clearTimeout(timeout);
      instance.addSource("journey", { type: "geojson", data: EMPTY_ROUTE });
      const before = instance.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      instance.addLayer({ id: "journey-outline", type: "line", source: "journey", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#fff7e7", "line-width": 10 } }, before);
      instance.addLayer({ id: "journey-route", type: "line", source: "journey", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#e84b16", "line-width": 6 } }, before);
      if (longitude !== undefined) {
        const destinationElement = markerElement("venue-destination", "The Dreamers Hub");
        const updateDestinationLabel = () => destinationElement.classList.toggle("venue-destination-overview", instance.getZoom() < 15);
        updateDestinationLabel();
        instance.on("zoomend", updateDestinationLabel);
        new maplibregl.Marker({ element: destinationElement, anchor: "bottom" })
          .setLngLat(centre).addTo(instance);
      }
      const markers: maplibregl.Marker[] = [];
      for (const [index, landmark] of landmarks.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "venue-landmark";
        button.setAttribute("aria-label", `View landmark: ${landmark.name}`);
        button.setAttribute("aria-haspopup", "dialog");
        const number = document.createElement("span");
        number.className = "venue-landmark-number";
        number.textContent = String(index + 1);
        const label = document.createElement("span");
        label.className = "venue-landmark-label";
        label.textContent = landmark.shortName;
        button.append(number, label);

        const content = document.createElement("div");
        const heading = document.createElement("h4");
        heading.textContent = landmark.name;
        const description = document.createElement("p");
        description.textContent = "Nearby landmark for finding The Dreamers Hub.";
        const link = document.createElement("a");
        link.href = landmark.mapsUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View landmark in Google Maps";
        content.append(heading, description, link);
        const popup = new maplibregl.Popup({ className: "venue-landmark-popup", offset: 50, maxWidth: "260px" })
          .setLngLat(landmark.coordinates).setDOMContent(content);
        popup.on("open", () => {
          const element = popup.getElement();
          element.setAttribute("role", "dialog");
          element.setAttribute("aria-label", landmark.name);
          element.onkeydown = (event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              popup.remove();
              button.focus({ preventScroll: true });
            }
          };
        });
        popups.set(landmark.id, popup);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          follow.current = false;
          setFollowing(false);
          popups.forEach((item) => item.remove());
          popup.addTo(instance);
        });
        markers.push(new maplibregl.Marker({ element: button, anchor: "bottom" })
          .setLngLat(landmark.coordinates).addTo(instance));
      }
      if (longitude !== undefined && landmarks.length > 0) {
        fitLandmarks(instance, centre, landmarks, 0);
      }
      instance.once("remove", () => markers.forEach((marker) => marker.remove()));
      setPitched(instance.getPitch() > 10);
      setReady(true);
      setFailed(false);
    });
    // A failed tile may recover; only show the fallback when no data can load.
    instance.on("error", () => {
      if (!disposed && !instance.isStyleLoaded()) setFailed(true);
    });
    instance.on("webglcontextlost", () => { if (!disposed) setFailed(true); });
    instance.on("pitchend", () => { if (!disposed) setPitched(instance.getPitch() > 10); });
    instance.on("dragstart", (event) => {
      if (event.originalEvent) {
        follow.current = false;
        setFollowing(false);
      }
    });
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(container.current);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      resize.disconnect();
      userMarker.current?.remove();
      userMarker.current = null;
      popups.forEach((popup) => popup.remove());
      popups.clear();
      instance.remove();
      map.current = null;
    };
  }, [longitude, latitude, landmarks, attempt]);

  useEffect(() => {
    positionRef.current = location.position;
    const instance = map.current;
    if (!ready || !instance) return;
    if (!location.position) {
      userMarker.current?.remove();
      userMarker.current = null;
      (instance.getSource("journey") as GeoJSONSource | undefined)?.setData(EMPTY_ROUTE);
      return;
    }
    if (!userMarker.current) {
      userMarker.current = new maplibregl.Marker({ element: markerElement("venue-user", "You"), anchor: "center" })
        .setLngLat(location.position.coordinates).addTo(instance);
    }
    userMarker.current.setLngLat(location.position.coordinates);
    if (follow.current) instance.easeTo({ center: location.position.coordinates, duration: 800 });
  }, [location.position, ready]);

  const hasPosition = !!location.position;
  useEffect(() => {
    if (!hasPosition || !ready || longitude === undefined || latitude === undefined) return;
    let active = true;
    let controller: AbortController | null = null;
    let lastOrigin: Coordinates | null = null;
    let fitted = false;
    async function updateRoute() {
      const current = positionRef.current;
      if (!active || !current || document.hidden || current.accuracy > 100) return;
      if (lastOrigin && distanceMetres(lastOrigin, current.coordinates) < 40) return;
      if (Date.now() < nextRouteRequestAt) return;
      nextRouteRequestAt = Date.now() + 1_000;
      controller?.abort();
      controller = new AbortController();
      const requestTimeout = window.setTimeout(() => controller?.abort(), 12_000);
      setRoutePending(true);
      try {
        const origin = current.coordinates;
        const response = await fetch(
          `https://routing.openstreetmap.de/routed-car/route/v1/driving/${origin.join(",")};${longitude},${latitude}?overview=full&geometries=geojson&steps=false`,
          { signal: controller.signal, referrerPolicy: "strict-origin-when-cross-origin" },
        );
        if (!response.ok) throw new Error("Route service unavailable");
        const result = parseDrivingRoute(await response.json());
        if (!result) throw new Error("No road route found");
        if (!active) return;
        lastOrigin = origin;
        setRoute(result);
        setRouteMessage("");
        const instance = map.current;
        (instance?.getSource("journey") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: result.geometry });
        if (instance && !fitted && follow.current) {
          const bounds = new maplibregl.LngLatBounds();
          result.geometry.coordinates.forEach((point) => bounds.extend(point));
          instance.fitBounds(bounds, { padding: 85, maxZoom: 16, duration: 900 });
          fitted = true;
        }
      } catch {
        if (!active) return;
        setRoute(null);
        setRouteMessage("We couldn’t load a driving route. Open Google Maps for directions.");
        (map.current?.getSource("journey") as GeoJSONSource | undefined)?.setData(EMPTY_ROUTE);
      } finally {
        window.clearTimeout(requestTimeout);
        if (active) setRoutePending(false);
      }
    }
    const initialRequest = window.setTimeout(() => { void updateRoute(); }, Math.max(0, nextRouteRequestAt - Date.now()));
    // Respect the public routing service: refresh at most once every 30 seconds,
    // and only after meaningful movement. GPS marker updates remain independent.
    const timer = window.setInterval(() => { void updateRoute(); }, 30_000);
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(initialRequest);
      window.clearInterval(timer);
    };
  }, [hasPosition, ready, longitude, latitude]);

  function showDestination() {
    follow.current = false;
    setFollowing(false);
    landmarkPopups.current.forEach((popup) => popup.remove());
    map.current?.easeTo({ center: destination ?? IBADAN_OVERVIEW, zoom: destination ? 16 : 11, duration: 900 });
  }

  function showAllLandmarks() {
    if (!map.current) return;
    follow.current = false;
    setFollowing(false);
    landmarkPopups.current.forEach((popup) => popup.remove());
    fitLandmarks(map.current, destination ?? IBADAN_OVERVIEW, landmarks, 800);
  }

  function followLocation() {
    follow.current = true;
    setFollowing(true);
    if (location.position) map.current?.easeTo({ center: location.position.coordinates, zoom: 16, duration: 800 });
  }

  function showLandmark(landmark: VenueLandmark) {
    const instance = map.current;
    if (!instance) return;
    follow.current = false;
    setFollowing(false);
    landmarkPopups.current.forEach((popup) => popup.remove());
    instance.easeTo({ center: landmark.coordinates, zoom: 16, duration: 800 });
    landmarkPopups.current.get(landmark.id)?.addTo(instance);
    container.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const activeRoute = location.position && location.position.accuracy <= 100 ? route : null;

  return (
    <div className="grid bg-[#fff7e7] text-[#17120f] lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="relative isolate min-h-[28rem] bg-[#f3ead8] sm:min-h-[36rem]">
        <div ref={container} className="venue-map-canvas absolute inset-0" />
        <div className="pointer-events-none absolute top-4 left-4 max-w-[calc(100%-6rem)] rounded-full border border-[#17120f]/10 bg-[#fff7e7]/95 px-4 py-2 text-[0.65rem] font-extrabold tracking-[0.14em] uppercase shadow-sm">
          {destination ? <><span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-[#e84b16]" />The Dreamers Hub · Ibadan</> : "Ibadan · Area overview"}
        </div>
        {!ready && !failed && (
          <div role="status" className="absolute inset-0 grid place-items-center bg-[#f3ead8]">
            <div className="text-center"><MapPin size={36} className="mx-auto mb-3 text-[#e84b16]" /><p className="font-extrabold">Bringing the streets into view…</p></div>
          </div>
        )}
        {failed && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center bg-[#f3ead8] p-8 text-center">
            <MapPin size={42} weight="duotone" className="text-[#e84b16]" />
            <h3 className="mt-4 text-xl font-extrabold">The map couldn’t load</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#17120f]/65">Check your connection or open the venue directly in Google Maps.</p>
            <button type="button" className="venue-control mt-5" onClick={() => { setReady(false); setFailed(false); setAttempt((value) => value + 1); }}>Try again</button>
          </div>
        )}
        {ready && !failed && (
          <div className="absolute right-4 bottom-12 left-4 flex flex-wrap gap-2">
            <button type="button" className="venue-control" onClick={() => map.current?.jumpTo({ pitch: pitched ? 0 : 52, bearing: pitched ? 0 : -22 })}><Stack size={18} weight="bold" />{pitched ? "2D view" : "3D view"}</button>
            <button type="button" className="venue-control" onClick={showDestination}><MapPin size={18} weight="bold" />{destination ? "Venue" : "Ibadan"}</button>
            <button type="button" className="venue-control" onClick={showAllLandmarks}>Landmarks</button>
            {location.position && <button type="button" className="venue-control" aria-pressed={following} onClick={followLocation}><Crosshair size={18} weight="bold" />Follow me</button>}
          </div>
        )}
      </div>

      <div className="flex flex-col border-t border-[#17120f]/10 p-6 sm:p-8 lg:border-t-0 lg:border-l">
        <p className="section-eyebrow">The destination</p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-[0.9] font-extrabold uppercase">See you<br />at the Hub.</h3>
        <p className="mt-5 text-sm leading-7 text-[#17120f]/70">{venue}</p>

        <div className="mt-5">
          <h4 className="text-[0.65rem] font-extrabold tracking-[0.15em] text-[#17120f]/55 uppercase">Nearby landmarks</h4>
          {landmarks.map((landmark, index) => (
            <button key={landmark.id} type="button" aria-haspopup="dialog" onClick={() => showLandmark(landmark)} disabled={!ready || failed} className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-lg text-left text-sm font-extrabold text-[#086544] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#086544] disabled:opacity-50">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[#086544]/10 text-xs">{index + 1}</span><span className="min-w-0 wrap-anywhere">{landmark.shortName}</span>
            </button>
          ))}
        </div>

        <div className="my-7 border-y border-[#17120f]/12 py-5">
          <p className="text-[0.65rem] font-extrabold tracking-[0.15em] text-[#17120f]/55 uppercase">{activeRoute ? "Your driving route" : "Find your way"}</p>
          {activeRoute ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="font-[family-name:var(--font-display)] text-4xl">{formatDistance(activeRoute.distance)}</strong><span className="text-sm font-bold">about {Math.max(1, Math.ceil(activeRoute.duration / 60))} min</span></p>
          ) : <p className="mt-2 font-bold">{destination ? "Your story starts here." : "Entrance pin coming soon."}</p>}
          <p role="status" className="mt-3 text-xs leading-6 text-[#17120f]/65">{location.message}</p>
          {location.position && <p className="mt-1 text-xs text-[#17120f]/55">GPS accuracy: approximately {Math.round(location.position.accuracy)} m</p>}
          {location.position && <p role="status" className="mt-2 text-xs leading-5 text-[#17120f]/65">{routePending ? "Updating your driving route…" : routeMessage || (activeRoute ? "Estimate without live traffic. Refreshes as you move." : "")}</p>}
        </div>

        <button type="button" className="dark-cta w-full justify-between disabled:opacity-45" disabled={!location.enabled && (!ready || failed)} onClick={() => { follow.current = true; setFollowing(true); setRoute(null); setRouteMessage(""); location.toggleLocation(); }}>
          {location.enabled ? "Stop location" : "Use my location"}
          <span className="cta-icon bg-white/10">{location.enabled ? <Pause size={18} weight="bold" /> : <NavigationArrow size={18} weight="bold" />}</span>
        </button>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-full border border-[#17120f]/20 px-5 text-sm font-extrabold transition-colors hover:bg-[#f3ead8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#086544]">
          {destination ? "Open Google Maps" : "Search Google Maps"}<ArrowUpRight size={18} weight="bold" />
        </a>
        <p className="mt-4 text-[0.7rem] leading-5 text-[#17120f]/60">Allow location to see yourself move. Your position is shared with the routing service to find a driving route. Stop at any time.</p>
        <div className="mt-auto pt-7 text-[0.65rem] leading-5 text-[#17120f]/55">
          <p>Driving route preview. Use Google Maps for spoken directions.</p>
          <p className="mt-2"><a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer" className="underline">Routing by FOSSGIS</a>{" · "}<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer" className="underline">Improve the map</a></p>
        </div>
      </div>
    </div>
  );
}
