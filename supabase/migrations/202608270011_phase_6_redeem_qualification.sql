-- Qualify the locked update predicate because the table-returning function also
-- exposes a checked_in_at output variable in PL/pgSQL scope.

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

  update public.tickets as target_ticket
  set status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = actor_profile.id
  where target_ticket.id = locked_ticket.id
    and target_ticket.status = 'valid'
    and target_ticket.checked_in_at is null
  returning target_ticket.checked_in_at into redeemed_at;

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

revoke all on function public.redeem_gate_ticket(uuid, public.check_in_source)
  from public, anon;
grant execute on function public.redeem_gate_ticket(uuid, public.check_in_source)
  to authenticated;
