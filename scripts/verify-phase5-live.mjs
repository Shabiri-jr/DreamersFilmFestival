import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
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
const password = `Dp!${randomBytes(18).toString("base64url")}`;
const userIds = [];
const orderIds = [];
const submissionIds = [];
const promoterIds = [];
let changedTicketTypeId = null;

async function createStaff(role) {
  const email = `phase5-${role}-${suffix}@example.test`;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("Staff user was not created.");
  userIds.push(created.user.id);
  const { error: profileError } = await service.from("admin_profiles").insert({
    user_id: created.user.id,
    name: `Phase 5 ${role}`,
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

function credentialSet(prefix, quantity) {
  return Array.from({ length: quantity }, () => ({
    code: `DFF-${prefix}-${randomBytes(6)
      .toString("base64url")
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, "A")
      .slice(0, 6)
      .padEnd(6, "A")}`,
    qr: randomBytes(32).toString("hex"),
    access: randomBytes(32).toString("hex"),
  }));
}

async function createOrder(ticketType, quantity, promoter = null) {
  const { data, error } = await service.rpc("create_customer_order", {
    p_checkout_idempotency_key: randomUUID(),
    p_ticket_type_id: ticketType.id,
    p_quantity: quantity,
    p_customer_name: `Phase Five Buyer ${suffix}`,
    p_phone: "+2348093682647",
    p_email: `buyer-${suffix}@example.test`,
    p_promoter_id: promoter?.id ?? null,
    p_referral_code: promoter?.referral_code ?? null,
    p_referral_source: promoter ? "referral_link" : null,
  });
  if (error || !data) throw error ?? new Error("Order was not created.");
  orderIds.push(data.id);
  return data;
}

async function submit(order) {
  const submissionId = randomUUID();
  const { data, error } = await service.rpc("submit_customer_payment", {
    p_order_id: order.id,
    p_idempotency_key: submissionId,
    p_sender_name: `Phase Five Buyer ${suffix}`,
    p_sender_bank: "Test Bank",
    p_amount_paid: Number(order.total_amount),
    p_payment_reference: `P5-${suffix}-${submissionIds.length}`,
    p_payment_date: new Date().toISOString().slice(0, 10),
    p_payment_time: "12:00:00",
    p_receipt_path: `${order.id}/${randomUUID()}.png`,
  });
  if (error || !data) throw error ?? new Error("Payment was not submitted.");
  submissionIds.push(data.id);
  return data;
}

async function verify(order, paymentAdmin) {
  const submission = await submit(order);
  const { error } = await paymentAdmin.rpc("verify_customer_payment", {
    p_order_id: order.id,
    p_submission_id: submission.id,
  });
  if (error) throw error;
}

async function issue(order, ticketType, client, concurrent = false) {
  const prefix = { dreamer: "DR", "d-shift": "DS", network: "NW", solo: "SO", afatakpa: "AF" }[ticketType.slug];
  const call = () => {
    const values = credentialSet(prefix, order.quantity);
    return client.rpc("issue_order_tickets", {
      p_order_id: order.id,
      p_ticket_codes: values.map((value) => value.code),
      p_qr_tokens: values.map((value) => value.qr),
      p_public_access_tokens: values.map((value) => value.access),
    });
  };
  const results = concurrent ? await Promise.all([call(), call()]) : [await call()];
  for (const result of results) if (result.error) throw result.error;
  const { data: tickets, error } = await service
    .from("tickets")
    .select("id,ticket_code,qr_token,public_access_token,admission_count,unit_index,status")
    .eq("order_id", order.id)
    .order("unit_index");
  if (error) throw error;
  return tickets;
}

try {
  // Supabase admin auth calls share an internal client; create test users
  // sequentially so concurrent session handling cannot replace the service JWT.
  const superAdmin = await createStaff("super_admin");
  const paymentAdmin = await createStaff("payment_admin");
  const gateStaff = await createStaff("gate_staff");
  const { data: ticketTypes, error: ticketTypeError } = await service
    .from("ticket_types")
    .select("id,name,slug,admissions_per_unit,commission_amount")
    .in("slug", ["dreamer", "d-shift", "network", "solo", "afatakpa"]);
  if (ticketTypeError) throw ticketTypeError;
  const bySlug = new Map(ticketTypes.map((ticket) => [ticket.slug, ticket]));

  const awaitingOrder = await createOrder(bySlug.get("dreamer"), 1);
  const awaitingCredentials = credentialSet("DR", 1);
  const { error: awaitingError } = await paymentAdmin.rpc("issue_order_tickets", {
    p_order_id: awaitingOrder.id,
    p_ticket_codes: awaitingCredentials.map((value) => value.code),
    p_qr_tokens: awaitingCredentials.map((value) => value.qr),
    p_public_access_tokens: awaitingCredentials.map((value) => value.access),
  });
  assert.match(awaitingError?.message ?? "", /only verified/i);

  const rejectedOrder = await createOrder(bySlug.get("dreamer"), 1);
  const rejectedSubmission = await submit(rejectedOrder);
  const { error: rejectError } = await paymentAdmin.rpc("reject_customer_payment", {
    p_order_id: rejectedOrder.id,
    p_submission_id: rejectedSubmission.id,
    p_reason: "Test rejection",
  });
  if (rejectError) throw rejectError;
  const rejectedCredentials = credentialSet("DR", 1);
  const { error: rejectedIssueError } = await paymentAdmin.rpc("issue_order_tickets", {
    p_order_id: rejectedOrder.id,
    p_ticket_codes: rejectedCredentials.map((value) => value.code),
    p_qr_tokens: rejectedCredentials.map((value) => value.qr),
    p_public_access_tokens: rejectedCredentials.map((value) => value.access),
  });
  assert.match(rejectedIssueError?.message ?? "", /only verified/i);

  const scenarios = [
    ["dreamer", 4, 1, false],
    ["d-shift", 1, 1, false],
    ["network", 2, 5, true],
    ["solo", 1, 1, false],
    ["afatakpa", 1, 2, false],
  ];
  const allTickets = [];
  let dreamerOrder;
  let networkOrder;
  let soloOrder;
  for (const [slug, quantity, admission, concurrent] of scenarios) {
    const ticketType = bySlug.get(slug);
    const order = await createOrder(ticketType, quantity);
    if (slug === "dreamer") dreamerOrder = order;
    if (slug === "network") networkOrder = order;
    if (slug === "solo") soloOrder = order;
    await verify(order, paymentAdmin);
    const tickets = await issue(order, ticketType, paymentAdmin, concurrent);
    assert.equal(tickets.length, quantity);
    assert.ok(tickets.every((ticket) => ticket.admission_count === admission));
    allTickets.push(...tickets);
  }

  const repeatedDreamer = await issue(dreamerOrder, bySlug.get("dreamer"), paymentAdmin);
  assert.equal(repeatedDreamer.length, 4);
  assert.equal(new Set(allTickets.map((ticket) => ticket.ticket_code)).size, allTickets.length);
  assert.equal(new Set(allTickets.map((ticket) => ticket.qr_token)).size, allTickets.length);
  assert.equal(new Set(allTickets.map((ticket) => ticket.public_access_token)).size, allTickets.length);

  const retryOrder = await createOrder(bySlug.get("dreamer"), 1);
  await verify(retryOrder, paymentAdmin);
  const { error: failureError } = await paymentAdmin.rpc("record_ticket_issuance_failure", { p_order_id: retryOrder.id });
  if (failureError) throw failureError;
  const { data: failedOrder } = await service.from("orders").select("payment_status,ticket_issuance_status").eq("id", retryOrder.id).single();
  assert.equal(failedOrder.payment_status, "verified");
  assert.equal(failedOrder.ticket_issuance_status, "failed");
  await issue(retryOrder, bySlug.get("dreamer"), paymentAdmin);

  changedTicketTypeId = bySlug.get("network").id;
  const { error: changeError } = await service.from("ticket_types").update({ admissions_per_unit: 6 }).eq("id", changedTicketTypeId);
  if (changeError) throw changeError;
  const { data: networkSnapshots } = await service.from("tickets").select("admission_count").eq("order_id", networkOrder.id);
  assert.ok(networkSnapshots.every((ticket) => ticket.admission_count === 5));
  await service.from("ticket_types").update({ admissions_per_unit: 5 }).eq("id", changedTicketTypeId);
  changedTicketTypeId = null;

  const { error: cancelError } = await service.from("orders").update({ payment_status: "cancelled" }).eq("id", soloOrder.id);
  if (cancelError) throw cancelError;
  const { data: cancelledTickets } = await service.from("tickets").select("status").eq("order_id", soloOrder.id);
  assert.ok(cancelledTickets.every((ticket) => ticket.status === "cancelled"));

  const { data: promoter, error: promoterError } = await service.from("promoters").insert({
    name: `Phase Five Promoter ${suffix}`,
    phone: "+2348093682647",
    referral_code: `P5${suffix}`.toUpperCase(),
  }).select("id,referral_code").single();
  if (promoterError) throw promoterError;
  promoterIds.push(promoter.id);
  const promoterOrder = await createOrder(bySlug.get("network"), 1, promoter);
  await verify(promoterOrder, paymentAdmin);
  const { data: beforeCommission } = await service.from("commissions").select("id,amount,status").eq("order_id", promoterOrder.id).single();
  assert.equal(Number(beforeCommission.amount), 4000);
  assert.equal(beforeCommission.status, "earned");
  await issue(promoterOrder, bySlug.get("network"), paymentAdmin);
  const { data: afterCommission } = await service.from("commissions").select("amount,status").eq("order_id", promoterOrder.id).single();
  assert.deepEqual(afterCommission, { amount: 4000, status: "earned" });

  const { error: anonReadError } = await createClient(url, anonKey).from("tickets").select("ticket_code").limit(1);
  assert.ok(anonReadError);
  const { error: gateSafeError } = await gateStaff.from("tickets").select("ticket_code,admission_count,status").limit(1);
  assert.ok(gateSafeError);
  const { error: gateSecretError } = await gateStaff.from("tickets").select("qr_token").limit(1);
  assert.ok(gateSecretError);
  const { data: gateOrders } = await gateStaff.from("orders").select("id").limit(1);
  assert.equal(gateOrders?.length, 0);
  const { data: gateCommissions } = await gateStaff.from("commissions").select("id").limit(1);
  assert.equal(gateCommissions?.length, 0);
  const { error: gateSearchError } = await gateStaff.rpc("search_admin_tickets", { p_query: null, p_limit: 10 });
  assert.match(gateSearchError?.message ?? "", /super admin/i);
  const { error: paymentSearchError } = await paymentAdmin.rpc("search_admin_tickets", { p_query: null, p_limit: 10 });
  assert.match(paymentSearchError?.message ?? "", /super admin/i);
  const { data: superSearch, error: superSearchError } = await superAdmin.rpc("search_admin_tickets", { p_query: suffix, p_limit: 300 });
  assert.ifError(superSearchError);
  assert.ok(superSearch.length >= allTickets.length);
  assert.ok(superSearch.every((ticket) => !("qr_token" in ticket) && !("public_access_token" in ticket)));
  const gateCredentials = credentialSet("DR", 1);
  const { error: gateIssueError } = await gateStaff.rpc("issue_order_tickets", {
    p_order_id: retryOrder.id,
    p_ticket_codes: gateCredentials.map((value) => value.code),
    p_qr_tokens: gateCredentials.map((value) => value.qr),
    p_public_access_tokens: gateCredentials.map((value) => value.access),
  });
  assert.match(gateIssueError?.message ?? "", /permission/i);

  const { data: zeroAwaitingTickets } = await service.from("tickets").select("id").eq("order_id", awaitingOrder.id);
  const { data: zeroRejectedTickets } = await service.from("tickets").select("id").eq("order_id", rejectedOrder.id);
  assert.equal(zeroAwaitingTickets.length, 0);
  assert.equal(zeroRejectedTickets.length, 0);

  console.log("PASS live Phase 5 issuance, concurrency, snapshots, commission, cancellation, and RLS checks");
} finally {
  if (changedTicketTypeId) await service.from("ticket_types").update({ admissions_per_unit: 5 }).eq("id", changedTicketTypeId);
  let ticketIds = [];
  let commissionIds = [];
  if (orderIds.length) {
    const { data: tickets } = await service.from("tickets").select("id").in("order_id", orderIds);
    const { data: commissions } = await service.from("commissions").select("id").in("order_id", orderIds);
    ticketIds = (tickets ?? []).map((item) => item.id);
    commissionIds = (commissions ?? []).map((item) => item.id);
    const auditEntityIds = [...orderIds, ...submissionIds, ...ticketIds, ...commissionIds];
    if (auditEntityIds.length) await service.from("audit_logs").delete().in("entity_id", auditEntityIds);
    await service.from("tickets").delete().in("order_id", orderIds);
    await service.from("payment_submissions").delete().in("order_id", orderIds);
    await service.from("commissions").delete().in("order_id", orderIds);
    await service.from("orders").delete().in("id", orderIds);
  }
  if (promoterIds.length) await service.from("promoters").delete().in("id", promoterIds);
  if (userIds.length) await service.from("admin_profiles").delete().in("user_id", userIds);
  for (const userId of userIds) await service.auth.admin.deleteUser(userId);
}
