-- TABLE MANAGEMENT
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  table_number integer not null,
  capacity integer not null default 4 check (capacity > 0),
  status text not null default 'available' check (status in ('available', 'occupied', 'reserved')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, table_number)
);

create index if not exists tables_business_id_idx on tables(business_id);
create index if not exists tables_status_idx on tables(status);

create trigger update_tables_updated_at
  before update on tables
  for each row
  execute function update_updated_at_column();

alter table tables enable row level security;

create policy "Users can view tables in their business"
  on tables for select
  using (business_id = get_my_business_id());

create policy "Users can manage tables in their business"
  on tables for all
  using (business_id = get_my_business_id());

