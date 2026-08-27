import { getDigitalPass } from "@/lib/tickets/data";
import { renderPassPng } from "@/lib/tickets/png";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicAccessToken: string }> },
) {
  const { publicAccessToken } = await params;
  const pass = await getDigitalPass(publicAccessToken);
  if (!pass) return new Response("Not found", { status: 404 });
  const png = await renderPassPng(pass);
  return new Response(new Uint8Array(png), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${pass.ticketCode}.png"`,
      "Content-Type": "image/png",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
