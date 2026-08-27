import { FilmSlate } from "@phosphor-icons/react/ssr";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-[100dvh] place-items-center bg-[#17120f] px-4 py-16 text-[#fff7e7]">
      <div className="max-w-xl text-center">
        <FilmSlate size={50} weight="light" className="mx-auto text-[#e84b16]" />
        <p className="mt-5 text-xs font-extrabold tracking-[0.2em] text-[#eaa42c] uppercase">404 / Missing frame</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-6xl leading-none font-extrabold uppercase">
          This scene is not here.
        </h1>
        <Link href="/" className="primary-cta mt-7">
          Return to the festival
        </Link>
      </div>
    </main>
  );
}

