-- Dreamers Pass Phase 1 foundation
-- Private customer/payment data is server-mediated. RLS starts closed and
-- grants only the minimum authenticated staff access needed by future phases.

create extension if not exists pgcrypto with schema extensions;

create type public.admin_role as enum (
  'super_admin',
  'payment_admin',
  'gate_staff'
);

create type public.payment_status as enum (
  'awaiting_payment',
  'submitted',
  'verified',
  'rejected',
  'cancelled'
);

create type public.ticket_status as enum (
  'valid',
  'checked_in',
  'cancelled'
);

create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  role public.admin_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(benefits) = 'array'),
  admissions_per_unit integer not null default 1 check (admissions_per_unit between 1 and 20),
  quantity_available integer check (quantity_available is null or quantity_available >= 0),
  maximum_per_order integer check (maximum_per_order is null or maximum_per_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^DFF-[A-Z0-9]{6,12}$'),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  email text check (email is null or char_length(email) between 3 and 254),
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  payment_status public.payment_status not null default 'awaiting_payment',
  sender_name text check (sender_name is null or char_length(sender_name) between 2 and 120),
  amount_paid numeric(12, 2) check (amount_paid is null or amount_paid >= 0),
  sender_bank text check (sender_bank is null or char_length(sender_bank) <= 120),
  payment_reference text check (payment_reference is null or char_length(payment_reference) <= 120),
  payment_date date,
  receipt_path text check (receipt_path is null or char_length(receipt_path) <= 500),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.admin_profiles (id) on delete set null
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  ticket_code text not null unique check (ticket_code ~ '^DFF-[A-Z0-9-]{6,24}$'),
  qr_token text not null unique default encode(extensions.gen_random_bytes(32), 'hex')
    check (char_length(qr_token) = 64),
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  attendee_name text not null check (char_length(attendee_name) between 2 and 120),
  status public.ticket_status not null default 'valid',
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references public.admin_profiles (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint checked_in_state_is_complete check (
    status <> 'checked_in' or (checked_in_at is not null and checked_in_by is not null)
  ),
  constraint cancelled_state_has_time check (
    status <> 'cancelled' or cancelled_at is not null
  )
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets (id) on delete restrict,
  checked_in_by uuid not null references public.admin_profiles (id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  device_information jsonb not null default '{}'::jsonb
    check (jsonb_typeof(device_information) = 'object')
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 2 and 120),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.event_settings (
  id smallint primary key default 1 check (id = 1),
  event_name text not null check (char_length(event_name) between 2 and 160),
  event_date date not null,
  event_time time not null,
  event_end_time time,
  venue text not null check (char_length(venue) between 2 and 300),
  venue_capacity integer check (venue_capacity is null or venue_capacity > 0),
  support_whatsapp text not null check (support_whatsapp ~ '^\+?[0-9]{7,15}$'),
  bank_name text check (bank_name is null or char_length(bank_name) <= 120),
  account_name text check (account_name is null or char_length(account_name) <= 160),
  account_number text check (account_number is null or account_number ~ '^[0-9]{6,20}$'),
  sales_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

create index orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);
create index orders_phone_idx on public.orders (phone);
create index orders_ticket_type_id_idx on public.orders (ticket_type_id);
create index tickets_order_id_idx on public.tickets (order_id);
create index tickets_ticket_type_id_idx on public.tickets (ticket_type_id);
create index tickets_status_idx on public.tickets (status);
create index tickets_attendee_name_idx on public.tickets (lower(attendee_name));
create index check_ins_checked_in_at_idx on public.check_ins (checked_in_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create trigger ticket_types_set_updated_at
before update on public.ticket_types
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger event_settings_set_updated_at
before update on public.event_settings
for each row execute function public.set_updated_at();

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.admin_profiles as profile
  where profile.user_id = (select auth.uid())
    and profile.is_active = true
  limit 1
$$;

revoke all on function public.current_admin_role() from public, anon;
grant execute on function public.current_admin_role() to authenticated, service_role;

alter table public.admin_profiles enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.check_ins enable row level security;
alter table public.audit_logs enable row level security;
alter table public.event_settings enable row level security;

-- Authenticated staff can see their own profile. Super admins can manage staff.
create policy "admin_profiles_select_self_or_super"
on public.admin_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or public.current_admin_role() = 'super_admin'
);

create policy "admin_profiles_super_insert"
on public.admin_profiles for insert to authenticated
with check (public.current_admin_role() = 'super_admin');

create policy "admin_profiles_super_update"
on public.admin_profiles for update to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');

create policy "admin_profiles_super_delete"
on public.admin_profiles for delete to authenticated
using (public.current_admin_role() = 'super_admin');

-- Active staff need ticket labels; only super admins manage the catalogue.
create policy "ticket_types_staff_select"
on public.ticket_types for select to authenticated
using (public.current_admin_role() is not null);

create policy "ticket_types_super_insert"
on public.ticket_types for insert to authenticated
with check (public.current_admin_role() = 'super_admin');

create policy "ticket_types_super_update"
on public.ticket_types for update to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');

create policy "ticket_types_super_delete"
on public.ticket_types for delete to authenticated
using (public.current_admin_role() = 'super_admin');

-- Gate staff cannot see orders, receipts, bank details, or revenue.
create policy "orders_finance_staff_select"
on public.orders for select to authenticated
using (public.current_admin_role() in ('super_admin', 'payment_admin'));

create policy "orders_finance_staff_update"
on public.orders for update to authenticated
using (public.current_admin_role() in ('super_admin', 'payment_admin'))
with check (public.current_admin_role() in ('super_admin', 'payment_admin'));

-- All active staff can validate ticket details. Mutations are server-mediated.
create policy "tickets_staff_select"
on public.tickets for select to authenticated
using (public.current_admin_role() is not null);

create policy "tickets_super_update"
on public.tickets for update to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');

create policy "check_ins_staff_select"
on public.check_ins for select to authenticated
using (public.current_admin_role() is not null);

create policy "audit_logs_super_select"
on public.audit_logs for select to authenticated
using (public.current_admin_role() = 'super_admin');

create policy "event_settings_finance_select"
on public.event_settings for select to authenticated
using (public.current_admin_role() in ('super_admin', 'payment_admin'));

create policy "event_settings_super_update"
on public.event_settings for update to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');

grant usage on schema public to authenticated, service_role;
grant usage on type public.admin_role, public.payment_status, public.ticket_status
  to authenticated, service_role;

grant select, insert, update, delete on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.ticket_types to authenticated;
grant select, update on public.orders to authenticated;
grant select (
  id,
  order_id,
  ticket_code,
  ticket_type_id,
  attendee_name,
  status,
  issued_at,
  checked_in_at,
  checked_in_by,
  cancelled_at,
  created_at
) on table public.tickets to authenticated;
grant update (
  status,
  checked_in_at,
  checked_in_by,
  cancelled_at
) on table public.tickets to authenticated;
grant select on public.check_ins to authenticated;
grant select on public.audit_logs to authenticated;
grant select, update on public.event_settings to authenticated;

revoke all on table public.admin_profiles from anon;
revoke all on table public.ticket_types from anon;
revoke all on table public.orders from anon;
revoke all on table public.tickets from anon;
revoke all on table public.check_ins from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.event_settings from anon;

-- Receipt objects remain private. No anon/authenticated object policies are
-- created in Phase 1; later uploads and signed downloads run through validated
-- server-side code with random object paths and audit logging.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

comment on column public.ticket_types.admissions_per_unit is
  'Independent attendee tickets created for one purchased product unit.';
comment on column public.orders.quantity is
  'Number of ticket product units purchased, not the number of QR credentials.';
comment on column public.tickets.qr_token is
  'Cryptographically random secret used as QR credential material; do not expose in lists or logs.';
