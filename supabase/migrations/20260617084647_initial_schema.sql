create extension if not exists "uuid-ossp";

create table public.restaurants (
  id                 uuid primary key default uuid_generate_v4(),
  place_id           text unique not null,
  name               text not null,
  cuisine            text not null,
  establishment_type text not null,
  menu_items         jsonb not null default '[]',
  approved           boolean not null default false,
  created_at         timestamptz not null default now()
);

create table public.puzzle_queue (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  puzzle_date   date unique not null,
  created_at    timestamptz not null default now()
);

-- Index for daily puzzle lookup
create index puzzle_queue_date_idx on public.puzzle_queue(puzzle_date);

-- Row level security (read-only for anon; admin routes use service role key)
alter table public.restaurants enable row level security;
alter table public.puzzle_queue enable row level security;

create policy "Public can read approved restaurants"
  on public.restaurants for select
  using (approved = true);

create policy "Public can read puzzle queue"
  on public.puzzle_queue for select
  using (true);

-- service_role bypasses RLS policies but still needs table-level grants
grant all on public.restaurants to service_role;
grant all on public.puzzle_queue to service_role;

-- anon gets read-only access (RLS policies above further restrict which rows)
grant select on public.restaurants to anon;
grant select on public.puzzle_queue to anon;
