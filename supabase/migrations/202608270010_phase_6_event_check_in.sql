-- Dreamers Pass Phase 6: phone-first, authenticated, atomic event check-in.
-- QR and manual entry share one database redemption boundary.

create type public.check_in_source as enum ('qr', 'manual');

alter table public.check_ins
  add column admission_count integer,
  add column source public.check_in_source;

update public.check_ins as check_in
set admission_count = ticket.admission_count,
    source = 'manual'
from public.tickets as ticket
where ticket.id = check_in.ticket_id;

alter table public.check_ins
  alter column admission_count set not null,
  alter column source set not null,
  add constraint check_ins_admission_count_valid
    check (admission_count between 1 and 20);

create index check_ins_staff_time_idx
  on public.check_ins (checked_in_by, checked_in_at desc);
create index check_ins_source_time_idx
  on public.check_ins (source, checked_in_at desc);

create table public.staff_action_rate_limits (
  admin_profile_id uuid not null references public.admin_profiles (id) on delete cascade,
  action text not null check (char_length(action) between 2 and 80),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (admin_profile_id, action)
);

create table public.public_request_rate_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (char_length(action) between 2 and 80),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (key_hash, action)
);

alter table public.staff_action_rate_limits enable row level security;
alter table public.public_request_rate_limits enable row level security;

revoke all on table public.staff_action_rate_limits from public;
revoke all on table public.staff_action_rate_limits from anon;
revoke all on table public.staff_action_rate_limits from authenticated;
revoke all on table public.public_request_rate_limits from public;
revoke all on table public.public_request_rate_limits from anon;
revoke all on table public.public_request_rate_limits from authenticated;
grant all on table public.staff_action_rate_limits to service_role;
grant all on table public.public_request_rate_limits to service_role;

create or replace function public.enforce_staff_action_rate_limit(
  p_action text,
  p_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  current_count integer;
begin
  if p_action is null
    or char_length(p_action) not between 2 and 80
    or p_limit not between 1 and 300 then
    raise exception 'Invalid request limit.' using errcode = '23514';
  end if;

  select id
  into actor_id
  from public.admin_profiles
  where user_id = (select auth.uid())
    and is_active = true;

  if actor_id is null then
    raise exception 'Active staff access is required.' using errcode = '42501';
  end if;

  insert into public.staff_action_rate_limits (
    admin_profile_id,
    action,
    window_started_at,
    request_count
  ) values (
    actor_id,
    p_action,
    now(),
    1
  )
  on conflict (admin_profile_id, action) do update
  set window_started_at = case
        when public.staff_action_rate_limits.window_started_at <= now() - interval '1 minute'
          then now()
        else public.staff_action_rate_limits.window_started_at
      end,
      request_count = case
        when public.staff_action_rate_limits.window_started_at <= now() - interval '1 minute'
          then 1
        else public.staff_action_rate_limits.request_count + 1
      end
  returning request_count into current_count;

  if current_count > p_limit then
    raise exception 'Too many gate requests. Wait a moment and try again.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.record_public_validation_request(
  p_key_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid request key.' using errcode = '23514';
  end if;

  insert into public.public_request_rate_limits (
    key_hash,
    action,
    window_started_at,
    request_count
  ) values (
    p_key_hash,
    'public_ticket_validation',
    now(),
    1
  )
  on conflict (key_hash, action) do update
  set window_started_at = case
        when public.public_request_rate_limits.window_started_at <= now() - interval '1 minute'
          then now()
        else public.public_request_rate_limits.window_started_at
      end,
      request_count = case
        when public.public_request_rate_limits.window_started_at <= now() - interval '1 minute'
          then 1
        else public.public_request_rate_limits.request_count + 1
      end
  returning request_count into current_count;

  if current_count > 60 then
    raise exception 'Ticket validation is temporarily unavailable.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.validate_gate_ticket(
  p_qr_token_hash text
)
returns table (
  outcome text,
  ticket_id uuid,
  ticket_code text,
  holder_name text,
  ticket_type_name text,
  admission_count integer,
  ticket_status public.ticket_status,
  checked_in_at timestamptz,
  checked_in_by_name text,
  order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_admin_role() not in ('super_admin', 'gate_staff') then
    raise exception 'Gate access is required.' using errcode = '42501';
  end if;

  perform public.enforce_staff_action_rate_limit('gate_validate', 120);

  if p_qr_token_hash is null or p_qr_token_hash !~ '^[0-9a-f]{64}$' then
    return query select
      'invalid'::text, null::uuid, null::text, null::text, null::text,
      null::integer, null::public.ticket_status, null::timestamptz,
      null::text, null::text;
    return;
  end if;

  return query
  select
    case
      when ticket.status = 'checked_in' then 'already_used'
      when ticket.status = 'cancelled' then 'cancelled'
      when ticket.status = 'valid'
        and ticket.checked_in_at is null
        and orders.payment_status = 'verified'
        and orders.ticket_issuance_status = 'issued' then 'valid'
      else 'invalid'
    end,
    ticket.id,
    ticket.ticket_code,
    ticket.attendee_name,
    ticket.ticket_type_name_snapshot,
    ticket.admission_count,
    ticket.status,
    ticket.checked_in_at,
    staff.name,
    orders.order_number
  from public.tickets as ticket
  join public.orders as orders on orders.id = ticket.order_id
  left join public.admin_profiles as staff on staff.id = ticket.checked_in_by
  where ticket.qr_token_hash = p_qr_token_hash
  limit 1;

  if not found then
    return query select
      'invalid'::text, null::uuid, null::text, null::text, null::text,
      null::integer, null::public.ticket_status, null::timestamptz,
      null::text, null::text;
  end if;
end;
$$;

create or replace function public.search_gate_tickets(
  p_query text,
  p_limit integer default 20
)
returns table (
  outcome text,
  ticket_id uuid,
  ticket_code text,
  holder_name text,
  ticket_type_name text,
  admission_count integer,
  ticket_status public.ticket_status,
  checked_in_at timestamptz,
  checked_in_by_name text,
  order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')));
  compact_phone text := regexp_replace(coalesce(p_query, ''), '[^0-9+]', '', 'g');
  normalized_phone text;
  result_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
begin
  if public.current_admin_role() not in ('super_admin', 'gate_staff') then
    raise exception 'Gate access is required.' using errcode = '42501';
  end if;

  perform public.enforce_staff_action_rate_limit('gate_search', 40);

  if char_length(normalized_query) not between 4 and 120 then
    raise exception 'Enter at least 4 characters to search.' using errcode = '23514';
  end if;

  normalized_phone := case
    when compact_phone ~ '^\+234[0-9]{7,10}$' then compact_phone
    when compact_phone ~ '^234[0-9]{7,10}$' then '+' || compact_phone
    when compact_phone ~ '^0[0-9]{9,10}$' then '+234' || substring(compact_phone from 2)
    else null
  end;

  return query
  select
    case
      when ticket.status = 'checked_in' then 'already_used'
      when ticket.status = 'cancelled' then 'cancelled'
      when ticket.status = 'valid'
        and ticket.checked_in_at is null
        and orders.payment_status = 'verified'
        and orders.ticket_issuance_status = 'issued' then 'valid'
      else 'invalid'
    end,
    ticket.id,
    ticket.ticket_code,
    ticket.attendee_name,
    ticket.ticket_type_name_snapshot,
    ticket.admission_count,
    ticket.status,
    ticket.checked_in_at,
    staff.name,
    orders.order_number
  from public.tickets as ticket
  join public.orders as orders on orders.id = ticket.order_id
  left join public.admin_profiles as staff on staff.id = ticket.checked_in_by
  where lower(ticket.ticket_code) = normalized_query
    or lower(orders.order_number) = normalized_query
    or strpos(lower(ticket.ticket_code), normalized_query) = 1
    or strpos(lower(orders.order_number), normalized_query) = 1
    or strpos(lower(ticket.attendee_name), normalized_query) > 0
    or (normalized_phone is not null and orders.phone = normalized_phone)
  order by
    case
      when lower(ticket.ticket_code) = normalized_query then 0
      when lower(orders.order_number) = normalized_query then 1
      when normalized_phone is not null and orders.phone = normalized_phone then 2
      else 3
    end,
    ticket.issued_at desc
  limit result_limit;
end;
$$;

create or replace function public.redeem_gate_ticket(
  p_ticket_id uuid,
  p_source public.check_in_source
)
returns table (
  outcome text,
  ticket_id uuid,
  ticket_code text,
  holder_name text,
  ticket_type_name text,
  admission_count integer,
  ticket_status public.ticket_status,
  checked_in_at timestamptz,
  checked_in_by_name text,
  order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.admin_profiles%rowtype;
  locked_ticket record;
  redeemed_at timestamptz;
begin
  select *
  into actor_profile
  from public.admin_profiles
  where user_id = (select auth.uid())
    and is_active = true
    and role in ('super_admin', 'gate_staff');

  if not found then
    raise exception 'Gate access is required.' using errcode = '42501';
  end if;

  if p_ticket_id is null or p_source is null then
    raise exception 'Ticket and source are required.' using errcode = '23514';
  end if;

  perform public.enforce_staff_action_rate_limit('gate_redeem', 90);

  select
    ticket.id,
    ticket.ticket_code,
    ticket.attendee_name,
    ticket.ticket_type_name_snapshot,
    ticket.admission_count,
    ticket.status,
    ticket.checked_in_at,
    ticket.checked_in_by,
    orders.order_number,
    orders.payment_status,
    orders.ticket_issuance_status,
    previous_staff.name as checked_in_by_name
  into locked_ticket
  from public.tickets as ticket
  join public.orders as orders on orders.id = ticket.order_id
  left join public.admin_profiles as previous_staff on previous_staff.id = ticket.checked_in_by
  where ticket.id = p_ticket_id
  for update of ticket;

  if not found then
    return query select
      'invalid'::text, null::uuid, null::text, null::text, null::text,
      null::integer, null::public.ticket_status, null::timestamptz,
      null::text, null::text;
    return;
  end if;

  if locked_ticket.status = 'checked_in' or locked_ticket.checked_in_at is not null then
    return query select
      'already_used'::text,
      locked_ticket.id,
      locked_ticket.ticket_code,
      locked_ticket.attendee_name,
      locked_ticket.ticket_type_name_snapshot,
      locked_ticket.admission_count,
      'checked_in'::public.ticket_status,
      locked_ticket.checked_in_at,
      locked_ticket.checked_in_by_name,
      locked_ticket.order_number;
    return;
  end if;

  if locked_ticket.status = 'cancelled' then
    return query select
      'cancelled'::text,
      locked_ticket.id,
      locked_ticket.ticket_code,
      locked_ticket.attendee_name,
      locked_ticket.ticket_type_name_snapshot,
      locked_ticket.admission_count,
      'cancelled'::public.ticket_status,
      null::timestamptz,
      null::text,
      locked_ticket.order_number;
    return;
  end if;

  if locked_ticket.status <> 'valid'
    or locked_ticket.payment_status <> 'verified'
    or locked_ticket.ticket_issuance_status <> 'issued' then
    return query select
      'invalid'::text,
      locked_ticket.id,
      locked_ticket.ticket_code,
      locked_ticket.attendee_name,
      locked_ticket.ticket_type_name_snapshot,
      locked_ticket.admission_count,
      locked_ticket.status,
      null::timestamptz,
      null::text,
      locked_ticket.order_number;
    return;
  end if;

  update public.tickets
  set status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = actor_profile.id
  where id = locked_ticket.id
    and status = 'valid'
    and checked_in_at is null
  returning public.tickets.checked_in_at into redeemed_at;

  if redeemed_at is null then
    raise exception 'Ticket state changed before redemption.' using errcode = '40001';
  end if;

  insert into public.check_ins (
    ticket_id,
    checked_in_by,
    checked_in_at,
    admission_count,
    source,
    device_information
  ) values (
    locked_ticket.id,
    actor_profile.id,
    redeemed_at,
    locked_ticket.admission_count,
    p_source,
    '{}'::jsonb
  );

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    'tickets.checked_in',
    'ticket',
    locked_ticket.id,
    jsonb_build_object(
      'ticket_code', locked_ticket.ticket_code,
      'admission_count', locked_ticket.admission_count,
      'source', p_source
    )
  );

  return query select
    'checked_in'::text,
    locked_ticket.id,
    locked_ticket.ticket_code,
    locked_ticket.attendee_name,
    locked_ticket.ticket_type_name_snapshot,
    locked_ticket.admission_count,
    'checked_in'::public.ticket_status,
    redeemed_at,
    actor_profile.name,
    locked_ticket.order_number;
end;
$$;

create or replace function public.get_gate_dashboard()
returns table (
  event_name text,
  event_date date,
  venue text,
  venue_capacity integer,
  valid_passes_issued integer,
  passes_checked_in integer,
  passes_remaining integer,
  people_admitted integer,
  maximum_potential_attendance integer,
  check_in_percentage numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_admin_role() not in ('super_admin', 'gate_staff') then
    raise exception 'Gate access is required.' using errcode = '42501';
  end if;

  perform public.enforce_staff_action_rate_limit('gate_dashboard', 120);

  return query
  with eligible_tickets as (
    select ticket.id, ticket.status, ticket.admission_count
    from public.tickets as ticket
    join public.orders as orders on orders.id = ticket.order_id
    where orders.payment_status = 'verified'
      and orders.ticket_issuance_status = 'issued'
      and ticket.status in ('valid', 'checked_in')
  ),
  ticket_totals as (
    select
      count(*)::integer as valid_passes_issued,
      count(*) filter (where status = 'checked_in')::integer as passes_checked_in,
      count(*) filter (where status = 'valid')::integer as passes_remaining,
      coalesce(sum(admission_count), 0)::integer as maximum_potential_attendance
    from eligible_tickets
  ),
  attendance as (
    select coalesce(sum(admission_count), 0)::integer as people_admitted
    from public.check_ins
  )
  select
    settings.event_name,
    settings.event_date,
    settings.venue,
    settings.venue_capacity,
    totals.valid_passes_issued,
    totals.passes_checked_in,
    totals.passes_remaining,
    attendance.people_admitted,
    totals.maximum_potential_attendance,
    case
      when totals.valid_passes_issued = 0 then 0::numeric
      else round((totals.passes_checked_in::numeric / totals.valid_passes_issued::numeric) * 100, 1)
    end
  from public.event_settings as settings
  cross join ticket_totals as totals
  cross join attendance
  where settings.id = 1;
end;
$$;

create or replace function public.search_check_in_history(
  p_query text default null,
  p_from date default null,
  p_to date default null,
  p_limit integer default 300
)
returns table (
  check_in_id uuid,
  checked_in_at timestamptz,
  ticket_code text,
  holder_name text,
  ticket_type_name text,
  admission_count integer,
  source public.check_in_source,
  staff_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')));
  result_limit integer := least(greatest(coalesce(p_limit, 300), 1), 500);
begin
  if public.current_admin_role() is distinct from 'super_admin'::public.admin_role then
    raise exception 'Only a super admin can view check-in history.' using errcode = '42501';
  end if;

  perform public.enforce_staff_action_rate_limit('check_in_history', 40);

  if char_length(normalized_query) > 120
    or (normalized_query <> '' and char_length(normalized_query) < 2) then
    raise exception 'History search is invalid.' using errcode = '23514';
  end if;

  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'History date range is invalid.' using errcode = '23514';
  end if;

  return query
  select
    check_in.id,
    check_in.checked_in_at,
    ticket.ticket_code,
    ticket.attendee_name,
    ticket.ticket_type_name_snapshot,
    check_in.admission_count,
    check_in.source,
    staff.name
  from public.check_ins as check_in
  join public.tickets as ticket on ticket.id = check_in.ticket_id
  join public.admin_profiles as staff on staff.id = check_in.checked_in_by
  where (normalized_query = ''
      or strpos(lower(ticket.ticket_code), normalized_query) > 0
      or strpos(lower(ticket.attendee_name), normalized_query) > 0
      or strpos(lower(ticket.ticket_type_name_snapshot), normalized_query) > 0
      or strpos(lower(staff.name), normalized_query) > 0)
    and (p_from is null or check_in.checked_in_at >= p_from::timestamptz)
    and (p_to is null or check_in.checked_in_at < (p_to + 1)::timestamptz)
  order by check_in.checked_in_at desc
  limit result_limit;
end;
$$;

-- Gate data is available only through the bounded RPCs above. The original
-- table grants would permit directory-style enumeration and are no longer needed.
drop policy if exists "tickets_staff_select" on public.tickets;
drop policy if exists "tickets_super_update" on public.tickets;
drop policy if exists "check_ins_staff_select" on public.check_ins;

revoke select, update on table public.tickets from authenticated;
revoke select (
  id,
  order_id,
  unit_index,
  ticket_code,
  ticket_type_id,
  ticket_type_name_snapshot,
  admission_count,
  attendee_name,
  status,
  issued_at,
  checked_in_at,
  checked_in_by,
  cancelled_at,
  created_at,
  updated_at
) on table public.tickets from authenticated;
revoke update (
  status,
  checked_in_at,
  checked_in_by,
  cancelled_at
) on table public.tickets from authenticated;
revoke select, insert, update, delete, truncate, references, trigger
  on table public.check_ins from authenticated;
revoke all on table public.tickets from anon;
revoke all on table public.check_ins from anon;

revoke all on function public.enforce_staff_action_rate_limit(text, integer)
  from public, anon, authenticated;
revoke all on function public.record_public_validation_request(text)
  from public, anon, authenticated;
revoke all on function public.validate_gate_ticket(text)
  from public, anon;
revoke all on function public.search_gate_tickets(text, integer)
  from public, anon;
revoke all on function public.redeem_gate_ticket(uuid, public.check_in_source)
  from public, anon;
revoke all on function public.get_gate_dashboard()
  from public, anon;
revoke all on function public.search_check_in_history(text, date, date, integer)
  from public, anon;

grant execute on function public.record_public_validation_request(text)
  to service_role;
grant execute on function public.validate_gate_ticket(text)
  to authenticated;
grant execute on function public.search_gate_tickets(text, integer)
  to authenticated;
grant execute on function public.redeem_gate_ticket(uuid, public.check_in_source)
  to authenticated;
grant execute on function public.get_gate_dashboard()
  to authenticated;
grant execute on function public.search_check_in_history(text, date, date, integer)
  to authenticated;
grant usage on type public.check_in_source to authenticated, service_role;

comment on column public.check_ins.admission_count is
  'Immutable admission capacity snapshot redeemed by this one product-unit credential.';
comment on column public.check_ins.source is
  'Operational source of the successful redemption: scanned QR or manual attendee search.';
