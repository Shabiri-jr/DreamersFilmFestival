"use client";

import {
  ArrowClockwise,
  Camera,
  CheckCircle,
  MagnifyingGlass,
  Prohibit,
  SignOut,
  Ticket,
  WarningCircle,
  WifiHigh,
  WifiSlash,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { logoutAdmin } from "@/lib/admin/actions";
import {
  redeemGateTicketAction,
  searchGateTicketsAction,
  validateGateCredentialAction,
} from "@/lib/check-in/actions";
import type {
  CheckInSource,
  GateDashboard,
  GateTicketResult,
} from "@/types/domain";

type CameraState = "idle" | "requesting" | "scanning" | "denied" | "unavailable" | "error";

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function connectionSnapshot() {
  return navigator.onLine;
}

function formatCheckedInAt(value: string | null): string {
  if (!value) return "Time unavailable";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function admissionText(count: number | null): string {
  return `Admits ${count ?? 0} ${count === 1 ? "person" : "people"}`;
}

function ResultIcon({ outcome }: { outcome: GateTicketResult["outcome"] }) {
  if (outcome === "valid" || outcome === "checked_in") {
    return <CheckCircle size={34} weight="fill" />;
  }
  if (outcome === "cancelled") return <Prohibit size={34} weight="fill" />;
  return <WarningCircle size={34} weight="fill" />;
}

function outcomeCopy(result: GateTicketResult) {
  switch (result.outcome) {
    case "valid":
      return { title: "Valid ticket", detail: "Confirm the holder and admission count before entry.", tone: "green" } as const;
    case "checked_in":
      return { title: "Entry confirmed", detail: `${admissionText(result.admissionCount)} checked in successfully.`, tone: "green" } as const;
    case "already_used":
      return { title: "Already checked in", detail: `Used ${formatCheckedInAt(result.checkedInAt)}${result.checkedInByName ? ` by ${result.checkedInByName}` : ""}.`, tone: "amber" } as const;
    case "cancelled":
      return { title: "Cancelled ticket", detail: "Do not admit this credential.", tone: "red" } as const;
    default:
      return { title: "Ticket not recognized", detail: "Try scanning again or search by ticket code, name, order, or phone.", tone: "red" } as const;
  }
}

function TicketResultCard({
  result,
  onSelect,
  compact = false,
}: {
  result: GateTicketResult;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const copy = outcomeCopy(result);
  const tone = copy.tone === "green"
    ? "border-[#6ed3a7]/35 bg-[#086544]/20 text-[#d9ffec]"
    : copy.tone === "amber"
      ? "border-[#eaa42c]/35 bg-[#eaa42c]/12 text-[#fff1c9]"
      : "border-[#ff8b6b]/35 bg-[#a91f14]/18 text-[#ffe4dc]";
  return (
    <article className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0" aria-hidden="true"><ResultIcon outcome={result.outcome} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 opacity-75">{copy.detail}</p>
        </div>
      </div>
      {result.ticketId && (
        <dl className={`mt-4 grid gap-3 border-t border-current/15 pt-4 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
          <div><dt className="text-[0.65rem] font-bold tracking-[0.12em] opacity-55 uppercase">Holder</dt><dd className="mt-1 font-extrabold break-words">{result.holderName}</dd></div>
          <div><dt className="text-[0.65rem] font-bold tracking-[0.12em] opacity-55 uppercase">Ticket</dt><dd className="mt-1 font-extrabold">{result.ticketTypeName}</dd></div>
          <div><dt className="text-[0.65rem] font-bold tracking-[0.12em] opacity-55 uppercase">Admission</dt><dd className="mt-1 font-extrabold">{admissionText(result.admissionCount)}</dd></div>
          <div><dt className="text-[0.65rem] font-bold tracking-[0.12em] opacity-55 uppercase">Code</dt><dd className="mt-1 font-mono text-sm font-extrabold break-all">{result.ticketCode}</dd></div>
        </dl>
      )}
      {result.outcome === "valid" && onSelect && (
        <button type="button" onClick={onSelect} className="mt-4 min-h-12 w-full rounded-xl bg-[#fff7e7] px-4 text-sm font-extrabold text-[#17120f] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c]">
          Review for check-in
        </button>
      )}
    </article>
  );
}

export function CheckInConsole({
  initialDashboard,
  staffName,
  showAdminLink,
}: {
  initialDashboard: GateDashboard;
  staffName: string;
  showAdminLink: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ start: () => Promise<void>; stop: () => void; destroy: () => void } | null>(null);
  const scanLockedRef = useRef(false);
  const scanHandlerRef = useRef<(payload: string) => void>(() => undefined);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const online = useSyncExternalStore(
    subscribeToConnection,
    connectionSnapshot,
    () => true,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ result: GateTicketResult; source: CheckInSource } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GateTicketResult[]>([]);

  async function processScan(payload: string) {
    if (scanLockedRef.current) return;
    scanLockedRef.current = true;
    scannerRef.current?.stop();
    setCameraState("idle");
    setBusy(true);
    setError(null);
    const response = await validateGateCredentialAction(payload);
    setBusy(false);
    if (response.error) {
      setError(response.error);
      scanLockedRef.current = false;
      return;
    }
    if (response.result) {
      setSelected({ result: response.result, source: "qr" });
      if (response.result.outcome !== "valid") navigator.vibrate?.(180);
    }
  }
  useEffect(() => {
    scanHandlerRef.current = (payload) => void processScan(payload);
  });

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function startCamera() {
    setError(null);
    setSelected(null);
    setConfirming(false);
    if (!navigator.onLine) {
      setError("Check-in needs an internet connection. Reconnect and try again.");
      return;
    }
    setCameraState("requesting");
    scanLockedRef.current = false;
    try {
      const { default: QrScanner } = await import("qr-scanner");
      if (!(await QrScanner.hasCamera()) || !videoRef.current) {
        setCameraState("unavailable");
        return;
      }
      scannerRef.current?.destroy();
      const scanner = new QrScanner(
        videoRef.current,
        (result) => scanHandlerRef.current(result.data),
        {
          preferredCamera: "environment",
          maxScansPerSecond: 8,
          returnDetailedScanResult: true,
          highlightScanRegion: false,
          highlightCodeOutline: false,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setCameraState("scanning");
    } catch (cameraError) {
      const name = cameraError instanceof DOMException ? cameraError.name : "";
      const message = cameraError instanceof Error ? cameraError.message : String(cameraError);
      let permissionDenied = false;
      try {
        permissionDenied = (await navigator.permissions.query({ name: "camera" as PermissionName })).state === "denied";
      } catch {
        // Safari does not currently expose camera through the Permissions API.
      }
      setCameraState(
        permissionDenied ||
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        /notallowed|permission|denied/i.test(message)
          ? "denied"
          : "error",
      );
    }
  }

  function stopCamera() {
    scannerRef.current?.stop();
    setCameraState("idle");
    scanLockedRef.current = false;
  }

  async function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSelected(null);
    setBusy(true);
    const response = await searchGateTicketsAction(query);
    setBusy(false);
    if (response.error) {
      setError(response.error);
      setSearchResults([]);
      return;
    }
    setSearchResults(response.results ?? []);
  }

  async function confirmCheckIn() {
    if (!selected?.result.ticketId || selected.result.outcome !== "valid") return;
    setBusy(true);
    setError(null);
    const response = await redeemGateTicketAction(selected.result.ticketId, selected.source);
    setBusy(false);
    setConfirming(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    if (response.result) {
      setSelected({ result: response.result, source: selected.source });
      setSearchResults((current) =>
        current.map((item) =>
          item.ticketId === response.result?.ticketId ? response.result : item,
        ),
      );
      if (response.result.outcome === "checked_in") navigator.vibrate?.([80, 40, 120]);
      else navigator.vibrate?.(180);
      router.refresh();
    }
  }

  function resetForNext() {
    setSelected(null);
    setConfirming(false);
    setError(null);
    setSearchResults([]);
    setQuery("");
    scanLockedRef.current = false;
  }

  const cameraMessage = cameraState === "denied"
    ? "Camera access was blocked. Allow camera permission in your browser settings, then retry."
    : cameraState === "unavailable"
      ? "No usable camera was found on this phone. Use manual search below."
      : cameraState === "error"
        ? "The camera could not start. Close other camera apps or use manual search."
        : null;

  return (
    <main id="main-content" className="min-h-[100dvh] bg-[#17120f] text-[#fff7e7]">
      <header className="sticky top-0 z-20 border-b border-[#fff7e7]/10 bg-[#17120f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-[0.06em] uppercase">Dreamers Gate</p>
            <p className="truncate text-xs text-[#fff7e7]/52">Signed in as {staffName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-extrabold ${online ? "bg-[#086544]/28 text-[#9ff0c8]" : "bg-[#a91f14]/25 text-[#ffb09a]"}`}>
              {online ? <WifiHigh size={17} /> : <WifiSlash size={17} />}{online ? "Online" : "Offline"}
            </span>
            {showAdminLink && <Link href="/admin/check-ins" aria-label="Check-in history" className="grid size-11 place-items-center rounded-xl border border-white/15 focus-visible:outline-2 focus-visible:outline-[#eaa42c]"><Ticket size={20} /></Link>}
            <form action={logoutAdmin}><button aria-label="Sign out" className="grid size-11 place-items-center rounded-xl border border-white/15 focus-visible:outline-2 focus-visible:outline-[#eaa42c]"><SignOut size={20} /></button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:py-8">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-[1.75rem] border border-[#fff7e7]/12 bg-black">
            <div className="relative aspect-[4/5] max-h-[62dvh] min-h-[22rem] bg-[#090706] sm:aspect-video">
              <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${cameraState === "scanning" ? "opacity-100" : "opacity-25"}`} />
              {cameraState === "scanning" && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="aspect-square w-[72%] max-w-72 rounded-[2rem] border-2 border-[#eaa42c] shadow-[0_0_0_999px_rgba(23,18,15,0.38)]" />
                </div>
              )}
              {cameraState !== "scanning" && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div>
                    <Camera size={46} className="mx-auto text-[#eaa42c]" />
                    <p className="mt-4 text-lg font-extrabold">{cameraState === "requesting" ? "Starting rear camera…" : "Ready to scan a pass"}</p>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#fff7e7]/55">Camera access starts only when you tap the button below.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-3 bg-[#211a16] p-4 sm:grid-cols-2">
              {cameraState === "scanning" ? (
                <button type="button" onClick={stopCamera} className="min-h-13 rounded-xl border border-[#fff7e7]/18 px-5 font-extrabold uppercase focus-visible:outline-2 focus-visible:outline-[#eaa42c]"><X className="mr-2 inline" size={20} /> Stop camera</button>
              ) : (
                <button type="button" onClick={() => void startCamera()} disabled={busy || cameraState === "requesting" || !online} className="min-h-13 rounded-xl bg-[#e84b16] px-5 font-extrabold uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa42c] disabled:opacity-45"><Camera className="mr-2 inline" size={20} /> {selected ? "Scan next pass" : "Start rear camera"}</button>
              )}
              <p className="self-center text-center text-xs leading-5 text-[#fff7e7]/48 sm:text-left">Use Chrome or Safari over HTTPS. Keep the QR flat and well lit.</p>
            </div>
          </div>

          {!online && <p role="alert" className="mt-4 rounded-2xl border border-[#ff8b6b]/30 bg-[#a91f14]/18 p-4 text-sm font-bold leading-6 text-[#ffe4dc]"><span className="block text-xs tracking-[0.14em] uppercase">Connection required</span><span className="mt-1 block font-normal">Dreamers Pass must reconnect before secure ticket validation or check-in can continue.</span></p>}
          {cameraMessage && <p role="alert" className="mt-4 rounded-2xl border border-[#eaa42c]/25 bg-[#eaa42c]/10 p-4 text-sm leading-6 text-[#fff1c9]">{cameraMessage}</p>}
          {error && <p role="alert" className="mt-4 rounded-2xl border border-[#ff8b6b]/30 bg-[#a91f14]/18 p-4 text-sm font-bold leading-6 text-[#ffe4dc]">{error}</p>}
          {busy && <p role="status" className="mt-4 rounded-2xl border border-[#fff7e7]/12 bg-[#fff7e7]/5 p-4 text-sm font-bold">Checking secure ticket status…</p>}

          {selected && !busy && (
            <div className="mt-4">
              <TicketResultCard result={selected.result} onSelect={() => setConfirming(true)} />
              {selected.result.outcome !== "valid" && (
                <button type="button" onClick={resetForNext} className="mt-3 min-h-12 w-full rounded-xl border border-[#fff7e7]/16 px-4 text-sm font-extrabold uppercase focus-visible:outline-2 focus-visible:outline-[#eaa42c]"><ArrowClockwise className="mr-2 inline" size={19} /> Clear result</button>
              )}
            </div>
          )}

          <section className="mt-5 rounded-[1.75rem] border border-[#fff7e7]/12 bg-[#fff7e7]/5 p-4 sm:p-5">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#eaa42c] uppercase">Manual fallback</p>
            <h2 className="mt-2 text-2xl font-extrabold">Find a ticket</h2>
            <form onSubmit={(event) => void runSearch(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="gate-search">Ticket, order, name, or phone</label>
              <input id="gate-search" value={query} onChange={(event) => setQuery(event.target.value)} minLength={4} maxLength={120} placeholder="Ticket code, name, order, or phone" className="min-h-13 min-w-0 flex-1 rounded-xl border border-[#fff7e7]/18 bg-[#17120f] px-4 text-base text-[#fff7e7] placeholder:text-[#fff7e7]/35 focus-visible:outline-2 focus-visible:outline-[#eaa42c]" />
              <button type="submit" disabled={busy || !online} className="min-h-13 rounded-xl bg-[#fff7e7] px-5 font-extrabold text-[#17120f] uppercase disabled:opacity-45"><MagnifyingGlass className="mr-2 inline" size={20} /> Search</button>
            </form>
            {searchResults.length === 0 && query.length >= 4 && !busy && <p className="mt-4 text-sm text-[#fff7e7]/48">No results loaded. Search uses exact phone matches and bounded ticket, order, or name matches.</p>}
            <div className="mt-4 space-y-3">
              {searchResults.map((result) => <TicketResultCard key={result.ticketId ?? `${result.outcome}-${result.ticketCode}`} result={result} compact onSelect={() => { setSelected({ result, source: "manual" }); setConfirming(true); }} />)}
            </div>
          </section>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[1.75rem] bg-[#fff7e7] p-5 text-[#17120f]">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">Live attendance</p>
            <p className="mt-2 text-sm font-bold">{initialDashboard.eventName}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#086544] p-4 text-white"><p className="text-3xl font-extrabold">{initialDashboard.peopleAdmitted}</p><p className="mt-1 text-xs font-bold text-white/65">People admitted</p></div>
              <div className="rounded-2xl bg-[#17120f] p-4 text-white"><p className="text-3xl font-extrabold">{initialDashboard.passesCheckedIn}</p><p className="mt-1 text-xs font-bold text-white/65">Passes checked</p></div>
              <div className="rounded-2xl bg-[#f3ead8] p-4"><p className="text-3xl font-extrabold">{initialDashboard.passesRemaining}</p><p className="mt-1 text-xs font-bold text-[#17120f]/55">Passes remaining</p></div>
              <div className="rounded-2xl bg-[#f3ead8] p-4"><p className="text-3xl font-extrabold">{initialDashboard.checkInPercentage}%</p><p className="mt-1 text-xs font-bold text-[#17120f]/55">Pass redemption</p></div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#17120f]/10"><div className="h-full rounded-full bg-[#e84b16]" style={{ width: `${Math.min(initialDashboard.checkInPercentage, 100)}%` }} /></div>
            <p className="mt-4 text-xs leading-5 text-[#17120f]/50">{initialDashboard.maximumPotentialAttendance} maximum people represented by issued passes{initialDashboard.venueCapacity ? ` · venue capacity ${initialDashboard.venueCapacity}` : ""}.</p>
          </section>
        </aside>
      </div>

      {confirming && selected?.result.ticketId && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-50 grid items-end bg-black/72 p-3 sm:place-items-center">
          <section className="w-full max-w-md rounded-[1.75rem] bg-[#fff7e7] p-5 text-[#17120f] shadow-2xl sm:p-7">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#e84b16] uppercase">Final confirmation</p>
            <h2 id="confirm-title" className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none font-extrabold uppercase">Admit {selected.result.admissionCount} {selected.result.admissionCount === 1 ? "person" : "people"}?</h2>
            <p className="mt-4 text-sm leading-6 text-[#17120f]/60">This redeems the full {selected.result.ticketTypeName} pass for {selected.result.holderName}. This action cannot be reversed from the gate screen.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setConfirming(false)} className="min-h-13 rounded-xl border border-[#17120f]/16 px-4 font-extrabold uppercase">Go back</button>
              <button type="button" onClick={() => void confirmCheckIn()} disabled={busy} className="min-h-13 rounded-xl bg-[#086544] px-4 font-extrabold text-white uppercase disabled:opacity-45"><CheckCircle className="mr-2 inline" size={21} weight="fill" /> Confirm entry</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
