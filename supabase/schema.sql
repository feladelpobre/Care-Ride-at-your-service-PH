-- Care Ride at your service-PH bookings table (spec §7, architecture §5)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_name text not null check (char_length(contact_name) between 2 and 60),
  contact_phone text,
  pickup_area text,
  destination text,
  appointment_date date,
  appointment_time text,
  pickup_time text,
  distance_km numeric(5,1) not null default 10,
  companion_hours int not null default 0 check (companion_hours between 0 and 12),
  wheelchair_rental boolean not null default false,
  senior_pwd_discount boolean not null default false, -- ID is checked by the driver; the ID number is NOT stored (data minimisation)
  trip_purpose text not null,
  mobility text not null,
  vehicle_type text not null,
  crew_size int not null check (crew_size in (1,2)),
  fare_min int not null,
  fare_max int not null,
  driver_brief jsonb not null default '[]'::jsonb,
  recurring boolean not null default false,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled'))
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

-- RLS on, no policies for anon/authenticated: only the server (service role) can read/write.
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;

-- Funnel events for the PRD success metrics (free alternative to Vercel custom events, which need a Pro plan).
-- Props hold only non-personal flags (vehicle type, add-ons); never names, phones or descriptions.
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (name in ('trip_analyzed','booking_confirmed','emergency_redirect')),
  props jsonb not null default '{}'::jsonb
);
create index if not exists app_events_name_created_idx on public.app_events (name, created_at desc);
alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;
