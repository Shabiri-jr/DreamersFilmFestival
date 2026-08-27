-- Align customer-facing catalogue copy with the Phase 5 credential model.

update public.ticket_types
set benefits = '["Admits five", "One group credential per purchased pass"]'::jsonb
where slug = 'network';

update public.ticket_types
set benefits = '["Admits two", "One couple credential per purchased pass"]'::jsonb
where slug = 'afatakpa';
