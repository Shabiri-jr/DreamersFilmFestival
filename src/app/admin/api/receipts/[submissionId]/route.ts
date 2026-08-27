import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role === "gate_staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { submissionId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: submission, error } = await supabase
    .from("payment_submissions")
    .select("receipt_path")
    .eq("id", submissionId)
    .maybeSingle();
  if (error || !submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const extension = submission.receipt_path.split(".").pop()?.toLowerCase();
  if (!extension || !(extension in CONTENT_TYPES)) {
    return NextResponse.json({ error: "Receipt unavailable" }, { status: 404 });
  }
  const adminClient = createAdminClient();
  const { data: receipt, error: downloadError } = await adminClient.storage
    .from("payment-receipts")
    .download(submission.receipt_path);
  if (downloadError || !receipt) {
    return NextResponse.json({ error: "Receipt unavailable" }, { status: 404 });
  }

  return new Response(await receipt.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename="payment-receipt.${extension}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": CONTENT_TYPES[extension as keyof typeof CONTENT_TYPES],
      "X-Content-Type-Options": "nosniff",
    },
  });
}
