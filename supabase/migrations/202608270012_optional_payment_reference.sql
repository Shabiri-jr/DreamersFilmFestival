-- Payment references are not available for every bank/provider transfer.
-- Keep supplied references validated and duplicate-checked, while allowing a
-- customer with a valid private receipt to submit without one.

alter table public.payment_submissions
  drop constraint if exists payment_submissions_payment_reference_check,
  drop constraint if exists payment_submissions_normalized_reference_check,
  alter column payment_reference drop not null,
  alter column normalized_reference drop not null,
  add constraint payment_submissions_payment_reference_optional_check check (
    payment_reference is null
    or char_length(payment_reference) between 3 and 120
  ),
  add constraint payment_submissions_normalized_reference_optional_check check (
    normalized_reference is null
    or (
      char_length(normalized_reference) between 3 and 120
      and normalized_reference = upper(normalized_reference)
      and normalized_reference ~ '^[A-Z0-9]+$'
    )
  ),
  add constraint payment_submissions_reference_pair_check check (
    (payment_reference is null) = (normalized_reference is null)
  );

create or replace function public.submit_customer_payment(
  p_order_id uuid,
  p_idempotency_key uuid,
  p_sender_name text,
  p_sender_bank text,
  p_amount_paid numeric,
  p_payment_reference text,
  p_payment_date date,
  p_payment_time time,
  p_receipt_path text
)
returns public.payment_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_order public.orders%rowtype;
  existing_submission public.payment_submissions%rowtype;
  created_submission public.payment_submissions%rowtype;
  normalized_sender_name text := regexp_replace(btrim(p_sender_name), '\s+', ' ', 'g');
  normalized_sender_bank text := regexp_replace(btrim(p_sender_bank), '\s+', ' ', 'g');
  trimmed_reference text := nullif(btrim(p_payment_reference), '');
  normalized_reference_value text := case
    when nullif(btrim(p_payment_reference), '') is null then null
    else upper(regexp_replace(btrim(p_payment_reference), '[^A-Za-z0-9]', '', 'g'))
  end;
  duplicate_reference boolean := false;
begin
  if p_order_id is null or p_idempotency_key is null then
    raise exception 'Order and submission identifiers are required.'
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

  select *
  into existing_submission
  from public.payment_submissions
  where idempotency_key = p_idempotency_key;

  if found then
    if existing_submission.order_id is distinct from p_order_id then
      raise exception 'Submission identifier is already in use.'
        using errcode = '23505';
    end if;
    return existing_submission;
  end if;

  if locked_order.payment_status = 'submitted' then
    select *
    into existing_submission
    from public.payment_submissions
    where order_id = p_order_id
      and status = 'submitted'
    order by created_at desc
    limit 1;

    if found then
      return existing_submission;
    end if;

    raise exception 'This payment has already been submitted.'
      using errcode = '23514';
  end if;

  if locked_order.payment_status = 'verified' then
    raise exception 'This payment has already been verified.'
      using errcode = '23514';
  end if;

  if locked_order.payment_status = 'cancelled' then
    raise exception 'This order has been cancelled.'
      using errcode = '23514';
  end if;

  if locked_order.payment_status not in ('awaiting_payment', 'rejected') then
    raise exception 'This order cannot accept a payment submission.'
      using errcode = '23514';
  end if;

  if char_length(normalized_sender_name) not between 2 and 120 then
    raise exception 'Enter the account name used for the transfer.'
      using errcode = '23514';
  end if;

  if char_length(normalized_sender_bank) not between 2 and 120 then
    raise exception 'Enter the bank or payment provider used.'
      using errcode = '23514';
  end if;

  if p_amount_paid is null
    or p_amount_paid <= 0
    or p_amount_paid <> trunc(p_amount_paid)
    or p_amount_paid > 9999999999 then
    raise exception 'Enter the whole Naira amount transferred.'
      using errcode = '23514';
  end if;

  if trimmed_reference is not null and (
    char_length(trimmed_reference) not between 3 and 120
    or char_length(normalized_reference_value) not between 3 and 120
  ) then
    raise exception 'Enter a valid transfer reference or leave it blank.'
      using errcode = '23514';
  end if;

  if p_payment_date is null or p_payment_date > current_date then
    raise exception 'Payment date cannot be in the future.'
      using errcode = '23514';
  end if;

  if p_receipt_path is null
    or p_receipt_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'
    or p_receipt_path not like p_order_id::text || '/%' then
    raise exception 'Receipt storage path is invalid.'
      using errcode = '23514';
  end if;

  if normalized_reference_value is not null then
    select exists (
      select 1
      from public.payment_submissions
      where normalized_reference = normalized_reference_value
        and order_id <> p_order_id
    ) into duplicate_reference;

    if duplicate_reference then
      update public.payment_submissions
      set potential_duplicate = true
      where normalized_reference = normalized_reference_value
        and potential_duplicate = false;
    end if;
  end if;

  insert into public.payment_submissions (
    order_id,
    idempotency_key,
    sender_name,
    sender_bank,
    amount_paid,
    expected_amount_snapshot,
    amount_mismatch,
    payment_reference,
    normalized_reference,
    potential_duplicate,
    payment_date,
    payment_time,
    receipt_path,
    status
  ) values (
    p_order_id,
    p_idempotency_key,
    normalized_sender_name,
    normalized_sender_bank,
    p_amount_paid,
    locked_order.total_amount,
    p_amount_paid is distinct from locked_order.total_amount,
    trimmed_reference,
    normalized_reference_value,
    duplicate_reference,
    p_payment_date,
    p_payment_time,
    p_receipt_path,
    'submitted'
  ) returning * into created_submission;

  update public.orders
  set sender_name = created_submission.sender_name,
      sender_bank = created_submission.sender_bank,
      amount_paid = created_submission.amount_paid,
      payment_reference = created_submission.payment_reference,
      payment_date = created_submission.payment_date,
      payment_time = created_submission.payment_time,
      receipt_path = created_submission.receipt_path,
      payment_submitted_at = created_submission.created_at,
      payment_status = 'submitted',
      rejection_reason = null
  where id = locked_order.id;

  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    null,
    'payment.submitted',
    'payment_submission',
    created_submission.id,
    jsonb_build_object(
      'order_id', locked_order.id,
      'order_number', locked_order.order_number,
      'expected_amount', locked_order.total_amount,
      'amount_paid', created_submission.amount_paid,
      'amount_mismatch', created_submission.amount_mismatch,
      'potential_duplicate', created_submission.potential_duplicate
    )
  );

  return created_submission;
end;
$$;

comment on column public.payment_submissions.payment_reference is
  'Optional customer-supplied bank/provider reference. Null when unavailable.';
comment on column public.payment_submissions.normalized_reference is
  'Optional alphanumeric reference used only for duplicate-review hints.';

