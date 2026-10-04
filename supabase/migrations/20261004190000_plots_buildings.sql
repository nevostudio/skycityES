-- Fase 1: el solar (properties) y el edificio construido encima (buildings) son entidades distintas.
-- Un solar disponible no tiene fila en buildings. Comprar crea el edificio; mejorar cambia su tier
-- en la misma ubicación. Los edificios públicos no tienen lease ni propietario.
-- Los datos existentes (leases activos -> edificios construidos, solares libres -> vacíos) se
-- migran de forma aditiva y versionada en lib/plots.ts (migratePlots) dentro de la transacción
-- del servidor; no se borra ningún usuario, lease, transacción, puja ni evento.
create table public.buildings (
 id text primary key, data jsonb not null,
 property_id text generated always as (data->>'propertyId') stored references public.properties(id) deferrable initially deferred,
 lease_id text generated always as (data->>'leaseId') stored references public.leases(id) deferrable initially deferred,
 tier text generated always as (data->>'tier') stored,
 kind text generated always as (data->>'kind') stored,
 check (data->>'id'=id),
 check (tier in ('STARTER','PLUS','PRO','PREMIUM','LANDMARK','SKYSCRAPER')),
 check (kind in ('private','public')),
 check (kind='public' or lease_id is not null)
);
create unique index one_building_per_plot on public.buildings(property_id);
create unique index one_building_per_lease on public.buildings(lease_id) where lease_id is not null;

alter table public.buildings enable row level security;
revoke all on public.buildings from anon,authenticated;
-- The building itself is public city information (no email or payment data lives here).
grant select on public.buildings to anon,authenticated;
create policy building_read on public.buildings for select to anon,authenticated using(true);
