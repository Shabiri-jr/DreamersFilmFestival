import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

function parseEnvironment(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const environment = parseEnvironment(await readFile(".env.local", "utf8"));
const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = environment.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Supabase environment is incomplete.");

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = randomBytes(6).toString("hex");
const password = `Dp6!${randomBytes(18).toString("base64url")}`;
const userIds = [];
const orderIds = [];
const ticketIds = [];
const submissionIds = [];
const ticketAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomTicketSuffix() {
  return Array.from(randomBytes(6), (byte) => ticketAlphabet[byte % ticketAlphabet.length]).join("");
}

async function createStaff(role) {
  const email = `phase6-${role}-${suffix}@example.test`;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("Staff user was not created.");
  userIds.push(created.user.id);
  const { error: profileError } = await service.from("admin_profiles").insert({
    user_id: created.user.id,
    name: `Phase 6 ${role}`,
    email,
    role,
  });
  if (profileError) throw profileError;
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return client;
}

async function createIssuedTicket(ticketType, paymentAdmin) {
  const { data: order, error: orderError } = await service.rpc("create_customer_order", {
    p_checkout_idempotency_key: randomUUID(),
    p_ticket_type_id: ticketType.id,
    p_quantity: 1,
    p_customer_name: `Phase Six Buyer ${suffix}`,
    p_phone: "+2348093682647",
    p_email: `phase6-buyer-${suffix}@example.test`,
    p_promoter_id: null,
    p_referral_code: null,
    p_referral_source: null,
  });
  if (orderError || !order) throw orderError ?? new Error("Order was not created.");
  orderIds.push(order.id);

  const submissionKey = randomUUID();
  const { data: submission, error: submissionError } = await service.rpc("submit_customer_payment", {
    p_order_id: order.id,
    p_idempotency_key: submissionKey,
    p_sender_name: `Phase Six Buyer ${suffix}`,
    p_sender_bank: "Test Bank",
    p_amount_paid: Number(order.total_amount),
    p_payment_reference: `P6-${suffix}-${orderIds.length}`,
    p_payment_date: new Date().toISOString().slice(0, 10),
    p_payment_time: "12:00:00",
    p_receipt_path: `${order.id}/${randomUUID()}.png`,
  });
  if (submissionError || !submission) throw submissionError ?? new Error("Submission was not created.");
  submissionIds.push(submission.id);
  const { error: verifyError } = await paymentAdmin.rpc("verify_customer_payment", {
    p_order_id: order.id,
    p_submission_id: submission.id,
  });
  if (verifyError) throw verifyError;

  const qrToken = randomBytes(32).toString("hex");
  const prefix = {
    dreamer: "DR",
    "d-shift": "DS",
    network: "NW",
    solo: "SO",
    afatakpa: "AF",
  }[ticketType.slug];
  const ticketCode = `DFF-${prefix}-${randomTicketSuffix()}`;
  const { error: issueError } = await paymentAdmin.rpc("issue_order_tickets", {
    p_order_id: order.id,
    p_ticket_codes: [ticketCode],
    p_qr_tokens: [qrToken],
    p_public_access_tokens: [randomBytes(32).toString("hex")],
  });
  if (issueError) throw issueError;
  const { data: ticket, error: ticketError } = await service
    .from("tickets")
    .select("id,ticket_code,admission_count,status")
    .eq("order_id", order.id)
    .single();
  if (ticketError) throw ticketError;
  ticketIds.push(ticket.id);
  return { order, ticket, qrToken };
}

try {
  const superAdmin = await createStaff("super_admin");
  const paymentAdmin = await createStaff("payment_admin");
  const gateStaff = await createStaff("gate_staff");
  const { data: ticketTypes, error: typeError } = await service
    .from("ticket_types")
    .select("id,name,slug,admissions_per_unit")
    .in("slug", ["dreamer", "network", "afatakpa"]);
  if (typeError) throw typeError;
  const bySlug = new Map(ticketTypes.map((ticketType) => [ticketType.slug, ticketType]));
  const { data: baselineRows, error: baselineError } = await gateStaff.rpc("get_gate_dashboard");
  if (baselineError) throw baselineError;
  const baseline = baselineRows[0];

  const primary = await createIssuedTicket(bySlug.get("network"), paymentAdmin);
  assert.equal(primary.ticket.admission_count, 5);
  const qrHash = createHash("sha256").update(primary.qrToken).digest("hex");

  const { data: validRows, error: validError } = await gateStaff.rpc("validate_gate_ticket", {
    p_qr_token_hash: qrHash,
  });
  assert.ifError(validError);
  assert.equal(validRows[0].outcome, "valid");
  assert.equal(validRows[0].admission_count, 5);
  assert.ok(!("phone" in validRows[0]) && !("email" in validRows[0]));

  const { data: invalidRows, error: invalidError } = await gateStaff.rpc("validate_gate_ticket", {
    p_qr_token_hash: "0".repeat(64),
  });
  assert.ifError(invalidError);
  assert.equal(invalidRows[0].outcome, "invalid");

  const { error: paymentGateError } = await paymentAdmin.rpc("validate_gate_ticket", {
    p_qr_token_hash: qrHash,
  });
  assert.match(paymentGateError?.message ?? "", /gate access/i);

  const { data: manualRows, error: manualError } = await gateStaff.rpc("search_gate_tickets", {
    p_query: primary.ticket.ticket_code,
    p_limit: 20,
  });
  assert.ifError(manualError);
  assert.equal(manualRows[0].ticket_id, primary.ticket.id);
  const { data: phoneRows, error: phoneError } = await gateStaff.rpc("search_gate_tickets", {
    p_query: "08093682647",
    p_limit: 20,
  });
  assert.ifError(phoneError);
  assert.ok(phoneRows.some((row) => row.ticket_id === primary.ticket.id));

  const simultaneous = await Promise.all([
    gateStaff.rpc("redeem_gate_ticket", { p_ticket_id: primary.ticket.id, p_source: "qr" }),
    superAdmin.rpc("redeem_gate_ticket", { p_ticket_id: primary.ticket.id, p_source: "manual" }),
  ]);
  simultaneous.forEach((result) => assert.ifError(result.error));
  const outcomes = simultaneous.map((result) => result.data[0].outcome).sort();
  assert.deepEqual(outcomes, ["already_used", "checked_in"]);

  const { data: checkIns, error: checkInError } = await service
    .from("check_ins")
    .select("ticket_id,admission_count,source,checked_in_at,checked_in_by")
    .eq("ticket_id", primary.ticket.id);
  assert.ifError(checkInError);
  assert.equal(checkIns.length, 1);
  assert.equal(checkIns[0].admission_count, 5);

  const { data: ticketAfter } = await service
    .from("tickets")
    .select("status,checked_in_at,checked_in_by")
    .eq("id", primary.ticket.id)
    .single();
  assert.equal(ticketAfter.status, "checked_in");
  assert.equal(ticketAfter.checked_in_at, checkIns[0].checked_in_at);
  assert.equal(ticketAfter.checked_in_by, checkIns[0].checked_in_by);

  const { data: repeatRows, error: repeatError } = await gateStaff.rpc("redeem_gate_ticket", {
    p_ticket_id: primary.ticket.id,
    p_source: "qr",
  });
  assert.ifError(repeatError);
  assert.equal(repeatRows[0].outcome, "already_used");

  const { data: audits, error: auditError } = await service
    .from("audit_logs")
    .select("action,entity_id,metadata")
    .eq("entity_id", primary.ticket.id)
    .eq("action", "tickets.checked_in");
  assert.ifError(auditError);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].metadata.admission_count, 5);

  const mixedTickets = [];
  for (const slug of ["dreamer", "dreamer", "dreamer", "afatakpa", "network"]) {
    const issued = await createIssuedTicket(bySlug.get(slug), paymentAdmin);
    mixedTickets.push(issued);
    const { data: redemption, error: redemptionError } = await gateStaff.rpc("redeem_gate_ticket", {
      p_ticket_id: issued.ticket.id,
      p_source: "manual",
    });
    assert.ifError(redemptionError);
    assert.equal(redemption[0].outcome, "checked_in");
    assert.equal(redemption[0].admission_count, issued.ticket.admission_count);
  }
  assert.deepEqual(
    mixedTickets.map((item) => item.ticket.admission_count),
    [1, 1, 1, 2, 5],
  );

  const cancelled = await createIssuedTicket(bySlug.get("network"), paymentAdmin);
  const { error: cancelError } = await service
    .from("orders")
    .update({ payment_status: "cancelled" })
    .eq("id", cancelled.order.id);
  if (cancelError) throw cancelError;
  const cancelledHash = createHash("sha256").update(cancelled.qrToken).digest("hex");
  const { data: cancelledRows, error: cancelledError } = await gateStaff.rpc("validate_gate_ticket", {
    p_qr_token_hash: cancelledHash,
  });
  assert.ifError(cancelledError);
  assert.equal(cancelledRows[0].outcome, "cancelled");
  const { data: cancelledRedeem } = await gateStaff.rpc("redeem_gate_ticket", {
    p_ticket_id: cancelled.ticket.id,
    p_source: "qr",
  });
  assert.equal(cancelledRedeem[0].outcome, "cancelled");

  const { data: dashboard, error: dashboardError } = await gateStaff.rpc("get_gate_dashboard");
  assert.ifError(dashboardError);
  assert.equal(dashboard[0].people_admitted - baseline.people_admitted, 15);
  assert.equal(dashboard[0].passes_checked_in - baseline.passes_checked_in, 6);

  const { error: gateHistoryError } = await gateStaff.rpc("search_check_in_history", {
    p_query: suffix,
    p_from: null,
    p_to: null,
    p_limit: 20,
  });
  assert.match(gateHistoryError?.message ?? "", /super admin/i);
  const { data: history, error: historyError } = await superAdmin.rpc("search_check_in_history", {
    p_query: primary.ticket.ticket_code,
    p_from: null,
    p_to: null,
    p_limit: 20,
  });
  assert.ifError(historyError);
  assert.equal(history.length, 1);
  assert.equal(history[0].admission_count, 5);

  const { error: gateTicketReadError } = await gateStaff.from("tickets").select("ticket_code").limit(1);
  assert.ok(gateTicketReadError);
  const { error: gateTicketWriteError } = await gateStaff
    .from("tickets")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", cancelled.ticket.id);
  assert.ok(gateTicketWriteError);
  const { error: gateCheckInReadError } = await gateStaff.from("check_ins").select("id").limit(1);
  assert.ok(gateCheckInReadError);
  const { data: gateOrders } = await gateStaff.from("orders").select("id").limit(1);
  assert.equal(gateOrders?.length, 0);
  const anonymous = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: anonymousRedeemError } = await anonymous.rpc("redeem_gate_ticket", {
    p_ticket_id: cancelled.ticket.id,
    p_source: "qr",
  });
  assert.ok(anonymousRedeemError);

  console.log("PASS live Phase 6 phone gate lookup, role separation, atomic concurrent redemption, snapshots, audit, history, and RLS checks");
} finally {
  if (ticketIds.length) {
    await service.from("check_ins").delete().in("ticket_id", ticketIds);
    await service.from("audit_logs").delete().in("entity_id", ticketIds);
  }
  if (orderIds.length) {
    const auditEntities = [...orderIds, ...submissionIds];
    if (auditEntities.length) await service.from("audit_logs").delete().in("entity_id", auditEntities);
    await service.from("tickets").delete().in("order_id", orderIds);
    await service.from("payment_submissions").delete().in("order_id", orderIds);
    await service.from("commissions").delete().in("order_id", orderIds);
    await service.from("orders").delete().in("id", orderIds);
  }
  if (userIds.length) await service.from("admin_profiles").delete().in("user_id", userIds);
  for (const userId of userIds) await service.auth.admin.deleteUser(userId);
}
