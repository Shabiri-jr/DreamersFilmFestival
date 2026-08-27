import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "pgsql-parser";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const migrationsDirectory = join(projectRoot, "supabase", "migrations");
const seedPath = join(projectRoot, "supabase", "seed.sql");

const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const [migrations, seed] = await Promise.all([
  Promise.all(
    migrationNames.map(async (name) => ({
      name,
      sql: await readFile(join(migrationsDirectory, name), "utf8"),
    })),
  ),
  readFile(seedPath, "utf8"),
]);
const migration = migrations.map(({ sql }) => sql).join("\n");
const phase2Migration =
  migrations.find(({ name }) => name.includes("phase_2_purchase_flow"))?.sql ?? "";
const phase3Migration =
  migrations.find(({ name }) => name.includes("phase_3_payment_submission"))?.sql ?? "";
const phase4Migration =
  migrations.find(({ name }) => name.includes("phase_4_admin_payment_review"))?.sql ?? "";
const phase4SearchMigration =
  migrations.find(({ name }) => name.includes("phase_4_search_indexes"))?.sql ?? "";
const phase5Migration =
  migrations.find(({ name }) => name.includes("phase_5_digital_tickets"))?.sql ?? "";
const phase5GrantMigration =
  migrations.find(({ name }) => name.includes("phase_5_ticket_grant_hardening"))?.sql ?? "";
const phase6Migration =
  migrations.find(({ name }) => name.includes("phase_6_event_check_in"))?.sql ?? "";
const ticketColumnGrants = [...migration.matchAll(
  /grant select\s*\(([\s\S]*?)\)\s*on table public\.tickets to authenticated;/gi,
)].map((match) => match[1] ?? "");
const ticketSearchReturn =
  phase5Migration.match(
    /function public\.search_admin_tickets[\s\S]*?returns table\s*\(([\s\S]*?)\)\s*language/i,
  )?.[1] ?? "";
const checkInHistoryReturn =
  phase6Migration.match(
    /function public\.search_check_in_history[\s\S]*?returns table\s*\(([\s\S]*?)\)\s*language/i,
  )?.[1] ?? "";

await Promise.all([
  ...migrations.map(({ sql }) => parse(sql)),
  parse(seed),
]);
console.log(
  `PASS ${migrations.length} migrations and seed parse with the PostgreSQL parser`,
);

const requiredTables = [
  "admin_profiles",
  "ticket_types",
  "orders",
  "tickets",
  "check_ins",
  "audit_logs",
  "event_settings",
  "promoters",
  "commissions",
  "payment_submissions",
  "staff_action_rate_limits",
  "public_request_rate_limits",
];

const assertions = [
  ...requiredTables.flatMap((table) => [
    {
      name: `creates ${table}`,
      passes: new RegExp(`create table public\\.${table}\\s*\\(`, "i").test(
        migration,
      ),
    },
    {
      name: `enables RLS on ${table}`,
      passes: new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ).test(migration),
    },
  ]),
  {
    name: "keeps orders and tickets as separate related tables",
    passes:
      /order_id uuid not null references public\.orders/i.test(migration) &&
      /ticket_id uuid not null unique references public\.tickets/i.test(migration),
  },
  {
    name: "preserves the single-product order model",
    passes:
      !/create table public\.order_items/i.test(migration) &&
      /ticket_type_id uuid not null references public\.ticket_types/i.test(
        migration,
      ),
  },
  {
    name: "seeds all requested promoter commission rates",
    passes: [
      ["Dreamer", "3000.00", "1000.00"],
      ["D''Shift", "6000.00", "2000.00"],
      ["Network", "12000.00", "4000.00"],
      ["Solo", "25000.00", "5000.00"],
      ["Afatakpa", "70000.00", "10000.00"],
    ].every(([name, price, commission]) =>
      new RegExp(
        `'${name}'[\\s\\S]*?${price.replace(".", "\\.")},\\s*${commission.replace(".", "\\.")},`,
        "i",
      ).test(seed),
    ),
  },
  {
    name: "normalizes unique promoter codes and rejects inactive attribution",
    passes:
      /referral_code text not null unique/i.test(migration) &&
      /referral_code = upper\(btrim\(referral_code\)\)/i.test(migration) &&
      /from public\.promoters[\s\S]*?referral_code = new\.referral_code[\s\S]*?is_active = true/i.test(
        migration,
      ),
  },
  {
    name: "captures server-controlled price and commission snapshots",
    passes:
      /new\.unit_price_snapshot = current_ticket\.price/i.test(migration) &&
      /new\.commission_rate_snapshot = current_ticket\.commission_amount/i.test(
        migration,
      ) &&
      /new\.total_amount = current_ticket\.price \* new\.quantity/i.test(
        migration,
      ),
  },
  {
    name: "makes order attribution and commercial snapshots immutable",
    passes:
      /create trigger orders_protect_commercial_fields/i.test(migration) &&
      /new\.commission_rate_snapshot[\s\S]*?new\.promoter_id[\s\S]*?new\.referral_source/i.test(
        migration,
      ) &&
      /Order commercial details and referral attribution are immutable/i.test(
        migration,
      ),
  },
  {
    name: "creates an idempotent one-row-per-order commission ledger",
    passes:
      /order_id uuid not null unique references public\.orders/i.test(
        migration,
      ) &&
      /on conflict \(order_id\) do update/i.test(migration) &&
      /snapshot_amount := new\.quantity \* new\.commission_rate_snapshot/i.test(
        migration,
      ),
  },
  {
    name: "keeps submitted commission pending and verified commission earned",
    passes:
      /new\.payment_status = 'submitted'[\s\S]*?'pending'/i.test(migration) &&
      /new\.payment_status = 'verified'[\s\S]*?'earned'/i.test(migration) &&
      /commission\.earned/i.test(migration),
  },
  {
    name: "enforces safe payment-state transitions and idempotent verification",
    passes:
      /create trigger orders_enforce_payment_transition/i.test(migration) &&
      /old\.payment_status = 'submitted' and new\.payment_status in \('verified', 'rejected', 'cancelled'\)/i.test(
        migration,
      ) &&
      /new\.payment_status = old\.payment_status[\s\S]*?return new/i.test(
        migration,
      ),
  },
  {
    name: "rejects or cancels without leaving an unpaid commission earned",
    passes:
      /new\.payment_status in \('rejected', 'cancelled'\)[\s\S]*?status = 'cancelled'/i.test(
        migration,
      ) &&
      /Reverse the paid commission before rejecting or cancelling this order/i.test(
        migration,
      ),
  },
  {
    name: "restricts payout and reversal RPCs to super admins with audit logs",
    passes:
      /function public\.mark_commission_paid[\s\S]*?current_admin_role\(\) is distinct from 'super_admin'[\s\S]*?commission\.paid/i.test(
        migration,
      ) &&
      /function public\.cancel_commission[\s\S]*?current_admin_role\(\) is distinct from 'super_admin'[\s\S]*?commission\.reversed/i.test(
        migration,
      ),
  },
  {
    name: "keeps promoter finance unavailable to gate staff and direct writers",
    passes:
      /promoters_finance_staff_select[\s\S]*?\('super_admin', 'payment_admin'\)/i.test(
        migration,
      ) &&
      /commissions_finance_staff_select[\s\S]*?\('super_admin', 'payment_admin'\)/i.test(
        migration,
      ) &&
      /grant select on public\.commissions to authenticated/i.test(migration) &&
      !/grant (insert|update|delete|all)[^;]*public\.commissions to authenticated/i.test(
        migration,
      ) &&
      !/promoters_[^\n]*(self|own)/i.test(migration),
  },
  {
    name: "uses independent cryptographic QR tokens",
    passes:
      /qr_token text not null unique default encode\(extensions\.gen_random_bytes\(32\)/i.test(
        migration,
      ) && /char_length\(qr_token\) = 64/i.test(migration),
  },
  {
    name: "models admissions per purchased unit",
    passes:
      /admissions_per_unit integer not null/i.test(migration) &&
      /'Network'[\s\S]*?12000\.00[\s\S]*?5,/i.test(seed) &&
      /'Afatakpa'[\s\S]*?70000\.00[\s\S]*?2,/i.test(seed),
  },
  {
    name: "defines all required order states",
    passes: [
      "awaiting_payment",
      "submitted",
      "verified",
      "rejected",
      "cancelled",
    ].every((state) => migration.includes(`'${state}'`)),
  },
  {
    name: "defines all required ticket states",
    passes: ["valid", "checked_in", "cancelled"].every((state) =>
      migration.includes(`'${state}'`),
    ),
  },
  {
    name: "creates a private, size-limited receipt bucket",
    passes:
      /'payment-receipts'[\s\S]*?false,[\s\S]*?5242880/i.test(migration) &&
      !/create policy[\s\S]*?on storage\.objects/i.test(migration),
  },
  {
    name: "does not grant anonymous table access",
    passes:
      !/grant\s+(select|insert|update|delete|all)[^;]*\s+to\s+anon\s*;/i.test(
        migration,
      ) &&
      requiredTables.every((table) =>
        new RegExp(`revoke all on table public\\.${table} from anon`, "i").test(
          migration,
        ),
      ),
  },
  {
    name: "prevents gate staff from receiving order policies",
    passes:
      /orders_finance_staff_select[\s\S]*?\('super_admin', 'payment_admin'\)/i.test(
        migration,
      ) &&
      !/orders_[^\n]*gate/i.test(migration),
  },
  {
    name: "keeps raw QR tokens out of authenticated column grants",
    passes:
      /grant select \([\s\S]*?ticket_code,[\s\S]*?created_at[\s\S]*?\) on table public\.tickets to authenticated/i.test(
        migration,
      ) &&
      ticketColumnGrants.every(
        (columns) =>
          !/\bqr_token\b/i.test(columns) &&
          !/\bpublic_access_token\b/i.test(columns),
      ) &&
      !/grant select(?:, update)? on public\.tickets to authenticated/i.test(
        migration,
      ) &&
      /revoke select, insert, update, delete, truncate, references, trigger[\s\S]*?public\.tickets from authenticated/i.test(phase5GrantMigration),
  },
  {
    name: "adds operational indexes",
    passes:
      /orders_payment_status_created_at_idx/i.test(migration) &&
      /tickets_order_id_idx/i.test(migration) &&
      /audit_logs_entity_idx/i.test(migration),
  },
  {
    name: "adds immutable checkout idempotency and duplicate collapse",
    passes:
      /checkout_idempotency_key uuid not null default gen_random_uuid\(\)[\s\S]*?unique/i.test(
        phase2Migration,
      ) &&
      /pg_advisory_xact_lock/i.test(phase2Migration) &&
      /where checkout_idempotency_key = p_checkout_idempotency_key[\s\S]*?return existing_order/i.test(
        phase2Migration,
      ) &&
      /new\.checkout_idempotency_key[\s\S]*?old\.checkout_idempotency_key/i.test(
        phase2Migration,
      ),
  },
  {
    name: "creates non-sequential human order numbers from cryptographic bytes",
    passes:
      /generated_order_number := 'DFF-'[\s\S]*?extensions\.gen_random_bytes\(5\)/i.test(
        phase2Migration,
      ) &&
      /where order_number = generated_order_number/i.test(phase2Migration),
  },
  {
    name: "validates sales, active ticket, quantity, maximum, and availability server-side",
    passes: [
      /current_settings\.sales_enabled is not true/i,
      /current_ticket\.is_active is not true/i,
      /p_quantity is null or p_quantity < 1/i,
      /p_quantity > current_ticket\.maximum_per_order/i,
      /p_quantity > current_ticket\.quantity_available/i,
    ].every((pattern) => pattern.test(phase2Migration)),
  },
  {
    name: "keeps Phase 2 order creation service-role only",
    passes:
      /revoke all on function public\.create_customer_order\([\s\S]*?\) from public, anon, authenticated/i.test(
        phase2Migration,
      ) &&
      /grant execute on function public\.create_customer_order\([\s\S]*?\) to service_role/i.test(
        phase2Migration,
      ),
  },
  {
    name: "creates awaiting-payment orders through existing database snapshots",
    passes:
      /insert into public\.orders[\s\S]*?'awaiting_payment'/i.test(
        phase2Migration,
      ) &&
      /new\.unit_price_snapshot = current_ticket\.price/i.test(migration) &&
      /new\.total_amount = current_ticket\.price \* new\.quantity/i.test(
        migration,
      ) &&
      /'order\.created'/i.test(phase2Migration),
  },
  {
    name: "does not reserve inventory or create payment, commission, ticket, or check-in rows in Phase 2",
    passes:
      !/update public\.ticket_types/i.test(phase2Migration) &&
      !/insert into public\.(commissions|tickets|check_ins)/i.test(
        phase2Migration,
      ) &&
      !/'(submitted|verified|earned)'/i.test(phase2Migration),
  },
  {
    name: "opens ticket sales only in the reviewed Phase 2 seed",
    passes:
      /support_whatsapp,[\s\S]*?sales_enabled[\s\S]*?'\+2348093682647',[\s\S]*?true/i.test(
        seed,
      ) && /sales_enabled = excluded\.sales_enabled/i.test(seed),
  },
  {
    name: "creates payment evidence history with one active submission per order",
    passes:
      /create table public\.payment_submissions/i.test(phase3Migration) &&
      /idempotency_key uuid not null unique/i.test(phase3Migration) &&
      /create unique index payment_submissions_one_active_per_order_idx[\s\S]*?where status = 'submitted'/i.test(
        phase3Migration,
      ),
  },
  {
    name: "snapshots expected amount and flags amount/reference review conditions",
    passes:
      /expected_amount_snapshot numeric/i.test(phase3Migration) &&
      /p_amount_paid is distinct from locked_order\.total_amount/i.test(
        phase3Migration,
      ) &&
      /potential_duplicate boolean not null/i.test(phase3Migration) &&
      /where normalized_reference = normalized_reference_value/i.test(
        phase3Migration,
      ),
  },
  {
    name: "locks orders and collapses repeated payment submissions",
    passes:
      /pg_advisory_xact_lock/i.test(phase3Migration) &&
      /where idempotency_key = p_idempotency_key[\s\S]*?return existing_submission/i.test(
        phase3Migration,
      ) &&
      /locked_order\.payment_status = 'submitted'[\s\S]*?return existing_submission/i.test(
        phase3Migration,
      ),
  },
  {
    name: "moves only eligible orders to submitted and records the audit event",
    passes:
      /locked_order\.payment_status not in \('awaiting_payment', 'rejected'\)/i.test(
        phase3Migration,
      ) &&
      /payment_status = 'submitted'/i.test(phase3Migration) &&
      /payment_submitted_at = created_submission\.created_at/i.test(
        phase3Migration,
      ) &&
      /'payment\.submitted'/i.test(phase3Migration),
  },
  {
    name: "does not verify, issue tickets, or earn commission in the Phase 3 RPC",
    passes:
      !/set\s+payment_status\s*=\s*'verified'/i.test(phase3Migration) &&
      !/insert into public\.tickets/i.test(phase3Migration) &&
      !/commission\.earned/i.test(phase3Migration),
  },
  {
    name: "keeps payment submission writes service-role only and finance reads behind RLS",
    passes:
      /revoke all on function public\.submit_customer_payment\([\s\S]*?from public, anon, authenticated/i.test(
        phase3Migration,
      ) &&
      /grant execute on function public\.submit_customer_payment\([\s\S]*?to service_role/i.test(
        phase3Migration,
      ) &&
      /payment_submissions_finance_staff_select[\s\S]*?\('super_admin', 'payment_admin'\)/i.test(
        phase3Migration,
      ) &&
      !/grant (insert|update|delete|all)[^;]*public\.payment_submissions to authenticated/i.test(
        phase3Migration,
      ),
  },
  {
    name: "keeps receipts private, random-path constrained, and WEBP-aware",
    passes:
      /receipt_path text not null unique[\s\S]*?\(jpg\|png\|webp\|pdf\)/i.test(
        phase3Migration,
      ) &&
      /'payment-receipts'[\s\S]*?false,[\s\S]*?5242880[\s\S]*?'image\/webp'/i.test(
        phase3Migration,
      ) &&
      !/create policy[\s\S]*?on storage\.objects/i.test(phase3Migration),
  },
  {
    name: "makes finance decisions authenticated RPC-only",
    passes:
      /drop policy if exists "orders_finance_staff_update"/i.test(phase4Migration) &&
      /revoke update on table public\.orders from authenticated/i.test(phase4Migration) &&
      /grant execute on function public\.verify_customer_payment\(uuid, uuid\)\s+to authenticated/i.test(phase4Migration) &&
      /grant execute on function public\.reject_customer_payment\(uuid, uuid, text\)\s+to authenticated/i.test(phase4Migration),
  },
  {
    name: "authorizes and locks both review decisions",
    passes:
      [/function public\.verify_customer_payment/, /function public\.reject_customer_payment/].every(
        (pattern) => pattern.test(phase4Migration),
      ) &&
      (phase4Migration.match(/pg_advisory_xact_lock/g)?.length ?? 0) >= 2 &&
      (phase4Migration.match(/role in \('super_admin', 'payment_admin'\)/g)?.length ?? 0) >= 2,
  },
  {
    name: "atomically accepts and verifies without issuing tickets",
    passes:
      /update public\.payment_submissions[\s\S]*?status = 'accepted'[\s\S]*?update public\.orders[\s\S]*?payment_status = 'verified'/i.test(phase4Migration) &&
      /'payment\.verified'/i.test(phase4Migration) &&
      !/insert into public\.tickets/i.test(phase4Migration),
  },
  {
    name: "rejects with actor, reason, history, and audit",
    passes:
      /add column rejected_at timestamptz/i.test(phase4Migration) &&
      /add column rejected_by uuid references public\.admin_profiles/i.test(phase4Migration) &&
      /status = 'rejected'[\s\S]*?rejection_reason = normalized_reason/i.test(phase4Migration) &&
      /'payment\.rejected'/i.test(phase4Migration) &&
      /orders_clear_rejection_on_resubmission/i.test(phase4Migration),
  },
  {
    name: "keeps verification idempotent through locked state and existing commission uniqueness",
    passes:
      /locked_order\.payment_status = 'verified'[\s\S]*?already been verified/i.test(phase4Migration) &&
      /locked_order\.payment_status <> 'submitted'[\s\S]*?already been reviewed/i.test(phase4Migration) &&
      /order_id uuid not null unique references public\.orders/i.test(migration),
  },
  {
    name: "provides bounded role-protected queue search without receipt paths",
    passes:
      /function public\.search_admin_payment_orders/i.test(phase4Migration) &&
      /current_admin_role\(\) not in \('super_admin', 'payment_admin'\)/i.test(phase4Migration) &&
      /least\(greatest\(coalesce\(p_limit, 100\), 1\), 200\)/i.test(phase4Migration) &&
      !/returns table \([\s\S]*?receipt_path/i.test(phase4Migration),
  },
  {
    name: "indexes Phase 4 contains-search with trigram GIN indexes",
    passes:
      /create extension if not exists pg_trgm with schema extensions/i.test(phase4SearchMigration) &&
      (phase4SearchMigration.match(/extensions\.gin_trgm_ops/g)?.length ?? 0) === 7 &&
      /orders_payment_reference_trgm_idx/i.test(phase4SearchMigration) &&
      /promoters_name_trgm_idx/i.test(phase4SearchMigration),
  },
  {
    name: "adds a separate retryable ticket issuance state",
    passes:
      /create type public\.ticket_issuance_status as enum \([\s\S]*?'not_issued'[\s\S]*?'issued'[\s\S]*?'failed'/i.test(phase5Migration) &&
      /ticket_issuance_status public\.ticket_issuance_status not null default 'not_issued'/i.test(phase5Migration),
  },
  {
    name: "snapshots one credential per purchased product unit",
    passes:
      /add column unit_index integer/i.test(phase5Migration) &&
      /tickets_order_unit_unique unique \(order_id, unit_index\)/i.test(phase5Migration) &&
      /ticket_type_name_snapshot text/i.test(phase5Migration) &&
      /admission_count integer/i.test(phase5Migration) &&
      /generate_series\(1, locked_order\.quantity\)/i.test(phase5Migration),
  },
  {
    name: "keeps public-view and QR credentials independent and hash-addressable",
    passes:
      /public_access_token text not null default encode\(extensions\.gen_random_bytes\(32\)/i.test(phase5Migration) &&
      /public_access_token_hash text generated always/i.test(phase5Migration) &&
      /qr_token_hash text generated always/i.test(phase5Migration) &&
      /digest\(public_access_token, 'sha256'\)/i.test(phase5Migration) &&
      /digest\(qr_token, 'sha256'\)/i.test(phase5Migration),
  },
  {
    name: "authorizes, verifies, locks, and idempotently issues tickets",
    passes:
      /function public\.issue_order_tickets/i.test(phase5Migration) &&
      /role in \('super_admin', 'payment_admin'\)/i.test(phase5Migration) &&
      /pg_advisory_xact_lock/i.test(phase5Migration) &&
      /payment_status <> 'verified'/i.test(phase5Migration) &&
      /existing_count = locked_order\.quantity/i.test(phase5Migration) &&
      /returns public\.orders/i.test(phase5Migration) &&
      !/returns setof public\.tickets/i.test(phase5Migration),
  },
  {
    name: "records issuance failures without changing payment or commission",
    passes:
      /function public\.record_ticket_issuance_failure/i.test(phase5Migration) &&
      /ticket_issuance_status = 'failed'/i.test(phase5Migration) &&
      /'tickets\.issuance_failed'/i.test(phase5Migration) &&
      !/update public\.commissions/i.test(phase5Migration),
  },
  {
    name: "keeps ticket search super-admin-only and credentials out of results",
    passes:
      /function public\.search_admin_tickets/i.test(phase5Migration) &&
      /current_admin_role\(\) is distinct from 'super_admin'/i.test(phase5Migration) &&
      !/\b(qr_token|public_access_token)\b/i.test(ticketSearchReturn),
  },
  {
    name: "cancels issued tickets without adding check-in behavior",
    passes:
      /function public\.cancel_tickets_for_cancelled_order/i.test(phase5Migration) &&
      /set status = 'cancelled'/i.test(phase5Migration) &&
      !/insert into public\.check_ins/i.test(phase5Migration),
  },
  {
    name: "adds immutable admission and source snapshots to successful check-ins",
    passes:
      /create type public\.check_in_source as enum \('qr', 'manual'\)/i.test(phase6Migration) &&
      /add column admission_count integer/i.test(phase6Migration) &&
      /add column source public\.check_in_source/i.test(phase6Migration) &&
      /alter column admission_count set not null/i.test(phase6Migration) &&
      /alter column source set not null/i.test(phase6Migration),
  },
  {
    name: "keeps gate lookup role-bound, bounded, hash-addressed, and credential-free",
    passes:
      /function public\.validate_gate_ticket/i.test(phase6Migration) &&
      /where ticket\.qr_token_hash = p_qr_token_hash/i.test(phase6Migration) &&
      /function public\.search_gate_tickets/i.test(phase6Migration) &&
      /char_length\(normalized_query\) not between 4 and 120/i.test(phase6Migration) &&
      /limit result_limit/i.test(phase6Migration) &&
      (phase6Migration.match(/role in \('super_admin', 'gate_staff'\)|current_admin_role\(\) not in \('super_admin', 'gate_staff'\)/g)?.length ?? 0) >= 4,
  },
  {
    name: "atomically locks and rechecks one ticket before check-in",
    passes:
      /function public\.redeem_gate_ticket/i.test(phase6Migration) &&
      /for update of ticket/i.test(phase6Migration) &&
      /locked_ticket\.status = 'checked_in'/i.test(phase6Migration) &&
      /locked_ticket\.payment_status <> 'verified'/i.test(phase6Migration) &&
      /locked_ticket\.ticket_issuance_status <> 'issued'/i.test(phase6Migration) &&
      /update public\.tickets[\s\S]*?status = 'checked_in'/i.test(phase6Migration) &&
      /insert into public\.check_ins/i.test(phase6Migration) &&
      /'tickets\.checked_in'/i.test(phase6Migration),
  },
  {
    name: "prevents direct gate table access after introducing bounded RPCs",
    passes:
      /drop policy if exists "tickets_staff_select"/i.test(phase6Migration) &&
      /revoke select, update on table public\.tickets from authenticated/i.test(phase6Migration) &&
      /revoke select, insert, update, delete, truncate, references, trigger[\s\S]*?public\.check_ins from authenticated/i.test(phase6Migration) &&
      /grant execute on function public\.redeem_gate_ticket/i.test(phase6Migration),
  },
  {
    name: "rate limits gate and public validation operations in database transactions",
    passes:
      /function public\.enforce_staff_action_rate_limit/i.test(phase6Migration) &&
      /function public\.record_public_validation_request/i.test(phase6Migration) &&
      (phase6Migration.match(/perform public\.enforce_staff_action_rate_limit/g)?.length ?? 0) >= 5 &&
      /grant execute on function public\.record_public_validation_request\(text\)[\s\S]*?to service_role/i.test(phase6Migration),
  },
  {
    name: "limits check-in history to super admins and excludes customer contact data",
    passes:
      /function public\.search_check_in_history/i.test(phase6Migration) &&
      /current_admin_role\(\) is distinct from 'super_admin'/i.test(phase6Migration) &&
      checkInHistoryReturn.length > 0 &&
      !/\b(phone|email|receipt_path)\b/i.test(checkInHistoryReturn),
  },
];

const failures = assertions.filter((assertion) => !assertion.passes);

for (const assertion of assertions) {
  console.log(`${assertion.passes ? "PASS" : "FAIL"} ${assertion.name}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
  throw new Error(`${failures.length} migration assertion(s) failed.`);
}

console.log(`Verified ${assertions.length} migration invariants.`);
