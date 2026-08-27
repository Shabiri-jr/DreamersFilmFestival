-- Dreamers Pass promoter/referral commission foundation.
-- This migration preserves the existing single-ticket-type order model.

create type public.referral_source as enum (
  'referral_link',
  'manual_code'
);

create type public.commission_status as enum (
  'pending',
  'earned',
  'paid',
  'cancelled'
);

create table public.promoters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  email text check (email is null or char_length(email) between 3 and 254),
  referral_code text not null unique
    check (
      referral_code = upper(btrim(referral_code))
      and referral_code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'
    ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticket_types
  add column commission_amount numeric(12, 2) not null default 0
    constraint ticket_types_commission_amount_nonnegative
    check (commission_amount >= 0);

update public.ticket_types
set commission_amount = case slug
  when 'dreamer' then 1000.00
  when 'd-shift' then 2000.00
  when 'network' then 4000.00
  when 'solo' then 5000.00
  when 'afatakpa' then 10000.00
  else commission_amount
end;

alter table public.orders
  add column promoter_id uuid references public.promoters (id) on delete restrict,
  add column referral_code text,
  add column referral_source public.referral_source,
  add column unit_price_snapshot numeric(12, 2),
  add column commission_rate_snapshot numeric(12, 2);

-- Backfill safely for any pre-feature orders. Existing non-referred orders never
-- create commission rows, but still receive durable commercial snapshots.
update public.orders as orders
set unit_price_snapshot = orders.total_amount / orders.quantity,
    commission_rate_snapshot = ticket_types.commission_amount
from public.ticket_types as ticket_types
where ticket_types.id = orders.ticket_type_id;

alter table public.orders
  alter column unit_price_snapshot set not null,
  alter column commission_rate_snapshot set not null,
  add constraint orders_unit_price_snapshot_nonnegative
    check (unit_price_snapshot >= 0),
  add constraint orders_commission_rate_snapshot_nonnegative
    check (commission_rate_snapshot >= 0),
  add constraint orders_referral_code_normalized
    check (
      referral_code is null
      or (
        referral_code = upper(btrim(referral_code))
        and referral_code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'
      )
    ),
  add constraint orders_referral_attribution_complete
    check (
      (
        promoter_id is null
        and referral_code is null
        and referral_source is null
      )
      or (
        promoter_id is not null
        and referral_code is not null
        and referral_source is not null
      )
    );

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.promoters (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  status public.commission_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  earned_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
    check (
      cancellation_reason is null
      or char_length(cancellation_reason) between 3 and 1000
    ),
  constraint commissions_state_timestamps_valid check (
    (
      status = 'pending'
      and earned_at is null
      and paid_at is null
      and cancelled_at is null
      and cancellation_reason is null
    )
    or (
      status = 'earned'
      and earned_at is not null
      and paid_at is null
      and cancelled_at is null
      and cancellation_reason is null
    )
    or (
      status = 'paid'
      and earned_at is not null
      and paid_at is not null
      and cancelled_at is null
      and cancellation_reason is null
    )
    or (
      status = 'cancelled'
      and cancelled_at is not null
      and cancellation_reason is not null
    )
  )
);

create index promoters_active_idx
  on public.promoters (is_active, created_at desc);
create index orders_promoter_id_created_at_idx
  on public.orders (promoter_id, created_at desc)
  where promoter_id is not null;
create index commissions_promoter_status_idx
  on public.commissions (promoter_id, status, created_at desc);

create or replace function public.normalize_promoter_referral_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.referral_code = upper(btrim(new.referral_code));
  return new;
end;
$$;

create trigger promoters_normalize_referral_code
before insert or update of referral_code on public.promoters
for each row execute function public.normalize_promoter_referral_code();

create trigger promoters_set_updated_at
before update on public.promoters
for each row execute function public.set_updated_at();

create trigger commissions_set_updated_at
before update on public.commissions
for each row execute function public.set_updated_at();

create or replace function public.prepare_order_commercial_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_ticket public.ticket_types%rowtype;
  attributed_promoter public.promoters%rowtype;
begin
  select *
  into current_ticket
  from public.ticket_types
  where id = new.ticket_type_id
    and is_active = true;

  if not found then
    raise exception 'Ticket type is invalid or inactive.'
      using errcode = '23514';
  end if;

  new.unit_price_snapshot = current_ticket.price;
  new.commission_rate_snapshot = current_ticket.commission_amount;
  new.total_amount = current_ticket.price * new.quantity;
  new.payment_status = 'awaiting_payment';

  if new.promoter_id is null
    and new.referral_code is null
    and new.referral_source is null then
    return new;
  end if;

  if new.promoter_id is null
    or new.referral_code is null
    or new.referral_source is null then
    raise exception 'Referral attribution must include promoter, code, and source.'
      using errcode = '23514';
  end if;

  new.referral_code = upper(btrim(new.referral_code));

  select *
  into attributed_promoter
  from public.promoters
  where id = new.promoter_id
    and referral_code = new.referral_code
    and is_active = true;

  if not found then
    raise exception 'Referral code is invalid or inactive.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger orders_prepare_commercial_snapshot
before insert on public.orders
for each row execute function public.prepare_order_commercial_snapshot();

create or replace function public.protect_order_commercial_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.ticket_type_id,
    new.quantity,
    new.total_amount,
    new.unit_price_snapshot,
    new.commission_rate_snapshot,
    new.promoter_id,
    new.referral_code,
    new.referral_source
  ) is distinct from row(
    old.ticket_type_id,
    old.quantity,
    old.total_amount,
    old.unit_price_snapshot,
    old.commission_rate_snapshot,
    old.promoter_id,
    old.referral_code,
    old.referral_source
  ) then
    raise exception 'Order commercial details and referral attribution are immutable.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger orders_protect_commercial_fields
before update on public.orders
for each row execute function public.protect_order_commercial_fields();

create or replace function public.enforce_order_payment_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_status = old.payment_status then
    return new;
  end if;

  if not (
    (old.payment_status = 'awaiting_payment' and new.payment_status in ('submitted', 'cancelled'))
    or (old.payment_status = 'submitted' and new.payment_status in ('verified', 'rejected', 'cancelled'))
    or (old.payment_status = 'rejected' and new.payment_status in ('submitted', 'cancelled'))
    or (old.payment_status = 'verified' and new.payment_status = 'cancelled')
  ) then
    raise exception 'Invalid payment status transition from % to %.',
      old.payment_status,
      new.payment_status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger orders_enforce_payment_transition
before update of payment_status on public.orders
for each row execute function public.enforce_order_payment_transition();

create or replace function public.validate_commission_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_promoter_id uuid;
  expected_amount numeric(12, 2);
begin
  select
    orders.promoter_id,
    orders.quantity * orders.commission_rate_snapshot
  into expected_promoter_id, expected_amount
  from public.orders
  where orders.id = new.order_id;

  if expected_promoter_id is null
    or new.promoter_id is distinct from expected_promoter_id
    or new.amount is distinct from expected_amount then
    raise exception 'Commission does not match the attributed order snapshot.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger commissions_validate_amount
before insert or update on public.commissions
for each row execute function public.validate_commission_amount();

create or replace function public.sync_order_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_amount numeric(12, 2);
  existing_status public.commission_status;
  automatic_cancellation_reason text;
begin
  if tg_op = 'UPDATE' and new.payment_status = old.payment_status then
    return new;
  end if;

  if new.promoter_id is null then
    return new;
  end if;

  snapshot_amount := new.quantity * new.commission_rate_snapshot;

  if new.payment_status = 'submitted' then
    insert into public.commissions (
      promoter_id,
      order_id,
      amount,
      status
    ) values (
      new.promoter_id,
      new.id,
      snapshot_amount,
      'pending'
    )
    on conflict (order_id) do update
    set status = 'pending',
        earned_at = null,
        paid_at = null,
        cancelled_at = null,
        cancellation_reason = null
    where public.commissions.status = 'cancelled'
      and public.commissions.paid_at is null
    returning status into existing_status;

    if found then
      insert into public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        (select auth.uid()),
        'commission.pending',
        'order',
        new.id,
        jsonb_build_object(
          'promoter_id', new.promoter_id,
          'amount', snapshot_amount
        )
      );
    end if;
  elsif new.payment_status = 'verified' then
    insert into public.commissions (
      promoter_id,
      order_id,
      amount,
      status,
      earned_at
    ) values (
      new.promoter_id,
      new.id,
      snapshot_amount,
      'earned',
      now()
    )
    on conflict (order_id) do update
    set status = 'earned',
        earned_at = coalesce(public.commissions.earned_at, now()),
        paid_at = null,
        cancelled_at = null,
        cancellation_reason = null
    where public.commissions.status in ('pending', 'earned')
      or (
        public.commissions.status = 'cancelled'
        and public.commissions.paid_at is null
      )
    returning status into existing_status;

    if found then
      insert into public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        (select auth.uid()),
        'commission.earned',
        'order',
        new.id,
        jsonb_build_object(
          'promoter_id', new.promoter_id,
          'amount', snapshot_amount
        )
      );
    end if;
  elsif new.payment_status in ('rejected', 'cancelled') then
    select status
    into existing_status
    from public.commissions
    where order_id = new.id;

    if existing_status = 'paid' then
      raise exception 'Reverse the paid commission before rejecting or cancelling this order.'
        using errcode = '23514';
    end if;

    automatic_cancellation_reason := case
      when new.payment_status = 'rejected' then 'Payment rejected'
      else 'Order cancelled'
    end;

    update public.commissions
    set status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = automatic_cancellation_reason
    where order_id = new.id
      and status in ('pending', 'earned')
    returning status into existing_status;

    if found then
      insert into public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        (select auth.uid()),
        'commission.cancelled',
        'order',
        new.id,
        jsonb_build_object(
          'promoter_id', new.promoter_id,
          'amount', snapshot_amount,
          'reason', automatic_cancellation_reason
        )
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger orders_sync_commission
after insert or update of payment_status on public.orders
for each row execute function public.sync_order_commission();

create or replace function public.mark_commission_paid(
  commission_id uuid
)
returns public.commissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid_commission public.commissions%rowtype;
begin
  if public.current_admin_role() is distinct from 'super_admin' then
    raise exception 'Only a super admin can mark commissions as paid.'
      using errcode = '42501';
  end if;

  select *
  into paid_commission
  from public.commissions
  where id = commission_id
  for update;

  if not found then
    raise exception 'Commission not found.' using errcode = 'P0002';
  end if;

  if paid_commission.status = 'paid' then
    return paid_commission;
  end if;

  if paid_commission.status <> 'earned' then
    raise exception 'Only earned commissions can be marked paid.'
      using errcode = '23514';
  end if;

  update public.commissions
  set status = 'paid',
      paid_at = now()
  where id = commission_id
  returning * into paid_commission;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    'commission.paid',
    'commission',
    paid_commission.id,
    jsonb_build_object(
      'order_id', paid_commission.order_id,
      'promoter_id', paid_commission.promoter_id,
      'amount', paid_commission.amount
    )
  );

  return paid_commission;
end;
$$;

create or replace function public.cancel_commission(
  commission_id uuid,
  reason text
)
returns public.commissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_commission public.commissions%rowtype;
  audit_action text;
  normalized_reason text := btrim(reason);
begin
  if public.current_admin_role() is distinct from 'super_admin' then
    raise exception 'Only a super admin can cancel or reverse commissions.'
      using errcode = '42501';
  end if;

  if normalized_reason is null
    or char_length(normalized_reason) not between 3 and 1000 then
    raise exception 'A cancellation reason between 3 and 1000 characters is required.'
      using errcode = '23514';
  end if;

  select *
  into cancelled_commission
  from public.commissions
  where id = commission_id
  for update;

  if not found then
    raise exception 'Commission not found.' using errcode = 'P0002';
  end if;

  if cancelled_commission.status = 'cancelled' then
    return cancelled_commission;
  end if;

  audit_action := case
    when cancelled_commission.status = 'paid' then 'commission.reversed'
    else 'commission.cancelled'
  end;

  update public.commissions
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = normalized_reason
  where id = commission_id
  returning * into cancelled_commission;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    audit_action,
    'commission',
    cancelled_commission.id,
    jsonb_build_object(
      'order_id', cancelled_commission.order_id,
      'promoter_id', cancelled_commission.promoter_id,
      'amount', cancelled_commission.amount,
      'reason', normalized_reason
    )
  );

  return cancelled_commission;
end;
$$;

revoke all on function public.mark_commission_paid(uuid) from public, anon;
revoke all on function public.cancel_commission(uuid, text) from public, anon;
grant execute on function public.mark_commission_paid(uuid)
  to authenticated, service_role;
grant execute on function public.cancel_commission(uuid, text)
  to authenticated, service_role;

alter table public.promoters enable row level security;
alter table public.commissions enable row level security;

create policy "promoters_finance_staff_select"
on public.promoters for select to authenticated
using (public.current_admin_role() in ('super_admin', 'payment_admin'));

create policy "promoters_super_insert"
on public.promoters for insert to authenticated
with check (public.current_admin_role() = 'super_admin');

create policy "promoters_super_update"
on public.promoters for update to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');

create policy "commissions_finance_staff_select"
on public.commissions for select to authenticated
using (public.current_admin_role() in ('super_admin', 'payment_admin'));

grant usage on type public.referral_source, public.commission_status
  to authenticated, service_role;
grant select, insert, update on public.promoters to authenticated;
grant select on public.commissions to authenticated;
grant all on public.promoters, public.commissions to service_role;

revoke all on table public.promoters from anon;
revoke all on table public.commissions from anon;

comment on column public.ticket_types.commission_amount is
  'Current promoter commission per purchased product unit; new orders snapshot this value.';
comment on column public.orders.unit_price_snapshot is
  'Ticket unit price captured by the database when the order is created.';
comment on column public.orders.commission_rate_snapshot is
  'Promoter commission per purchased product unit captured when the order is created.';
comment on table public.commissions is
  'One idempotent promoter commission lifecycle record per referred order.';
comment on column public.promoters.referral_code is
  'Normalized code used to derive APP_ORIGIN/tickets?ref=CODE; links are not stored.';
