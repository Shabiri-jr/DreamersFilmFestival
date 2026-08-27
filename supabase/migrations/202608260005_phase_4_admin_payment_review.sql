-- Dreamers Pass Phase 4: authenticated payment review and commission activation.
-- Ticket/QR issuance is deliberately excluded and remains a Phase 5 concern.

alter table public.orders
  add column rejected_at timestamptz,
  add column rejected_by uuid references public.admin_profiles (id) on delete set null;

create index orders_rejected_by_idx
  on public.orders (rejected_by)
  where rejected_by is not null;

create index orders_customer_name_search_idx
  on public.orders (lower(customer_name) text_pattern_ops);
create index orders_sender_name_search_idx
  on public.orders (lower(sender_name) text_pattern_ops)
  where sender_name is not null;
create index orders_payment_reference_search_idx
  on public.orders (lower(payment_reference) text_pattern_ops)
  where payment_reference is not null;
create index promoters_name_search_idx
  on public.promoters (lower(name) text_pattern_ops);

-- Finance mutations are RPC-only from Phase 4 onward. RLS remains useful for
-- reads, but authenticated clients cannot directly alter order state.
drop policy if exists "orders_finance_staff_update" on public.orders;
revoke update on table public.orders from authenticated;

create or replace function public.clear_rejection_on_resubmission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.payment_status = 'rejected' and new.payment_status = 'submitted' then
    new.rejected_at = null;
    new.rejected_by = null;
  end if;
  return new;
end;
$$;

create trigger orders_clear_rejection_on_resubmission
before update of payment_status on public.orders
for each row execute function public.clear_rejection_on_resubmission();

create or replace function public.verify_customer_payment(
  p_order_id uuid,
  p_submission_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.admin_profiles%rowtype;
  locked_order public.orders%rowtype;
  reviewed_order public.orders%rowtype;
  active_submission public.payment_submissions%rowtype;
begin
  select *
  into actor_profile
  from public.admin_profiles
  where user_id = (select auth.uid())
    and is_active = true
    and role in ('super_admin', 'payment_admin');

  if not found then
    raise exception 'You do not have permission to verify payments.'
      using errcode = '42501';
  end if;

  if p_order_id is null or p_submission_id is null then
    raise exception 'Order and payment submission are required.'
      using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_order_id::text, 0)
  );

  select *
  into locked_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if locked_order.payment_status = 'verified' then
    raise exception 'This payment has already been verified.'
      using errcode = '23514';
  end if;

  if locked_order.payment_status <> 'submitted' then
    raise exception 'This payment has already been reviewed.'
      using errcode = '23514';
  end if;

  select *
  into active_submission
  from public.payment_submissions
  where id = p_submission_id
    and order_id = p_order_id
    and status = 'submitted'
  for update;

  if not found then
    raise exception 'The active payment submission is unavailable or already reviewed.'
      using errcode = '23514';
  end if;

  update public.payment_submissions
  set status = 'accepted'
  where id = active_submission.id;

  update public.orders
  set payment_status = 'verified',
      verified_at = now(),
      verified_by = actor_profile.id,
      rejection_reason = null,
      rejected_at = null,
      rejected_by = null
  where id = locked_order.id
  returning * into reviewed_order;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    'payment.verified',
    'order',
    reviewed_order.id,
    jsonb_build_object(
      'order_number', reviewed_order.order_number,
      'submission_id', active_submission.id,
      'previous_status', locked_order.payment_status,
      'new_status', reviewed_order.payment_status,
      'expected_amount', reviewed_order.total_amount,
      'submitted_amount', active_submission.amount_paid,
      'amount_mismatch', active_submission.amount_mismatch,
      'potential_duplicate', active_submission.potential_duplicate
    )
  );

  return reviewed_order;
end;
$$;

create or replace function public.reject_customer_payment(
  p_order_id uuid,
  p_submission_id uuid,
  p_reason text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.admin_profiles%rowtype;
  locked_order public.orders%rowtype;
  reviewed_order public.orders%rowtype;
  active_submission public.payment_submissions%rowtype;
  normalized_reason text := regexp_replace(btrim(p_reason), '\s+', ' ', 'g');
begin
  select *
  into actor_profile
  from public.admin_profiles
  where user_id = (select auth.uid())
    and is_active = true
    and role in ('super_admin', 'payment_admin');

  if not found then
    raise exception 'You do not have permission to reject payments.'
      using errcode = '42501';
  end if;

  if p_order_id is null or p_submission_id is null then
    raise exception 'Order and payment submission are required.'
      using errcode = '23514';
  end if;

  if normalized_reason is null
    or char_length(normalized_reason) not between 3 and 1000 then
    raise exception 'A rejection reason between 3 and 1000 characters is required.'
      using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_order_id::text, 0)
  );

  select *
  into locked_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if locked_order.payment_status <> 'submitted' then
    raise exception 'This payment has already been reviewed.'
      using errcode = '23514';
  end if;

  select *
  into active_submission
  from public.payment_submissions
  where id = p_submission_id
    and order_id = p_order_id
    and status = 'submitted'
  for update;

  if not found then
    raise exception 'The active payment submission is unavailable or already reviewed.'
      using errcode = '23514';
  end if;

  update public.payment_submissions
  set status = 'rejected'
  where id = active_submission.id;

  update public.orders
  set payment_status = 'rejected',
      rejection_reason = normalized_reason,
      rejected_at = now(),
      rejected_by = actor_profile.id
  where id = locked_order.id
  returning * into reviewed_order;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    'payment.rejected',
    'order',
    reviewed_order.id,
    jsonb_build_object(
      'order_number', reviewed_order.order_number,
      'submission_id', active_submission.id,
      'previous_status', locked_order.payment_status,
      'new_status', reviewed_order.payment_status,
      'reason', normalized_reason
    )
  );

  return reviewed_order;
end;
$$;

create or replace function public.search_admin_payment_orders(
  p_status text default 'submitted',
  p_query text default null,
  p_limit integer default 100
)
returns table (
  order_id uuid,
  order_number text,
  customer_name text,
  phone text,
  ticket_name text,
  quantity integer,
  expected_amount numeric,
  submitted_amount numeric,
  promoter_name text,
  referral_code text,
  payment_status public.payment_status,
  payment_submitted_at timestamptz,
  submission_id uuid,
  amount_mismatch boolean,
  potential_duplicate boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(p_query));
  result_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if public.current_admin_role() not in ('super_admin', 'payment_admin') then
    raise exception 'You do not have permission to view payment orders.'
      using errcode = '42501';
  end if;

  if p_status is not null
    and p_status not in (
      'awaiting_payment', 'submitted', 'verified', 'rejected', 'cancelled'
    ) then
    raise exception 'Invalid payment status filter.' using errcode = '23514';
  end if;

  if normalized_query is not null and char_length(normalized_query) > 120 then
    raise exception 'Search query is too long.' using errcode = '23514';
  end if;

  return query
  select
    orders.id,
    orders.order_number,
    orders.customer_name,
    orders.phone,
    ticket_types.name,
    orders.quantity,
    orders.total_amount,
    latest_submission.amount_paid,
    promoters.name,
    orders.referral_code,
    orders.payment_status,
    orders.payment_submitted_at,
    latest_submission.id,
    coalesce(latest_submission.amount_mismatch, false),
    coalesce(latest_submission.potential_duplicate, false)
  from public.orders as orders
  join public.ticket_types as ticket_types
    on ticket_types.id = orders.ticket_type_id
  left join public.promoters as promoters
    on promoters.id = orders.promoter_id
  left join lateral (
    select submission.*
    from public.payment_submissions as submission
    where submission.order_id = orders.id
    order by submission.created_at desc
    limit 1
  ) as latest_submission on true
  where (p_status is null or orders.payment_status::text = p_status)
    and (
      normalized_query is null
      or normalized_query = ''
      or lower(orders.order_number) like '%' || normalized_query || '%'
      or lower(orders.customer_name) like '%' || normalized_query || '%'
      or lower(orders.phone) like '%' || normalized_query || '%'
      or lower(coalesce(orders.payment_reference, '')) like '%' || normalized_query || '%'
      or lower(coalesce(orders.sender_name, '')) like '%' || normalized_query || '%'
      or lower(coalesce(promoters.name, '')) like '%' || normalized_query || '%'
      or lower(coalesce(orders.referral_code, '')) like '%' || normalized_query || '%'
    )
  order by coalesce(orders.payment_submitted_at, orders.created_at) desc
  limit result_limit;
end;
$$;

revoke all on function public.verify_customer_payment(uuid, uuid)
  from public, anon;
revoke all on function public.reject_customer_payment(uuid, uuid, text)
  from public, anon;
revoke all on function public.search_admin_payment_orders(text, text, integer)
  from public, anon;

grant execute on function public.verify_customer_payment(uuid, uuid)
  to authenticated;
grant execute on function public.reject_customer_payment(uuid, uuid, text)
  to authenticated;
grant execute on function public.search_admin_payment_orders(text, text, integer)
  to authenticated;

comment on function public.verify_customer_payment(uuid, uuid) is
  'Finance-admin-only atomic acceptance and verification. Existing order trigger activates one snapshot commission. Does not issue tickets.';
comment on function public.reject_customer_payment(uuid, uuid, text) is
  'Finance-admin-only atomic rejection preserving submission history and cancelling any pending commission.';
comment on function public.search_admin_payment_orders(text, text, integer) is
  'Bounded, finance-admin-only payment queue search without receipt paths.';
