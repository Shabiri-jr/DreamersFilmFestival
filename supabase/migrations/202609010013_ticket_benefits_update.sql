-- Expand customer-facing ticket copy without changing commercial or admission rules.

update public.ticket_types
set description = 'Join The Dreamers Youth Network and get priority access to selected Dreamers opportunities, products and services.',
    benefits = '["Festival admission", "Dreamers Youth Network registration", "Priority access to selected products, services, opportunities + future activities"]'::jsonb
where slug = 'dreamer';

update public.ticket_types
set description = 'Enjoy the festival with popcorn and a drink included.',
    benefits = '["Festival admission", "Popcorn", "Drink"]'::jsonb
where slug = 'd-shift';

update public.ticket_types
set description = 'Bring your people — one discounted pass covering a group of 5, with Dreamers Youth Network registration included.',
    benefits = '["Admission for 5 people on one pass", "Discounted group pricing", "Dreamers Youth Network registration"]'::jsonb
where slug = 'network';

update public.ticket_types
set description = 'Upgrade your festival experience with refreshments and exclusive Dreamers merch.',
    benefits = '["Festival admission", "Refreshments", "Exclusive Dreamers merchandise"]'::jsonb
where slug = 'solo';

update public.ticket_types
set description = 'The full VVIP Dreamers experience — private setup, food, refreshments, personal screening and exclusive merch.',
    benefits = '["Private room + personal TV screening", "Food + refreshments", "Exclusive Dreamers merchandise", "Premium VVIP treatment"]'::jsonb
where slug = 'afatakpa';
