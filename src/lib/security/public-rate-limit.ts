import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { getOrderAccessSecret } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function allowPublicTicketValidation(): Promise<boolean> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const keyHash = createHmac("sha256", getOrderAccessSecret())
    .update(`public-ticket-validation:${clientKey}`, "utf8")
    .digest("hex");
  const { error } = await createAdminClient().rpc(
    "record_public_validation_request",
    { p_key_hash: keyHash },
  );
  return !error;
}
