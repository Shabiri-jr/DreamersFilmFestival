import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getOrderAccessSecret } from "@/lib/env/server";

const ORDER_ACCESS_WINDOW_SECONDS = 60 * 60 * 24 * 7;
const ORDER_NUMBER_PATTERN = /^DFF-[A-Z0-9]{6,12}$/;

type OrderAccessPayload = Readonly<{
  version: 1;
  orderNumber: string;
  issuedAt: number;
  expiresAt: number;
}>;

function cookieName(orderNumber: string): string {
  return `dreamers_order_${orderNumber.toLowerCase()}`;
}

function sign(payload: string, secret: string): string {
  if (secret.length < 32) {
    throw new Error("Order access secret must be at least 32 characters.");
  }

  return createHmac("sha256", secret)
    .update(`dreamers-order-access:${payload}`)
    .digest("base64url");
}

export function createOrderAccessToken(
  orderNumber: string,
  secret: string,
  now = new Date(),
): string {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    throw new Error("Order number is invalid.");
  }

  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: OrderAccessPayload = {
    version: 1,
    orderNumber,
    issuedAt,
    expiresAt: issuedAt + ORDER_ACCESS_WINDOW_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyOrderAccessToken(
  token: string,
  expectedOrderNumber: string,
  secret: string,
  now = new Date(),
): boolean {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return false;

  const expectedSignature = sign(encoded, secret);
  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<OrderAccessPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);
    return (
      payload.version === 1 &&
      payload.orderNumber === expectedOrderNumber &&
      typeof payload.issuedAt === "number" &&
      typeof payload.expiresAt === "number" &&
      payload.issuedAt <= nowSeconds &&
      payload.expiresAt > nowSeconds
    );
  } catch {
    return false;
  }
}

export async function grantOrderAccess(orderNumber: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    cookieName(orderNumber),
    createOrderAccessToken(orderNumber, getOrderAccessSecret()),
    {
      httpOnly: true,
      maxAge: ORDER_ACCESS_WINDOW_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function hasOrderAccess(orderNumber: string): Promise<boolean> {
  const token = (await cookies()).get(cookieName(orderNumber))?.value;
  return token
    ? verifyOrderAccessToken(token, orderNumber, getOrderAccessSecret())
    : false;
}
