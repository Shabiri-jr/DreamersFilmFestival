"use client";

import { useEffect, useState } from "react";

import type { Coordinates } from "@/lib/venue/location";

export type LivePosition = { coordinates: Coordinates; accuracy: number };

export function useLiveLocation() {
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [message, setMessage] = useState("Use your location to see yourself on the map.");

  useEffect(() => {
    if (!enabled) return;
    let watch: number | undefined;
    let active = true;
    let generation = 0;
    const stopWatch = () => {
      generation += 1;
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      watch = undefined;
    };
    const startWatch = () => {
      if (document.hidden) return;
      const current = ++generation;
      watch = navigator.geolocation.watchPosition(
        ({ coords }) => {
          if (!active || generation !== current) return;
          setPosition({ coordinates: [coords.longitude, coords.latitude], accuracy: coords.accuracy });
          setMessage(coords.accuracy > 100
            ? "Location is approximate. Move into an open area for a better signal."
            : "Location is live while this page is open.");
        },
        (error) => {
          if (!active || generation !== current) return;
          setPosition(null);
          if (error.code === 1) {
            stopWatch();
            setEnabled(false);
            setMessage("Location access is off. Allow it in your browser settings, then try again.");
          } else {
            setMessage("Waiting for a GPS signal. You can still explore the map or open Google Maps.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
      );
    };
    const onVisibility = () => {
      stopWatch();
      setPosition(null);
      setMessage(document.hidden ? "Location paused while the page is in the background." : "Finding your location…");
      startWatch();
    };
    startWatch();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      stopWatch();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  function toggleLocation() {
    if (enabled) {
      setEnabled(false);
      setPosition(null);
      setMessage("Location stopped. You can continue exploring the map.");
    } else if (!window.isSecureContext || !navigator.geolocation) {
      setMessage("Live location is unavailable in this browser. Open Google Maps for directions.");
    } else {
      setMessage("Finding your location…");
      setEnabled(true);
    }
  }

  return { enabled, position, message, toggleLocation };
}
