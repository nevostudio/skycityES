-- SkyCity: normalized entity boundaries, JSONB configuration and generated relational keys.
-- No client may mutate economic data. Server transactions use an advisory lock plus
-- unique indexes as a second line of defense. Foreign keys are deferred for atomic batches.
create table public.cities (id text primary key, name text not null, slug text unique not null);
insert into public.cities values ('skycity','SkyCity','skycity');
create table public.profiles (id uuid primary key references auth.users(id), email text unique not null, username text unique, credits_balance bigint not null default 0 check (credits_balance>=0));
create table public.property_types (id text primary key, name text not null);
insert into public.property_types select t,initcap(t) from unnest(array['house','shop','restaurant','office','apartment','tower','warehouse','nightclub','hotel','mall','billboard','landmark']) t;
create table public.property_models (id integer primary key, name text not null);
insert into public.property_models select n,'Low-poly model '||n from generate_series(0,19) n;

create table public.districts (
 id text primary key, data jsonb not null, city_id text not null default 'skycity' references public.cities(id),
 check (data->>'id'=id)
);
create table public.properties (
 id text primary key, data jsonb not null,
 district_id text generated always as (data->>'districtId') stored references public.districts(id) deferrable initially deferred,
 type_id text generated always as (data->>'type') stored references public.property_types(id),
 model_id integer generated always as ((data->>'model')::integer) stored references public.property_models(id),
 check (data->>'id'=id), check ((data->>'height')::numeric>0)
);
create table public.leases (
 id text primary key, data jsonb not null,
 property_id text generated always as (data->>'propertyId') stored references public.properties(id) deferrable initially deferred,
 email text generated always as (lower(data->>'email')) stored,
 status text generated always as (data->>'status') stored,
 check (data->>'id'=id),check (status in ('active','expired'))
);
create unique index one_active_lease_per_property on public.leases(property_id) where status='active';
create index leases_email on public.leases(email);
create table public.property_reservations (
 id text primary key, data jsonb not null,
 property_id text generated always as (data->>'propertyId') stored references public.properties(id) deferrable initially deferred,
 email text generated always as (lower(data->>'email')) stored,
 status text generated always as (data->>'status') stored,
 checkout_session_id text generated always as (data->>'sessionId') stored unique,
 check (data->>'id'=id),check (status in ('reserved','paid','expired')),check ((data->>'amount')::numeric>0)
);
create unique index one_reservation_per_property on public.property_reservations(property_id) where status='reserved';
create table public.transactions (
 id text primary key,data jsonb not null,
 reservation_id text generated always as (data->>'reservationId') stored unique references public.property_reservations(id) deferrable initially deferred,
 email text generated always as (lower(data->>'email')) stored,
 check (data->>'id'=id),check ((data->>'amount')::numeric>0)
);
create table public.auctions (
 id text primary key,data jsonb not null,
 property_id text generated always as (data->>'propertyId') stored references public.properties(id) deferrable initially deferred,
 status text generated always as (data->>'status') stored,
 check (data->>'id'=id),check (status in ('live','awaiting_payment','settled','closed'))
);
create unique index one_open_auction_per_property on public.auctions(property_id) where status in ('live','awaiting_payment');
create table public.bids (
 id text primary key,data jsonb not null,
 auction_id text generated always as (data->>'auctionId') stored references public.auctions(id) deferrable initially deferred,
 email text generated always as (lower(data->>'email')) stored,
 check (data->>'id'=id),check ((data->>'amount')::numeric>0)
);
create index bids_auction on public.bids(auction_id);
create table public.activity_feed (id text primary key,data jsonb not null,property_id text generated always as (data->>'propertyId') stored references public.properties(id) deferrable initially deferred);
create table public.analytics_events (id text primary key,data jsonb not null,check ((data->>'count')::integer>=0));
create table public.access_tokens (id text primary key,data jsonb not null);
create table public.email_outbox (id text primary key,data jsonb not null);
create table public.platform_settings (id text primary key,data jsonb not null);

-- Ad content lives with its lease to commit payment + ad activation atomically.
-- This invoker view deliberately inherits lease ownership policies.
create view public.advertisements with (security_invoker=true) as select id as lease_id,property_id,email,data->'ad' as content from public.leases;
create view public.share_events with (security_invoker=true) as select id,data from public.analytics_events where data->>'event'='share_clicked';

-- Future transfers and SkyCredits: no payouts or recurring billing enabled in MVP.
create table public.marketplace_listings (id uuid primary key default gen_random_uuid(), lease_id text not null references public.leases(id), seller_id uuid not null references public.profiles(id), status text not null default 'draft', price_cents integer check(price_cents>=0));
create table public.credit_transactions (id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id), delta bigint not null, reason text not null, created_at timestamptz not null default now());

do $$ declare t text; begin
 foreach t in array array['cities','profiles','property_types','property_models','districts','properties','leases','property_reservations','transactions','auctions','bids','activity_feed','analytics_events','access_tokens','email_outbox','platform_settings','marketplace_listings','credit_transactions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant usage on schema public to anon,authenticated;
grant select on public.cities,public.property_types,public.property_models,public.districts,public.properties,public.activity_feed to anon,authenticated;
create policy city_read on public.cities for select to anon,authenticated using(true);
create policy type_read on public.property_types for select to anon,authenticated using(true);
create policy model_read on public.property_models for select to anon,authenticated using(true);
create policy district_read on public.districts for select to anon,authenticated using(true);
create policy property_read on public.properties for select to anon,authenticated using((data->>'enabled')::boolean);
create policy activity_read on public.activity_feed for select to anon,authenticated using(true);
grant select on public.profiles,public.leases,public.transactions,public.bids,public.advertisements to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_leases on public.leases for select to authenticated using(email=lower((select auth.jwt())->>'email'));
create policy own_transactions on public.transactions for select to authenticated using(email=lower((select auth.jwt())->>'email'));
create policy own_bids on public.bids for select to authenticated using(email=lower((select auth.jwt())->>'email'));
-- Editing ads uses a verified server endpoint with a strict field allowlist.
-- Direct updates are intentionally denied, including owner, price and expiration.
revoke all on public.share_events from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('advertisements','advertisements',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
-- Uploads use the server service key with MIME signature, size and rate checks.
-- No anonymous storage writes are granted.
