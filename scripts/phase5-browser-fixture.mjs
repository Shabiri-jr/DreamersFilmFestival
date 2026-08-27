import { randomBytes, randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createClient } from "@supabase/supabase-js";

const fixturePath = join(tmpdir(), "dreamers-phase5-browser-fixture.json");
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanup(fixture) {
  if (!fixture) return;
  const entityIds = [
    fixture.orderId,
    fixture.submissionId,
    ...(fixture.ticketIds ?? []),
  ].filter(Boolean);
  if (fixture.ticketIds?.length) {
    await service.from("check_ins").delete().in("ticket_id", fixture.ticketIds);
  }
  if (entityIds.length) await service.from("audit_logs").delete().in("entity_id", entityIds);
  if (fixture.orderId) {
    await service.from("tickets").delete().eq("order_id", fixture.orderId);
    await service.from("payment_submissions").delete().eq("order_id", fixture.orderId);
    await service.from("commissions").delete().eq("order_id", fixture.orderId);
    await service.from("orders").delete().eq("id", fixture.orderId);
  }
  const userIds = [fixture.userId, fixture.gateUserId].filter(Boolean);
  if (userIds.length) {
    await service.from("admin_profiles").delete().in("user_id", userIds);
    for (const userId of userIds) await service.auth.admin.deleteUser(userId);
  }
}

if (process.argv[2] === "cleanup") {
  let fixture = null;
  try {
    fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  } catch {}
  await cleanup(fixture);
  await unlink(fixturePath).catch(() => {});
  console.log("PASS Phase 5 browser fixture removed");
  process.exit(0);
}

let fixture = null;
try {
  const suffix = randomBytes(6).toString("hex");
  const email = `phase5-browser-${suffix}@example.test`;
  const password = `Dp!${randomBytes(18).toString("base64url")}`;
  const { data: userData, error: userError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !userData.user) throw userError ?? new Error("Browser staff user failed.");
  fixture = { userId: userData.user.id, email, password };
  const { error: profileError } = await service.from("admin_profiles").insert({
    user_id: userData.user.id,
    name: "Phase 5 Browser Admin",
    email,
    role: "super_admin",
  });
  if (profileError) throw profileError;

  const gateEmail = `phase6-gate-browser-${suffix}@example.test`;
  const gatePassword = `Dp6!${randomBytes(18).toString("base64url")}`;
  const { data: gateUserData, error: gateUserError } = await service.auth.admin.createUser({
    email: gateEmail,
    password: gatePassword,
    email_confirm: true,
  });
  if (gateUserError || !gateUserData.user) throw gateUserError ?? new Error("Browser gate user failed.");
  fixture.gateUserId = gateUserData.user.id;
  fixture.gateEmail = gateEmail;
  fixture.gatePassword = gatePassword;
  const { error: gateProfileError } = await service.from("admin_profiles").insert({
    user_id: gateUserData.user.id,
    name: "Phase 6 Phone Gate Staff",
    email: gateEmail,
    role: "gate_staff",
  });
  if (gateProfileError) throw gateProfileError;

  const staff = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await staff.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { data: ticketType, error: typeError } = await service
    .from("ticket_types")
    .select("id")
    .eq("slug", "network")
    .single();
  if (typeError) throw typeError;
  const { data: order, error: orderError } = await service.rpc("create_customer_order", {
    p_checkout_idempotency_key: randomUUID(),
    p_ticket_type_id: ticketType.id,
    p_quantity: 2,
    p_customer_name: "Temilade Akinola",
    p_phone: "+2348093682647",
    p_email: `ticket-${suffix}@example.test`,
    p_promoter_id: null,
    p_referral_code: null,
    p_referral_source: null,
  });
  if (orderError) throw orderError;
  fixture.orderId = order.id;
  fixture.orderNumber = order.order_number;
  const { data: submission, error: submissionError } = await service.rpc("submit_customer_payment", {
    p_order_id: order.id,
    p_idempotency_key: randomUUID(),
    p_sender_name: "Temilade Akinola",
    p_sender_bank: "Test Bank",
    p_amount_paid: Number(order.total_amount),
    p_payment_reference: `BROWSER-${suffix}`,
    p_payment_date: new Date().toISOString().slice(0, 10),
    p_payment_time: "12:00:00",
    p_receipt_path: `${order.id}/${randomUUID()}.png`,
  });
  if (submissionError) throw submissionError;
  fixture.submissionId = submission.id;
  const { error: verifyError } = await staff.rpc("verify_customer_payment", {
    p_order_id: order.id,
    p_submission_id: submission.id,
  });
  if (verifyError) throw verifyError;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = () => Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join("");
  const credentials = Array.from({ length: 2 }, () => ({
    ticketCode: `DFF-NW-${code()}`,
    qrToken: randomBytes(32).toString("hex"),
    publicAccessToken: randomBytes(32).toString("hex"),
  }));
  const { error: issueError } = await staff.rpc("issue_order_tickets", {
    p_order_id: order.id,
    p_ticket_codes: credentials.map((item) => item.ticketCode),
    p_qr_tokens: credentials.map((item) => item.qrToken),
    p_public_access_tokens: credentials.map((item) => item.publicAccessToken),
  });
  if (issueError) throw issueError;
  const { data: tickets, error: ticketsError } = await service
    .from("tickets")
    .select("id,ticket_code,qr_token,public_access_token")
    .eq("order_id", order.id)
    .order("unit_index");
  if (ticketsError) throw ticketsError;
  fixture.ticketIds = tickets.map((ticket) => ticket.id);
  fixture.tickets = tickets;
  await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  console.log(`PASS Phase 5 browser fixture ready at ${fixturePath}`);
} catch (error) {
  await cleanup(fixture);
  throw error;
}
