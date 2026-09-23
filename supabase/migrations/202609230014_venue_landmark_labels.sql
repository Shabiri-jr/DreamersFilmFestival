-- Coordinates and source links stay fixed; organisers can rename the public pins.
create table public.venue_landmark_labels (
  landmark_id text primary key check (landmark_id in (
    'rehoboth-cathedral', 'mobil-ring-road', 'solam-event-center',
    'landmark-4', 'landmark-5', 'landmark-6'
  )),
  label text not null check (char_length(btrim(label)) between 2 and 80)
);

alter table public.venue_landmark_labels enable row level security;

create policy "venue_landmark_labels_super_select"
on public.venue_landmark_labels for select to authenticated
using (public.current_admin_role() = 'super_admin');

create policy "venue_landmark_labels_super_insert"
on public.venue_landmark_labels for insert to authenticated
with check (public.current_admin_role() = 'super_admin');

create policy "venue_landmark_labels_super_update"
on public.venue_landmark_labels for update to authenticated
using (public.current_admin_role() = 'super_admin')
with check (public.current_admin_role() = 'super_admin');

revoke all on table public.venue_landmark_labels from anon, authenticated;
grant select, insert, update on table public.venue_landmark_labels to authenticated;
grant all on table public.venue_landmark_labels to service_role;
