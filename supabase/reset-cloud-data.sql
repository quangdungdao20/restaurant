-- DANGER: Run this script manually in the Supabase SQL Editor.
-- It removes application data and keeps auth users, profiles, and businesses.
-- Take a database backup before running it.

begin;

truncate table
  public.transaction_items,
  public.transactions,
  public.activity_logs,
  public.notifications,
  public.sales_targets,
  public.promo_codes,
  public.inventory,
  public.products,
  public.tables
restart identity cascade;

insert into public.tables (business_id, table_number, capacity, status)
select
  b.id,
  table_number,
  case
    when table_number <= 4 then 2
    when table_number <= 8 then 4
    else 6
  end,
  'available'
from public.businesses b
cross join generate_series(1, 10) as table_number;

commit;

-- Verification
select business_id, count(*) as table_count
from public.tables
group by business_id
order by business_id;
