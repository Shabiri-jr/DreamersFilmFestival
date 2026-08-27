-- Dreamers Pass Phase 2 customer purchase flow.
-- Public table access remains closed; this RPC is service-role only.

alter table public.orders
  add column checkout_idempotency_key uuid not null default gen_random_uuid()
    constraint orders_checkout_idempotency_key_unique unique;

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
    new.referral_source,
    new.checkout_idempotency_key
  ) is distinct from row(
    old.ticket_type_id,
    old.quantity,
    old.total_amount,
    old.unit_price_snapshot,
    old.commission_rate_snapshot,
    old.promoter_id,
    old.referral_code,
    old.referral_source,
    old.checkout_idempotency_key
  ) then
    raise exception 'Order commercial details and referral attribution are immutable.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.create_customer_order(
  p_checkout_idempotency_key uuid,
  p_ticket_type_id uuid,
  p_quantity integer,
  p_customer_name text,
  p_phone text,
  p_email text default null,
  p_promoter_id uuid default null,
  p_referral_code text default null,
  p_referral_source public.referral_source default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_settings public.event_settings%rowtype;
  current_ticket public.ticket_types%rowtype;
  existing_order public.orders%rowtype;
  created_order public.orders%rowtype;
  generated_order_number text;
begin
  if p_checkout_idempotency_key is null then
    raise exception 'A checkout idempotency key is required.'
      using errcode = '23514';
  end if;

  -- Serialize duplicate submissions before checking/inserting the unique key.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_checkout_idempotency_key::text, 0)
  );

  select *
  into existing_order
  from public.orders
  where checkout_idempotency_key = p_checkout_idempotency_key;

  if found then
    return existing_order;
  end if;

  select *
  into current_settings
  from public.event_settings
  where id = 1
  for share;

  if not found or current_settings.sales_enabled is not true then
    raise exception 'Ticket sales are currently closed.'
      using errcode = 'P0001';
  end if;

  select *
  into current_ticket
  from public.ticket_types
  where id = p_ticket_type_id
  for share;

  if not found or current_ticket.is_active is not true then
    raise exception 'This ticket is no longer available.'
      using errcode = 'P0001';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Please select a valid quantity.'
      using errcode = '23514';
  end if;

  if current_ticket.maximum_per_order is not null
    and p_quantity > current_ticket.maximum_per_order then
    raise exception 'Please select a valid quantity.'
      using errcode = '23514';
  end if;

  if current_ticket.quantity_available is not null
    and p_quantity > current_ticket.quantity_available then
    raise exception 'This ticket is sold out or has insufficient availability.'
      using errcode = 'P0001';
  end if;

  if char_length(btrim(p_customer_name)) not between 2 and 120 then
    raise exception 'Please enter your full name.'
      using errcode = '23514';
  end if;

  if p_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Please enter a valid WhatsApp number.'
      using errcode = '23514';
  end if;

  if p_email is not null
    and char_length(p_email) not between 3 and 254 then
    raise exception 'Please enter a valid email address.'
      using errcode = '23514';
  end if;

  if not (
    (
      p_promoter_id is null
      and p_referral_code is null
      and p_referral_source is null
    )
    or (
      p_promoter_id is not null
      and p_referral_code is not null
      and p_referral_source is not null
    )
  ) then
    raise exception 'Referral attribution is incomplete.'
      using errcode = '23514';
  end if;

  loop
    generated_order_number := 'DFF-' || upper(
      encode(extensions.gen_random_bytes(5), 'hex')
    );
    exit when not exists (
      select 1
      from public.orders
      where order_number = generated_order_number
    );
  end loop;

  insert into public.orders (
    order_number,
    checkout_idempotency_key,
    customer_name,
    phone,
    email,
    ticket_type_id,
    quantity,
    total_amount,
    payment_status,
    promoter_id,
    referral_code,
    referral_source
  ) values (
    generated_order_number,
    p_checkout_idempotency_key,
    btrim(p_customer_name),
    p_phone,
    nullif(lower(btrim(p_email)), ''),
    p_ticket_type_id,
    p_quantity,
    0,
    'awaiting_payment',
    p_promoter_id,
    p_referral_code,
    p_referral_source
  )
  returning * into created_order;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    null,
    'order.created',
    'order',
    created_order.id,
    jsonb_build_object(
      'order_number', created_order.order_number,
      'ticket_type_id', created_order.ticket_type_id,
      'quantity', created_order.quantity,
      'total_amount', created_order.total_amount,
      'referral_source', created_order.referral_source
    )
  );

  return created_order;
end;
$$;

revoke all on function public.create_customer_order(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  uuid,
  text,
  public.referral_source
) from public, anon, authenticated;

grant execute on function public.create_customer_order(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  uuid,
  text,
  public.referral_source
) to service_role;

comment on column public.orders.checkout_idempotency_key is
  'Client-generated UUID used only to collapse accidental duplicate checkout submissions.';
comment on function public.create_customer_order(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  uuid,
  text,
  public.referral_source
) is
  'Service-role-only Phase 2 order creation; validates sales/catalogue and relies on database snapshot triggers.';
