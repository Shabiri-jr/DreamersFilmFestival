-- Dreamers Pass Phase 5: idempotent digital ticket credentials.
-- Payment verification and commission activation remain separate Phase 4 work.

create type public.ticket_issuance_status as enum (
  'not_issued',
  'issued',
  'failed'
);

alter table public.orders
  add column ticket_issuance_status public.ticket_issuance_status not null default 'not_issued',
  add column ticket_issuance_attempts integer not null default 0
    check (ticket_issuance_attempts >= 0),
  add column ticket_issuance_last_attempt_at timestamptz;

alter table public.tickets
  add column unit_index integer,
  add column public_access_token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  add column public_access_token_hash text generated always as (
    encode(extensions.digest(public_access_token, 'sha256'), 'hex')
  ) stored,
  add column qr_token_hash text generated always as (
    encode(extensions.digest(qr_token, 'sha256'), 'hex')
  ) stored,
  add column ticket_type_name_snapshot text,
  add column admission_count integer,
  add column updated_at timestamptz not null default now();

with ranked as (
  select
    id,
    row_number() over (partition by order_id order by created_at, id)::integer as unit_index
  from public.tickets
)
update public.tickets as ticket
set unit_index = ranked.unit_index
from ranked
where ranked.id = ticket.id;

update public.tickets as ticket
set ticket_type_name_snapshot = ticket_type.name,
    admission_count = ticket_type.admissions_per_unit
from public.ticket_types as ticket_type
where ticket_type.id = ticket.ticket_type_id;

alter table public.tickets
  alter column unit_index set not null,
  alter column ticket_type_name_snapshot set not null,
  alter column admission_count set not null,
  add constraint tickets_unit_index_positive check (unit_index > 0),
  add constraint tickets_public_access_token_secure check (
    public_access_token ~ '^[0-9a-f]{64}$'
  ),
  add constraint tickets_ticket_type_name_snapshot_valid check (
    char_length(ticket_type_name_snapshot) between 2 and 80
  ),
  add constraint tickets_admission_count_valid check (
    admission_count between 1 and 20
  ),
  add constraint tickets_order_unit_unique unique (order_id, unit_index),
  add constraint tickets_public_access_token_unique unique (public_access_token),
  add constraint tickets_public_access_token_hash_unique unique (public_access_token_hash),
  add constraint tickets_qr_token_hash_unique unique (qr_token_hash);

update public.orders as orders
set ticket_issuance_status = case
      when ticket_totals.ticket_count = orders.quantity then 'issued'::public.ticket_issuance_status
      else 'failed'::public.ticket_issuance_status
    end,
    ticket_issuance_last_attempt_at = now()
from (
  select order_id, count(*)::integer as ticket_count
  from public.tickets
  group by order_id
) as ticket_totals
where ticket_totals.order_id = orders.id;

create index orders_ticket_issuance_status_idx
  on public.orders (ticket_issuance_status, updated_at desc);
create index tickets_ticket_code_search_idx
  on public.tickets using gin (lower(ticket_code) extensions.gin_trgm_ops);
create index tickets_attendee_name_search_idx
  on public.tickets using gin (lower(attendee_name) extensions.gin_trgm_ops);

create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

create or replace function public.protect_ticket_credential_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.order_id,
    new.unit_index,
    new.ticket_code,
    new.qr_token,
    new.public_access_token,
    new.ticket_type_id,
    new.ticket_type_name_snapshot,
    new.admission_count,
    new.attendee_name,
    new.issued_at
  ) is distinct from row(
    old.order_id,
    old.unit_index,
    old.ticket_code,
    old.qr_token,
    old.public_access_token,
    old.ticket_type_id,
    old.ticket_type_name_snapshot,
    old.admission_count,
    old.attendee_name,
    old.issued_at
  ) then
    raise exception 'Issued ticket identity and credential snapshots are immutable.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tickets_protect_credential_identity
before update on public.tickets
for each row execute function public.protect_ticket_credential_identity();

create or replace function public.issue_order_tickets(
  p_order_id uuid,
  p_ticket_codes text[],
  p_qr_tokens text[],
  p_public_access_tokens text[]
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.admin_profiles%rowtype;
  locked_order public.orders%rowtype;
  current_ticket_type public.ticket_types%rowtype;
  existing_count integer;
  issued_order public.orders%rowtype;
begin
  select *
  into actor_profile
  from public.admin_profiles
  where user_id = (select auth.uid())
    and is_active = true
    and role in ('super_admin', 'payment_admin');

  if not found then
    raise exception 'You do not have permission to issue tickets.'
      using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'Order is required.' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_order_id::text, 1)
  );

  select *
  into locked_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if locked_order.payment_status <> 'verified' then
    raise exception 'Only verified orders can receive tickets.'
      using errcode = '23514';
  end if;

  select count(*)::integer
  into existing_count
  from public.tickets
  where order_id = locked_order.id;

  if existing_count = locked_order.quantity then
    update public.orders
    set ticket_issuance_status = 'issued'
    where id = locked_order.id
      and ticket_issuance_status <> 'issued'
    returning * into issued_order;

    if issued_order.id is null then
      issued_order := locked_order;
    end if;
    return issued_order;
  end if;

  if existing_count <> 0 then
    raise exception 'Existing ticket count does not match the purchased quantity.'
      using errcode = '23514';
  end if;

  if coalesce(array_length(p_ticket_codes, 1), 0) <> locked_order.quantity
    or coalesce(array_length(p_qr_tokens, 1), 0) <> locked_order.quantity
    or coalesce(array_length(p_public_access_tokens, 1), 0) <> locked_order.quantity then
    raise exception 'Credential count does not match the purchased quantity.'
      using errcode = '23514';
  end if;

  if exists (
      select 1 from unnest(p_ticket_codes) as credential(value)
      where credential.value !~ '^DFF-(DR|DS|NW|SO|AF)-[A-Z2-9]{6}$'
    )
    or exists (
      select 1 from unnest(p_qr_tokens) as credential(value)
      where credential.value !~ '^[0-9a-f]{64}$'
    )
    or exists (
      select 1 from unnest(p_public_access_tokens) as credential(value)
      where credential.value !~ '^[0-9a-f]{64}$'
    ) then
    raise exception 'Ticket credentials are malformed.' using errcode = '23514';
  end if;

  if (select count(distinct credential.value) from unnest(p_ticket_codes) as credential(value)) <> locked_order.quantity
    or (select count(distinct credential.value) from unnest(p_qr_tokens) as credential(value)) <> locked_order.quantity
    or (select count(distinct credential.value) from unnest(p_public_access_tokens) as credential(value)) <> locked_order.quantity then
    raise exception 'Ticket credentials must be unique.' using errcode = '23514';
  end if;

  select *
  into current_ticket_type
  from public.ticket_types
  where id = locked_order.ticket_type_id;

  if not found then
    raise exception 'Ticket type not found.' using errcode = 'P0002';
  end if;

  insert into public.tickets (
    order_id,
    unit_index,
    ticket_code,
    qr_token,
    public_access_token,
    ticket_type_id,
    ticket_type_name_snapshot,
    admission_count,
    attendee_name,
    status,
    issued_at
  )
  select
    locked_order.id,
    unit_number,
    p_ticket_codes[unit_number],
    p_qr_tokens[unit_number],
    p_public_access_tokens[unit_number],
    locked_order.ticket_type_id,
    current_ticket_type.name,
    current_ticket_type.admissions_per_unit,
    locked_order.customer_name,
    'valid',
    now()
  from pg_catalog.generate_series(1, locked_order.quantity) as unit_number;

  update public.orders
  set ticket_issuance_status = 'issued',
      ticket_issuance_attempts = ticket_issuance_attempts + 1,
      ticket_issuance_last_attempt_at = now()
  where id = locked_order.id
  returning * into issued_order;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    'tickets.issued',
    'order',
    locked_order.id,
    jsonb_build_object(
      'order_number', locked_order.order_number,
      'ticket_count', locked_order.quantity,
      'ticket_type', current_ticket_type.name,
      'admission_count_per_ticket', current_ticket_type.admissions_per_unit
    )
  );

  return issued_order;
end;
$$;

create or replace function public.record_ticket_issuance_failure(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.admin_profiles%rowtype;
  locked_order public.orders%rowtype;
  updated_order public.orders%rowtype;
begin
  select *
  into actor_profile
  from public.admin_profiles
  where user_id = (select auth.uid())
    and is_active = true
    and role in ('super_admin', 'payment_admin');

  if not found then
    raise exception 'You do not have permission to update ticket issuance.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_order_id::text, 1)
  );

  select * into locked_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if locked_order.payment_status <> 'verified' then
    raise exception 'Only verified orders can have an issuance failure.'
      using errcode = '23514';
  end if;

  if locked_order.ticket_issuance_status = 'issued' then
    return locked_order;
  end if;

  update public.orders
  set ticket_issuance_status = 'failed',
      ticket_issuance_attempts = ticket_issuance_attempts + 1,
      ticket_issuance_last_attempt_at = now()
  where id = locked_order.id
  returning * into updated_order;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    'tickets.issuance_failed',
    'order',
    locked_order.id,
    jsonb_build_object('order_number', locked_order.order_number)
  );

  return updated_order;
end;
$$;

create or replace function public.cancel_tickets_for_cancelled_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_status = 'cancelled' and old.payment_status <> 'cancelled' then
    update public.tickets
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now())
    where order_id = new.id
      and status <> 'cancelled';
  end if;
  return new;
end;
$$;

create trigger orders_cancel_issued_tickets
after update of payment_status on public.orders
for each row execute function public.cancel_tickets_for_cancelled_order();

create or replace function public.search_admin_tickets(
  p_query text default null,
  p_limit integer default 200
)
returns table (
  ticket_id uuid,
  ticket_code text,
  customer_name text,
  phone text,
  ticket_type_name text,
  admission_count integer,
  order_number text,
  ticket_status public.ticket_status,
  issued_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(p_query));
  result_limit integer := least(greatest(coalesce(p_limit, 200), 1), 300);
begin
  if public.current_admin_role() is distinct from 'super_admin'::public.admin_role then
    raise exception 'Only a super admin can search tickets.'
      using errcode = '42501';
  end if;

  if normalized_query is not null and char_length(normalized_query) > 120 then
    raise exception 'Search query is too long.' using errcode = '23514';
  end if;

  return query
  select
    tickets.id,
    tickets.ticket_code,
    orders.customer_name,
    orders.phone,
    tickets.ticket_type_name_snapshot,
    tickets.admission_count,
    orders.order_number,
    tickets.status,
    tickets.issued_at
  from public.tickets as tickets
  join public.orders as orders on orders.id = tickets.order_id
  where normalized_query is null
    or normalized_query = ''
    or lower(tickets.ticket_code) like '%' || normalized_query || '%'
    or lower(orders.order_number) like '%' || normalized_query || '%'
    or lower(orders.customer_name) like '%' || normalized_query || '%'
    or lower(orders.phone) like '%' || normalized_query || '%'
    or lower(tickets.ticket_type_name_snapshot) like '%' || normalized_query || '%'
  order by tickets.issued_at desc
  limit result_limit;
end;
$$;

revoke all on function public.issue_order_tickets(uuid, text[], text[], text[])
  from public, anon;
revoke all on function public.record_ticket_issuance_failure(uuid)
  from public, anon;
revoke all on function public.search_admin_tickets(text, integer)
  from public, anon;

grant execute on function public.issue_order_tickets(uuid, text[], text[], text[])
  to authenticated;
grant execute on function public.record_ticket_issuance_failure(uuid)
  to authenticated;
grant execute on function public.search_admin_tickets(text, integer)
  to authenticated;

grant usage on type public.ticket_issuance_status to authenticated, service_role;
grant select (
  unit_index,
  ticket_type_name_snapshot,
  admission_count,
  updated_at
) on table public.tickets to authenticated;

revoke all on table public.tickets from anon;

comment on column public.orders.ticket_issuance_status is
  'Retryable ticket issuance state, independent from payment and commission state.';
comment on column public.tickets.unit_index is
  'One-based purchased product unit index; unique within an order for issuance idempotency.';
comment on column public.tickets.admission_count is
  'Admission capacity snapshot for this purchased product credential.';
comment on column public.tickets.public_access_token is
  'Service-role-only 256-bit bearer secret for the customer-facing pass page.';
comment on column public.tickets.qr_token is
  'Service-role-only 256-bit gate credential; never use the ticket code as authentication.';
comment on column public.ticket_types.admissions_per_unit is
  'Admission capacity carried by one purchased product credential.';
comment on column public.orders.quantity is
  'Number of purchased product credentials to issue.';
