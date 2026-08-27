export default function OrdersLoading() {
  return <div role="status" className="animate-pulse"><div className="h-12 w-72 max-w-full rounded bg-[#17120f]/10" /><div className="mt-6 h-14 rounded-2xl bg-white" /><div className="mt-4 space-y-3">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 rounded-2xl bg-white" />)}</div><span className="sr-only">Loading payments…</span></div>;
}
