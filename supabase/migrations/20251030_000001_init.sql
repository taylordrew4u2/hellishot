-- Initial schema baseline for Hell Is Hot
-- Safe to run multiple times in cloud (idempotent where possible)

-- Ensure required extension for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  staff_password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null,
  position int not null,
  created_at timestamptz not null default now()
);

-- Enums
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('venmo','cashapp','applepay','cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','initiated','paid','failed','cash-pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE performance_type AS ENUM ('Comedy','Music','Dance','Poetry','Karaoke');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  user_name text not null,
  performance_type performance_type not null,
  wants_video boolean not null default false,
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  slot_number int not null,
  device_id text not null,
  created_at timestamptz not null default now()
);

-- Prevent double booking per slot within a block
create unique index if not exists bookings_block_slot_unique on public.bookings(block_id, slot_number);

-- Helper: filled counts per block
create or replace function public.get_block_filled_counts(p_event_id uuid)
returns table(block_id uuid, filled int)
language sql
as $$
  select b.id as block_id, count(*)::int as filled
  from public.blocks b
  left join public.bookings bk on bk.block_id = b.id
  where b.event_id = p_event_id
  group by b.id
  order by b.position
$$;

-- RLS + public read policies
alter table public.events enable row level security;
alter table public.blocks enable row level security;
alter table public.bookings enable row level security;

DO $$ BEGIN
  CREATE POLICY "Public read active events" ON public.events
    FOR SELECT TO anon
    USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read blocks for active events" ON public.blocks
    FOR SELECT TO anon
    USING (exists (select 1 from public.events e where e.id = event_id and e.active = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read bookings for active events" ON public.bookings
    FOR SELECT TO anon
    USING (exists (select 1 from public.events e where e.id = event_id and e.active = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
