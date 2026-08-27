-- Phase 4 follow-up: accelerate case-insensitive contains-search used by the
-- admin payment queue. These indexes do not expose data or change behavior.

create extension if not exists pg_trgm with schema extensions;

create index orders_order_number_trgm_idx
  on public.orders using gin (lower(order_number) extensions.gin_trgm_ops);
create index orders_customer_name_trgm_idx
  on public.orders using gin (lower(customer_name) extensions.gin_trgm_ops);
create index orders_phone_trgm_idx
  on public.orders using gin (lower(phone) extensions.gin_trgm_ops);
create index orders_sender_name_trgm_idx
  on public.orders using gin (lower(sender_name) extensions.gin_trgm_ops)
  where sender_name is not null;
create index orders_payment_reference_trgm_idx
  on public.orders using gin (lower(payment_reference) extensions.gin_trgm_ops)
  where payment_reference is not null;
create index orders_referral_code_trgm_idx
  on public.orders using gin (lower(referral_code) extensions.gin_trgm_ops)
  where referral_code is not null;
create index promoters_name_trgm_idx
  on public.promoters using gin (lower(name) extensions.gin_trgm_ops);
