-- Remove Supabase default table-wide privileges before applying explicit safe
-- ticket column grants. RLS chooses rows; column grants protect credentials.

revoke select, insert, update, delete, truncate, references, trigger
  on table public.tickets from authenticated;

grant select (
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
) on table public.tickets to authenticated;

grant update (
  status,
  checked_in_at,
  checked_in_by,
  cancelled_at
) on table public.tickets to authenticated;

revoke all on table public.tickets from anon;
