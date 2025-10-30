-- Seed one event and four blocks (adjust times as needed)
-- This assumes you run it on event day; adjust timestamps to your timezone.

with day as (
  select date_trunc('day', now()) as d
), ev as (
  insert into public.events (name, starts_at, ends_at, active)
  select 'Hell Is Hot', d + interval '17 hours', d + interval '21 hours', true from day
  returning *
)
insert into public.blocks (event_id, name, starts_at, ends_at, capacity, position)
select id, 'Opening Block (5:30-6:15PM)', starts_at + interval '30 minutes', starts_at + interval '45 minutes', 8, 1 from (
  select id, (select d + interval '17 hours' from day) as starts_at from ev
) x
union all
select id, 'First Main Block (6:15-7:15PM)', (select d + interval '18 hours 15 minutes' from day), (select d + interval '19 hours 15 minutes' from day), 15, 2 from ev
union all
select id, 'Second Main Block (7:30-8:30PM)', (select d + interval '19 hours 30 minutes' from day), (select d + interval '20 hours 30 minutes' from day), 15, 3 from ev
union all
select id, 'Final Block (8:30-8:55PM)', (select d + interval '20 hours 30 minutes' from day), (select d + interval '20 hours 55 minutes' from day), 10, 4 from ev;
