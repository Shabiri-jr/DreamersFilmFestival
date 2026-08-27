import "server-only";

import path from "node:path";

import QRCode from "qrcode";
import sharp, { type OverlayOptions } from "sharp";

import type { DigitalPass } from "@/lib/tickets/data";
import { admissionLabel } from "@/lib/tickets/presentation";

const PASS_FONT_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "fonts",
  "Manrope-Variable.ttf",
);

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

type PassTextLayer = {
  text: string;
  left: number;
  top: number;
  maxWidth: number;
  fontSize: number;
  color: string;
  weight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
};

async function renderTextLayer({
  text,
  left,
  top,
  maxWidth,
  fontSize,
  color,
  weight = 400,
  letterSpacing = 0,
  align = "left",
}: PassTextLayer): Promise<OverlayOptions> {
  const spacing = letterSpacing
    ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"`
    : "";
  const markup = `<span foreground="${color}" weight="${weight}"${spacing}>${escapeXml(text)}</span>`;
  let input = await sharp({
    text: {
      text: markup,
      font: `Manrope ${fontSize}`,
      fontfile: PASS_FONT_PATH,
      dpi: 72,
      rgba: true,
    },
  })
    .png()
    .toBuffer();

  let metadata = await sharp(input).metadata();
  if ((metadata.width ?? 0) > maxWidth) {
    input = await sharp(input)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png()
      .toBuffer();
    metadata = await sharp(input).metadata();
  }

  const renderedWidth = metadata.width ?? maxWidth;
  const horizontalOffset =
    align === "center"
      ? Math.round((maxWidth - renderedWidth) / 2)
      : align === "right"
        ? maxWidth - renderedWidth
        : 0;

  return {
    input,
    left: left + horizontalOffset,
    top,
  };
}

export async function renderPassPng(pass: DigitalPass): Promise<Buffer> {
  const qr = await QRCode.toBuffer(pass.qrValidationUrl, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 760,
    color: { dark: "#17120fff", light: "#fff7e7ff" },
  });
  const isCancelled = pass.status === "cancelled";
  const venueLines = wrapText(pass.venue);
  const baseSvg = `
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
    <rect x="72" y="718" width="1056" height="846" rx="40" fill="#fff7e7"/>
    <image href="data:image/png;base64,${qr.toString("base64")}" x="250" y="750" width="700" height="700"/>
    <rect x="930" y="1604" width="198" height="76" rx="38" fill="${isCancelled ? "#a91f14" : "#086544"}"/>
  </svg>`;

  const textLayers: PassTextLayer[] = [
    {
      text: "THE DREAMERS FILM FESTIVAL",
      left: 92,
      top: 78,
      maxWidth: 1016,
      fontSize: 27,
      color: "#fff7e7",
      weight: 800,
      letterSpacing: 8,
    },
    {
      text: "DREAMERS",
      left: 92,
      top: 138,
      maxWidth: 1016,
      fontSize: 132,
      color: "#fff7e7",
      weight: 800,
      letterSpacing: 2,
    },
    {
      text: "PASS",
      left: 92,
      top: 263,
      maxWidth: 1016,
      fontSize: 132,
      color: "#17120f",
      weight: 800,
      letterSpacing: 11,
    },
    {
      text: pass.ticketTypeName.toUpperCase(),
      left: 92,
      top: 570,
      maxWidth: 1016,
      fontSize: 34,
      color: "#fff7e7",
      weight: 800,
      letterSpacing: 9,
    },
    {
      text: pass.ticketCode,
      left: 112,
      top: 1457,
      maxWidth: 976,
      fontSize: 38,
      color: "#17120f",
      weight: 800,
      letterSpacing: 3,
      align: "center",
    },
    {
      text: "HOLDER",
      left: 112,
      top: 1608,
      maxWidth: 450,
      fontSize: 24,
      color: "#eaa42c",
      weight: 800,
      letterSpacing: 5,
    },
    {
      text: pass.holderName,
      left: 112,
      top: 1648,
      maxWidth: 450,
      fontSize: 38,
      color: "#fff7e7",
      weight: 800,
    },
    {
      text: "ADMISSION",
      left: 650,
      top: 1608,
      maxWidth: 250,
      fontSize: 24,
      color: "#eaa42c",
      weight: 800,
      letterSpacing: 5,
    },
    {
      text: admissionLabel(pass.admissionCount, pass.ticketTypeName),
      left: 650,
      top: 1648,
      maxWidth: 250,
      fontSize: 38,
      color: "#fff7e7",
      weight: 800,
    },
    {
      text: `${pass.eventDate} · ${pass.eventTime}`,
      left: 112,
      top: 1725,
      maxWidth: 800,
      fontSize: 27,
      color: "#b9b0a1",
    },
    {
      text: isCancelled ? "CANCELLED" : "VALID",
      left: 930,
      top: 1624,
      maxWidth: 198,
      fontSize: 28,
      color: "#fff7e7",
      weight: 800,
      letterSpacing: 3,
      align: "center",
    },
    ...venueLines.map(
      (line, index): PassTextLayer => ({
        text: line,
        left: 112,
        top: 1776 + index * 34,
        maxWidth: 850,
        fontSize: 24,
        color: "#8f887d",
      }),
    ),
  ];
  const textOverlays = await Promise.all(textLayers.map(renderTextLayer));

  return sharp(Buffer.from(baseSvg))
    .composite(textOverlays)
    .png({ compressionLevel: 9 })
    .toBuffer();
}
