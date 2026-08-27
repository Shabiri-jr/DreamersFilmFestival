export default function CheckInLoading() {
  return (
    <main id="main-content" className="grid min-h-[100dvh] place-items-center bg-[#17120f] px-4 text-[#fff7e7]">
      <div role="status" className="w-full max-w-sm rounded-[1.75rem] border border-[#fff7e7]/12 bg-[#fff7e7]/5 p-6 text-center">
        <div className="mx-auto size-10 animate-pulse rounded-full bg-[#e84b16] motion-reduce:animate-none" />
        <p className="mt-5 text-lg font-extrabold">Preparing secure gate access…</p>
        <p className="mt-2 text-sm text-[#fff7e7]/50">Loading live attendance and staff permissions.</p>
      </div>
    </main>
  );
}
