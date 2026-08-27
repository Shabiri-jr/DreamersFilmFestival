insert into public.ticket_types (
  name,
  slug,
  description,
  price,
  commission_amount,
  benefits,
  admissions_per_unit,
  quantity_available,
  maximum_per_order,
  is_active
)
values
  (
    'Dreamer',
    'dreamer',
    'Single-person festival admission.',
    3000.00,
    1000.00,
    '["Admits one"]'::jsonb,
    1,
    null,
    null,
    true
  ),
  (
    'D''Shift',
    'd-shift',
    'Single-person festival admission.',
    6000.00,
    2000.00,
    '["Admits one"]'::jsonb,
    1,
    null,
    null,
    true
  ),
  (
    'Network',
    'network',
    'Group festival admission for five people.',
    12000.00,
    4000.00,
    '["Admits five", "One group credential per purchased pass"]'::jsonb,
    5,
    null,
    null,
    true
  ),
  (
    'Solo',
    'solo',
    'Single-person festival admission.',
    25000.00,
    5000.00,
    '["Admits one"]'::jsonb,
    1,
    null,
    null,
    true
  ),
  (
    'Afatakpa',
    'afatakpa',
    'Couples festival admission.',
    70000.00,
    10000.00,
    '["Admits two", "One couple credential per purchased pass"]'::jsonb,
    2,
    null,
    null,
    true
  )
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    price = excluded.price,
    commission_amount = excluded.commission_amount,
    benefits = excluded.benefits,
    admissions_per_unit = excluded.admissions_per_unit,
    is_active = excluded.is_active;

insert into public.event_settings (
  id,
  event_name,
  event_date,
  event_time,
  event_end_time,
  venue,
  support_whatsapp,
  sales_enabled
)
values (
  1,
  'The Dreamers Film Festival',
  '2026-09-26',
  '09:00:00',
  '18:00:00',
  'The Dreamers Hub, Oluyole Estate, Ringroad, Ibadan, Oyo State',
  '+2348093682647',
  true
)
on conflict (id) do update
set event_name = excluded.event_name,
    event_date = excluded.event_date,
    event_time = excluded.event_time,
    event_end_time = excluded.event_end_time,
    venue = excluded.venue,
    support_whatsapp = excluded.support_whatsapp,
    sales_enabled = excluded.sales_enabled;
