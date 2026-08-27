export function RouteLoading({ label }: { label: string }) {
  return (
    <main id="main-content" className="min-h-[100dvh] bg-[#f3ead8] px-4 py-24 text-[#17120f] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px]" role="status" aria-label={label}>
        <div className="h-3 w-36 animate-pulse rounded-full bg-[#e84b16]/30" />
        <div className="mt-5 h-16 max-w-2xl animate-pulse rounded-2xl bg-[#17120f]/8" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-[2rem] bg-[#17120f]/7" />
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </main>
  );
}

