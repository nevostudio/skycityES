-- Existing entities remain intact. Runtime takeoverVersion backfills values from recorded
-- acquisition payments, never from upgrade prices. All economic writes remain server-only.
alter table public.properties
  add column current_property_value numeric generated always as ((data->>'current_property_value')::numeric) stored,
  add column takeover_enabled boolean generated always as ((data->>'takeover_enabled')::boolean) stored,
  add column last_takeover_amount numeric generated always as ((data->>'last_takeover_amount')::numeric) stored,
  add column last_takeover_at text generated always as (data->>'last_takeover_at') stored,
  add column takeover_count integer generated always as ((data->>'takeover_count')::integer) stored,
  add constraint valid_property_value check (current_property_value >= 0 and current_property_value = round(current_property_value, 2)),
  add constraint valid_takeover_count check (takeover_count >= 0);

-- Claims/upgrades keep exclusive reservations; competing takeover checkouts may coexist.
drop index public.one_reservation_per_property;
create unique index one_reservation_per_property on public.property_reservations(property_id)
  where status='reserved' and coalesce(data->>'purpose','claim') <> 'takeover';
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.property_reservations'::regclass
    and contype='c' and pg_get_constraintdef(oid) like '%status%' loop
    execute format('alter table public.property_reservations drop constraint %I',c.conname);
  end loop;
end $$;
alter table public.property_reservations add constraint reservation_status_valid check(status in ('reserved','paid','expired','conflict'));
alter table public.transactions add column stripe_payment_id text generated always as (data->>'stripePaymentId') stored unique;

create table public.property_takeovers (
 id text primary key,
 data jsonb not null,
 property_id text generated always as (data->>'property_id') stored references public.properties(id) deferrable initially deferred,
 reservation_id text generated always as (data->>'reservation_id') stored unique references public.property_reservations(id) deferrable initially deferred,
 previous_controller_id text generated always as (data->>'previous_controller_id') stored references public.leases(id) deferrable initially deferred,
 new_controller_id text generated always as (data->>'new_controller_id') stored references public.leases(id) deferrable initially deferred,
 previous_value numeric generated always as ((data->>'previous_value')::numeric) stored,
 takeover_amount numeric generated always as ((data->>'takeover_amount')::numeric) stored,
 stripe_payment_id text generated always as (data->>'stripe_payment_id') stored unique,
 transaction_id text generated always as (data->>'transaction_id') stored unique references public.transactions(id) deferrable initially deferred,
 status text generated always as (data->>'status') stored,
 created_at text generated always as (data->>'created_at') stored,
 check(data->>'id'=id),
 check(property_id is not null and reservation_id is not null and previous_controller_id is not null and transaction_id is not null),
 check(previous_value >= 0 and takeover_amount > 0 and takeover_amount = round(takeover_amount,2)),
 check(status in ('completed','refund_pending','refunded')),
 check(status <> 'completed' or (new_controller_id is not null and new_controller_id <> previous_controller_id and takeover_amount >= previous_value + 1))
);
create index property_takeovers_history on public.property_takeovers(property_id,created_at);
alter table public.property_takeovers enable row level security;
revoke all on public.property_takeovers from anon,authenticated;
