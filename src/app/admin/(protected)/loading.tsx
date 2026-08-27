export default function AdminLoading() {
  return <div role="status" className="animate-pulse"><div className="h-3 w-32 rounded bg-[#17120f]/10" /><div className="mt-4 h-14 w-72 max-w-full rounded bg-[#17120f]/10" /><div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 rounded-2xl bg-white" />)}</div><span className="sr-only">Loading admin dashboard…</span></div>;
}
