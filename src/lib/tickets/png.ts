import "server-only";

import QRCode from "qrcode";
import sharp from "sharp";

import type { DigitalPass } from "@/lib/tickets/data";
import { admissionLabel } from "@/lib/tickets/presentation";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, max = 34): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export async function renderPassPng(pass: DigitalPass): Promise<Buffer> {
  const qr = await QRCode.toBuffer(pass.qrValidationUrl, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 760,
    color: { dark: "#17120fff", light: "#fff7e7ff" },
  });
  const venueLines = wrapText(pass.venue).map(
    (line, index) =>
      `<tspan x="112" dy="${index === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`,
  );
  const isCancelled = pass.status === "cancelled";
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1920" viewBox="0 0 1200 1920">
    <defs>
      <pattern id="motif" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0H72V72H0Z M18 18H54V54H18Z" fill="none" stroke="#fff7e7" stroke-opacity=".08" stroke-width="4"/>
      </pattern>
      <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e84b16"/><stop offset="1" stop-color="#9d2a0d"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1920" rx="58" fill="#17120f"/>
    <rect width="1200" height="520" rx="58" fill="url(#sun)"/>
    <rect width="1200" height="520" rx="58" fill="url(#motif)"/>
    <path d="M0 470C290 560 760 410 1200 520V690H0Z" fill="#086544"/>
    <text x="92" y="110" fill="#fff7e7" font-family="sans-serif" font-size="27" font-weight="800" letter-spacing="8">THE DREAMERS FILM FESTIVAL</text>
    <text x="92" y="265" fill="#fff7e7" font-family="sans-serif" font-size="132" font-weight="900" letter-spacing="2">DREAMERS</text>
    <text x="92" y="385" fill="#17120f" font-family="sans-serif" font-size="132" font-weight="900" letter-spacing="11">PASS</text>
    <text x="92" y="610" fill="#fff7e7" font-family="sans-serif" font-size="34" font-weight="800" letter-spacing="9">${escapeXml(pass.ticketTypeName.toUpperCase())}</text>
    <rect x="72" y="718" width="1056" height="846" rx="40" fill="#fff7e7"/>
    <image href="data:image/png;base64,${qr.toString("base64")}" x="250" y="750" width="700" height="700"/>
    <text x="600" y="1498" text-anchor="middle" fill="#17120f" font-family="monospace" font-size="38" font-weight="800" letter-spacing="3">${escapeXml(pass.ticketCode)}</text>
    <text x="112" y="1640" fill="#eaa42c" font-family="sans-serif" font-size="24" font-weight="800" letter-spacing="5">HOLDER</text>
    <text x="112" y="1684" fill="#fff7e7" font-family="sans-serif" font-size="38" font-weight="800">${escapeXml(pass.holderName)}</text>
    <text x="650" y="1640" fill="#eaa42c" font-family="sans-serif" font-size="24" font-weight="800" letter-spacing="5">ADMISSION</text>
    <text x="650" y="1684" fill="#fff7e7" font-family="sans-serif" font-size="38" font-weight="800">${escapeXml(admissionLabel(pass.admissionCount, pass.ticketTypeName))}</text>
    <text x="112" y="1760" fill="#fff7e7" fill-opacity=".72" font-family="sans-serif" font-size="27">${escapeXml(`${pass.eventDate} · ${pass.eventTime}`)}</text>
    <text x="112" y="1810" fill="#fff7e7" fill-opacity=".58" font-family="sans-serif" font-size="24">${venueLines.join("")}</text>
    <rect x="930" y="1604" width="198" height="76" rx="38" fill="${isCancelled ? "#a91f14" : "#086544"}"/>
    <text x="1029" y="1653" text-anchor="middle" fill="#fff7e7" font-family="sans-serif" font-size="28" font-weight="900" letter-spacing="3">${isCancelled ? "CANCELLED" : "VALID"}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
