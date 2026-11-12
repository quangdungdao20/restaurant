-- TABLE
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES
create index if not exists businesses_owner_id_idx on businesses(owner_id);

-- FUNCTIONS & TRIGGERS
-- Auto-update updated_at (shared across all tables)
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_businesses_updated_at
  before update on businesses
  for each row
  execute function update_updated_at_column();

-- RLS
alter table businesses enable row level security;

create policy "Users can view their own business"
  on businesses for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Users can insert their own business"
  on businesses for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Users can update their own business"
  on businesses for update
  to authenticated
  using (owner_id = auth.uid());

create policy "Users can delete their own business"
  on businesses for delete
  to authenticated
  using (owner_id = auth.uid());
-- ENUMS
create type user_role as enum ('Owner', 'Admin', 'Manager', 'Staff');
create type user_status as enum ('Active', 'Inactive');

-- TABLE
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  role user_role not null default 'Staff',
  status user_status not null default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES
create index if not exists profiles_business_id_idx on profiles(business_id);
create index if not exists profiles_status_idx on profiles(status);
create index if not exists profiles_role_idx on profiles(role);
create index if not exists profiles_email_idx on profiles(email);

-- FUNCTIONS & TRIGGERS
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column(); -- defined in businesses migration

-- Helper: check if current user is Owner or Admin (used in RLS, avoids recursion)
create or replace function is_admin_or_owner()
returns boolean as $$
begin
  return (
    select role in ('Owner', 'Admin')
    from profiles
    where id = auth.uid()
    limit 1
  );
end;
$$ language plpgsql security definer stable;

-- Helper: get current user's business_id
create or replace function get_my_business_id()
returns uuid as $$
begin
  return (
    select business_id
    from profiles
    where id = auth.uid()
    limit 1
  );
end;
$$ language plpgsql security definer stable;

-- Auto-create profile + business on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  -- Create business first
  insert into public.businesses (name, owner_id)
  values (
    coalesce(new.raw_user_meta_data->>'business_name', 'My Business'),
    new.id
  )
  returning id into v_business_id;

  -- Create profile linked to business
  insert into public.profiles (id, business_id, email, first_name, last_name, phone, role, status)
  values (
    new.id,
    v_business_id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'Owner'::user_role,
    'Active'::user_status
  );

  return new;
exception
  when others then
    raise log 'Error in handle_new_user: %', sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS
alter table profiles enable row level security;

create policy "Users can view profiles in their business"
  on profiles for select
  using (business_id = get_my_business_id());

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Enable insert for signup and admins"
  on profiles for insert
  with check (auth.uid() = id or is_admin_or_owner());

create policy "Owners and admins can delete profiles"
  on profiles for delete
  using (is_admin_or_owner());
-- ENUM
create type product_category as enum ('Coffee', 'Food', 'Dessert');

-- TABLE
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  image jsonb,
  category product_category not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES
create index if not exists products_business_id_idx on products(business_id);
create index if not exists products_category_idx on products(category);
create index if not exists products_name_idx on products(name);

-- TRIGGERS
create trigger update_products_updated_at
  before update on products
  for each row
  execute function update_updated_at_column(); -- defined in businesses migration

-- RLS
alter table products enable row level security;

create policy "Users can view products in their business"
  on products for select
  to authenticated
  using (business_id = get_my_business_id());

create policy "Users can insert products in their business"
  on products for insert
  to authenticated
  with check (business_id = get_my_business_id());

create policy "Owners and admins can update products"
  on products for update
  to authenticated
  using (business_id = get_my_business_id() and is_admin_or_owner());

create policy "Owners and admins can delete products"
  on products for delete
  to authenticated
  using (business_id = get_my_business_id() and is_admin_or_owner());
-- Create the storage bucket
insert into storage.buckets (id, name, public)
values ('product_images', 'product_images', true)
on conflict (id) do nothing;

-- Allow anyone to upload (for development only!)
create policy "Anyone can upload images"
on storage.objects for insert
to public
with check (bucket_id = 'product_images');

-- Allow anyone to update images (for development only!)
create policy "Anyone can update images"
on storage.objects for update
to public
using (bucket_id = 'product_images');

-- Allow anyone to delete images (for development only!)
create policy "Anyone can delete images"
on storage.objects for delete
to public
using (bucket_id = 'product_images');
-- ENUMS
create type payment_method as enum ('Cash', 'Credit Card', 'Debit Card', 'E-Wallet');
create type transaction_status as enum ('Completed', 'Pending', 'Cancelled');

-- TABLE
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_number text unique not null,
  customer_name text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  promo_code text default null,
  tax_rate numeric(5, 4) not null default 0,
  tax_amount numeric(10, 2) not null check (tax_amount >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  payment_method payment_method not null,
  status transaction_status not null default 'Pending',
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES
create index if not exists transactions_business_id_idx on transactions(business_id);
create index if not exists transactions_transaction_number_idx on transactions(transaction_number);
create index if not exists transactions_status_idx on transactions(status);
create index if not exists transactions_payment_method_idx on transactions(payment_method);
create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_created_at_idx on transactions(created_at desc);
create index if not exists transactions_promo_code_idx on transactions(promo_code);

-- FUNCTIONS & TRIGGERS
create trigger update_transactions_updated_at
  before update on transactions
  for each row
  execute function update_updated_at_column(); -- defined in businesses migration

-- Auto-generate transaction number (format: TRX-YYYY-XXXXXX)
create or replace function generate_transaction_number()
returns text as $$
declare
  year_part text;
  sequence_num text;
begin
  year_part := to_char(now(), 'YYYY');
  select lpad((count(*) + 1)::text, 6, '0')
  into sequence_num
  from transactions
  where extract(year from created_at) = extract(year from now());
  return 'TRX-' || year_part || '-' || sequence_num;
end;
$$ language plpgsql;

create or replace function set_transaction_number()
returns trigger as $$
begin
  if new.transaction_number is null then
    new.transaction_number := generate_transaction_number();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_transaction_number_trigger
  before insert on transactions
  for each row
  execute function set_transaction_number();

-- Auto-calculate tax and total (now accounts for discount)
create or replace function calculate_transaction_totals()
returns trigger as $$
begin
  new.tax_amount := (new.subtotal - new.discount_amount) * new.tax_rate;
  new.total_amount := (new.subtotal - new.discount_amount) + new.tax_amount;
  return new;
end;
$$ language plpgsql;

create trigger calculate_transaction_totals_trigger
  before insert or update of subtotal, tax_rate, discount_amount on transactions
  for each row
  execute function calculate_transaction_totals();

-- RLS
alter table transactions enable row level security;

create policy "Users can view transactions in their business"
  on transactions for select
  using (business_id = get_my_business_id());

create policy "Users can create transactions in their business"
  on transactions for insert
  with check (business_id = get_my_business_id());

create policy "Users can update transactions in their business"
  on transactions for update
  using (business_id = get_my_business_id());

create policy "Owners and admins can delete transactions"
  on transactions for delete
  using (business_id = get_my_business_id() and is_admin_or_owner());
-- TABLE
create table if not exists transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  product_price numeric(10, 2) not null check (product_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists transaction_items_transaction_id_idx on transaction_items(transaction_id);
create index if not exists transaction_items_product_id_idx on transaction_items(product_id);

-- RLS
alter table transaction_items enable row level security;

create policy "Users can view transaction items"
  on transaction_items for select
  using (
    exists (
      select 1 from transactions
      where transactions.id = transaction_items.transaction_id
      and transactions.business_id = get_my_business_id()
    )
  );

create policy "Users can insert transaction items"
  on transaction_items for insert
  with check (
    exists (
      select 1 from transactions
      where transactions.id = transaction_items.transaction_id
      and transactions.business_id = get_my_business_id()
    )
  );

create policy "Users can update transaction items"
  on transaction_items for update
  using (
    exists (
      select 1 from transactions
      where transactions.id = transaction_items.transaction_id
      and transactions.business_id = get_my_business_id()
    )
  );

create policy "Owners and admins can delete transaction items"
  on transaction_items for delete
  using (is_admin_or_owner());
-- ENUM
create type notification_type as enum ('low_stock', 'out_of_stock', 'pending_order');

-- TABLE
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type notification_type not null,
  title text not null,
  message text not null,
  entity_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists notifications_business_id_idx on notifications(business_id);
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_is_read_idx on notifications(is_read);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
-- Composite index for the most common query: unread notifications per business
create index if not exists notifications_business_unread_idx on notifications(business_id, is_read)
  where is_read = false;

-- REALTIME
alter publication supabase_realtime add table notifications;

-- RLS
alter table notifications enable row level security;

create policy "Users can view notifications in their business"
  on notifications for select
  using (business_id = get_my_business_id());

create policy "System can insert notifications"
  on notifications for insert
  with check (business_id = get_my_business_id());

create policy "Users can update notifications in their business"
  on notifications for update
  using (business_id = get_my_business_id())
  with check (business_id = get_my_business_id());

create policy "Owners and admins can delete notifications"
  on notifications for delete
  using (business_id = get_my_business_id() and is_admin_or_owner());
-- ENUM
create type activity_action as enum ('create', 'update', 'delete', 'view');
create type activity_subject as enum ('product', 'transaction', 'inventory', 'user', 'business', 'profile', 'other');

-- TABLE
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete set null,
  action activity_action not null,
  subject activity_subject not null,
  entity_id uuid,
  entity_name text,  -- Name of the entity (e.g. product name, transaction id)
  changes jsonb,     -- Store old and new values for updates: { old: {...}, new: {...} }
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists activity_logs_business_id_idx on activity_logs(business_id);
create index if not exists activity_logs_user_id_idx on activity_logs(user_id);
create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);
create index if not exists activity_logs_action_idx on activity_logs(action);
create index if not exists activity_logs_subject_idx on activity_logs(subject);
create index if not exists activity_logs_entity_id_idx on activity_logs(entity_id);
-- Most common query: logs for a specific business, sorted by recent
create index if not exists activity_logs_business_created_idx on activity_logs(business_id, created_at desc);

-- RLS
alter table activity_logs enable row level security;

create policy "Users can view activity logs in their business"
  on activity_logs for select
  using (business_id = get_my_business_id());

create policy "System can insert activity logs"
  on activity_logs for insert
  with check (business_id = get_my_business_id());

create policy "Only owners and admins can delete activity logs"
  on activity_logs for delete
  using (business_id = get_my_business_id() and is_admin_or_owner());

-- TABLE
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(10, 2) not null check (value > 0),
  min_order numeric(10, 2) not null default 0 check (min_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, code)
);

-- INDEXES
create index if not exists promo_codes_business_id_idx on promo_codes(business_id);
create index if not exists promo_codes_code_idx on promo_codes(code);
create index if not exists promo_codes_is_active_idx on promo_codes(is_active);

create trigger update_promo_codes_updated_at
  before update on promo_codes
  for each row
  execute function update_updated_at_column();

-- RLS
alter table promo_codes enable row level security;

create policy "Users can view promo codes in their business"
  on promo_codes for select
  using (business_id = get_my_business_id());

create policy "Owners and admins can manage promo codes"
  on promo_codes for all
  using (business_id = get_my_business_id() and is_admin_or_owner());
-- TABLE
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  month date not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONSTRAINTS
alter table public.sales_targets
  add constraint sales_targets_business_id_month_key unique (business_id, month);

-- INDEXES
create index if not exists sales_targets_business_id_idx on public.sales_targets(business_id);
create index if not exists sales_targets_month_idx on public.sales_targets(month);

create trigger update_sales_targets_updated_at
  before update on public.sales_targets
  for each row
  execute function update_updated_at_column();

-- RLS
alter table public.sales_targets enable row level security;

create policy "users can view sales targets in their business"
  on public.sales_targets for select
  using (business_id = get_my_business_id());

create policy "owners and admins can manage sales targets"
  on public.sales_targets for all
  using (business_id = get_my_business_id() and is_admin_or_owner());
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
-- ============================================================
-- SEED: Brewhaus Coffee
--
-- Accounts:
--   Owner:   owner@brewhaus.com   / Quangdung@20
--   Admin:   admin@brewhaus.com   / Quangdung@20
--   Manager: manager@brewhaus.com / Quangdung@20
--   Staff 1: staff1@brewhaus.com  / Quangdung@20
--   Staff 2: staff2@brewhaus.com  / Quangdung@20
-- ============================================================

-- EXTENSIONS
create extension if not exists pgcrypto;


-- ============================================================
-- AUTH USERS
-- ============================================================

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at, email_change_token_new, email_change,
  email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
  phone_change, phone_change_token, phone_change_sent_at,
  email_change_token_current, email_change_confirm_status, banned_until,
  reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at
) values
  -- Owner
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'quangdungdao20@gmail.com',
    extensions.crypt('Quangdung@20', extensions.gen_salt('bf')),
    now(), null, '', null, '', null, '', '', null, now(),
    '{"provider":"email","providers":["email"]}',
    '{"business_name":"Brewhaus Coffee","first_name":"Miguel","last_name":"Santos","phone":"09171234567"}'::jsonb,
    null, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null
  ),
  -- Admin
  (
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@.com', 
    extensions.crypt('Quangdung@20', extensions.gen_salt('bf')),
    now(), null, '', null, '', null, '', '', null, now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Isabella","last_name":"Reyes","phone":"09181234567"}'::jsonb,
    null, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null
  ),
  -- Manager
  (
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'manager@.com',
    extensions.crypt('Quangdung@20', extensions.gen_salt('bf')),
    now(), null, '', null, '', null, '', '', null, now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Carlos","last_name":"Mendoza","phone":"09191234567"}'::jsonb,
    null, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null
  ),
  -- Staff 1
  (
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'staff1@.com',
    extensions.crypt('Quangdung@20', extensions.gen_salt('bf')),
    now(), null, '', null, '', null, '', '', null, now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Cruz","phone":"09201234567"}'::jsonb,
    null, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null
  ),
  -- Staff 2
  (
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'staff2@brewhaus.com',
    extensions.crypt('Quangdung@20', extensions.gen_salt('bf')),
    now(), null, '', null, '', null, '', '', null, now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Rico","last_name":"Dela Cruz","phone":"09211234567"}'::jsonb,
    null, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;


-- ============================================================
-- AUTH IDENTITIES
-- ============================================================

insert into auth.identities (
  id, user_id, provider, identity_data, provider_id, created_at, updated_at
) values
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email',
    '{"sub":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"owner@brewhaus.com"}'::jsonb,
    'owner@brewhaus.com', now(), now()
  ),
  (
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email',
    '{"sub":"b1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"admin@brewhaus.com"}'::jsonb,
    'admin@brewhaus.com', now(), now()
  ),
  (
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email',
    '{"sub":"c1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"manager@brewhaus.com"}'::jsonb,
    'manager@brewhaus.com', now(), now()
  ),
  (
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email',
    '{"sub":"d1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"staff1@brewhaus.com"}'::jsonb,
    'staff1@brewhaus.com', now(), now()
  ),
  (
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email',
    '{"sub":"e1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"staff2@brewhaus.com"}'::jsonb,
    'staff2@brewhaus.com', now(), now()
  )
on conflict (provider_id, provider) do nothing;


-- ============================================================
-- BUSINESS
-- ============================================================

insert into public.businesses (id, name, address, phone, owner_id)
values (
  'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Brewhaus Coffee',
  '123 Katipunan Ave, Quezon City, Metro Manila',
  '(02) 8123-4567',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
)
on conflict (id) do update set
  name    = excluded.name,
  address = excluded.address,
  phone   = excluded.phone;


-- ============================================================
-- PROFILES
-- (trigger won't fire on direct auth.users insert)
-- ============================================================

insert into public.profiles (id, business_id, email, first_name, last_name, phone, role, status)
values
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'owner@brewhaus.com', 'Miguel', 'Santos', '09171234567',
    'Owner', 'Active'
  ),
  (
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@brewhaus.com', 'Isabella', 'Reyes', '09181234567',
    'Admin', 'Active'
  ),
  (
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'manager@brewhaus.com', 'Carlos', 'Mendoza', '09191234567',
    'Manager', 'Active'
  ),
  (
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'staff1@brewhaus.com', 'Anna', 'Cruz', '09201234567',
    'Staff', 'Active'
  ),
  (
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'staff2@brewhaus.com', 'Rico', 'Dela Cruz', '09211234567',
    'Staff', 'Active'
  )
on conflict (id) do update set
  business_id = excluded.business_id,
  first_name  = excluded.first_name,
  last_name   = excluded.last_name,
  phone       = excluded.phone,
  role        = excluded.role,
  status      = excluded.status;


-- ============================================================
-- PRODUCTS
-- ============================================================

insert into public.products (name, price, image, category, business_id) values
  ('Chocolate Chip Cookie', 2.49, '{"file_name": "chocolate-chip-cookie.jpg", "file_size": 43110, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Americano', 3.49, '{"file_name": "americano.jpg", "file_size": 38739, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Chicken Wrap', 8.49, '{"file_name": "chicken-wrap.jpg", "file_size": 64409, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Strawberry Tart', 5.49, '{"file_name": "strawberry-tart.jpg", "file_size": 26687, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Chai Latte', 4.59, '{"file_name": "chai-latte.jpg", "file_size": 81250, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Soup of the Day', 5.99, '{"file_name": "soup-of-the-day.jpg", "file_size": 43400, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Red Velvet Cake', 5.99, '{"file_name": "red-velvet-cake.jpg", "file_size": 31241, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Frappuccino', 5.29, '{"file_name": "frappuccino.jpg", "file_size": 29931, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Avocado Toast', 6.99, '{"file_name": "avocado-toast.jpg", "file_size": 67464, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Tiramisu', 6.49, '{"file_name": "tiramisu.jpg", "file_size": 70240, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Espresso', 3.99, '{"file_name": "espresso.jpg", "file_size": 22213, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('French Toast', 7.99, '{"file_name": "french-toast.jpg", "file_size": 76531, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Macarons (6 pack)', 8.99, '{"file_name": "macarons-6-pack.jpg", "file_size": 40333, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Gibraltar', 4.49, '{"file_name": "gibraltar.jpg", "file_size": 55152, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Caesar Salad', 8.99, '{"file_name": "caesar-salad.jpg", "file_size": 58853, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Blueberry Muffin', 3.29, '{"file_name": "blueberry-muffin.jpg", "file_size": 80588, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Matcha Latte', 4.89, '{"file_name": "matcha-latte.jpg", "file_size": 42259, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Breakfast Burrito', 8.99, '{"file_name": "breakfast-burrito.jpg", "file_size": 59784, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Creme Brulee', 6.99, '{"file_name": "creme-brulee.jpg", "file_size": 56967, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Latte', 4.29, '{"file_name": "latte.jpg", "file_size": 40761, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Croissant', 2.99, '{"file_name": "croissant.jpg", "file_size": 20502, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Lemon Tart', 5.79, '{"file_name": "lemon-tart.jpg", "file_size": 71489, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Cold Brew', 3.89, '{"file_name": "cold-brew.jpg", "file_size": 22694, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Club Sandwich', 9.49, '{"file_name": "club-sandwich.jpg", "file_size": 29009, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Apple Pie', 4.99, '{"file_name": "apple-pie.jpg", "file_size": 36616, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1562007908-17c67e878c88?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Vienna Coffee', 5.19, '{"file_name": "vienna-coffee.jpg", "file_size": 40694, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Quinoa Bowl', 9.99, '{"file_name": "quinoa-bowl.jpg", "file_size": 35272, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Chocolate Mousse', 5.49, '{"file_name": "chocolate-mousse.jpg", "file_size": 32483, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Iced Coffee', 4.19, '{"file_name": "iced-coffee.jpg", "file_size": 30408, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Eggs Benedict', 11.99, '{"file_name": "eggs-benedict.jpg", "file_size": 24689, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Chocolate Eclair', 4.79, '{"file_name": "chocolate-eclair.jpg", "file_size": 60030, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1558326567-98ae2405596b?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Cappuccino', 4.49, '{"file_name": "cappuccino.jpg", "file_size": 32376, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Bagel with Cream Cheese', 3.99, '{"file_name": "bagel-with-cream-cheese.jpg", "file_size": 52608, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1585378411895-1d9b8f3df9fa?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Fruit Tart', 6.29, '{"file_name": "fruit-tart.jpg", "file_size": 51507, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Turkish Coffee', 4.99, '{"file_name": "turkish-coffee.jpg", "file_size": 62389, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Acai Bowl', 10.99, '{"file_name": "acai-bowl.jpg", "file_size": 66907, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Chocolate Brownie', 4.49, '{"file_name": "chocolate-brownie.jpg", "file_size": 81424, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Mocha', 4.79, '{"file_name": "mocha.jpg", "file_size": 54994, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Panini', 7.99, '{"file_name": "panini.jpg", "file_size": 79996, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Banana Bread', 3.99, '{"file_name": "banana-bread.jpg", "file_size": 28723, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1605286978633-2dec93ff88a2?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Macchiato', 4.69, '{"file_name": "macchiato.jpg", "file_size": 75696, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Grilled Sandwich', 7.49, '{"file_name": "grilled-sandwich.jpg", "file_size": 46368, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Ice Cream Sundae', 4.99, '{"file_name": "ice-cream-sundae.jpg", "file_size": 47409, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Flat White', 4.39, '{"file_name": "flat-white.jpg", "file_size": 63520, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=300&h=300&fit=crop"}'::jsonb, 'Coffee', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Pasta Salad', 6.99, '{"file_name": "pasta-salad.jpg", "file_size": 18801, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop"}'::jsonb, 'Food', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('New York Cheesecake', 5.99, '{"file_name": "new-york-cheesecake.jpg", "file_size": 69543, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Pecan Pie', 5.79, '{"file_name": "pecan-pie.jpg", "file_size": 19164, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1562007908-17c67e878c88?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Carrot Cake', 5.29, '{"file_name": "carrot-cake.jpg", "file_size": 24724, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Donut Assortment', 7.99, '{"file_name": "donut-assortment.jpg", "file_size": 80320, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('Panna Cotta', 5.99, '{"file_name": "panna-cotta.jpg", "file_size": 28826, "mime_type": "image/jpeg", "url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop"}'::jsonb, 'Dessert', 'f1b2c3d4-e5f6-7890-abcd-ef1234567890');


-- ============================================================
-- PROMO CODES
-- ============================================================

insert into public.promo_codes (business_id, code, type, value, min_order, is_active) values
  -- Percentage discounts
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'WELCOME10',  'percentage', 10.00,  0.00,  true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SAVE15',     'percentage', 15.00,  20.00, true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BIGSPEND20', 'percentage', 20.00,  50.00, true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'STAFF50',    'percentage', 50.00,  0.00,  true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'OLDPROMO',   'percentage', 10.00,  0.00,  false),
  -- Fixed discounts
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FLAT5',      'fixed',       5.00,  15.00, true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FLAT10',     'fixed',      10.00,  30.00, true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TREAT3',     'fixed',       3.00,   0.00, true),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EXPIREDFIX', 'fixed',       5.00,   0.00, false)
on conflict (business_id, code) do update set
  type      = excluded.type,
  value     = excluded.value,
  min_order = excluded.min_order,
  is_active = excluded.is_active;


-- ============================================================
-- SALES TARGETS
-- 2025 full year + 2026 up to current month
-- Mix of achieved and not achieved
-- ============================================================

insert into public.sales_targets (business_id, month, target_amount, created_by) values
  -- 2025
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-01-01', 3200.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-02-01', 3200.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-03-01', 3500.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-04-01', 3500.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-05-01', 3800.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-06-01', 3800.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-07-01', 4000.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-08-01', 4000.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-09-01', 4200.00, 'b1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-10-01', 4200.00, 'b1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-11-01', 4500.00, 'b1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2025-12-01', 5000.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  -- 2026
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-01-01', 4800.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-02-01', 4800.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('f1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-03-01', 5000.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
on conflict (business_id, month) do update set
  target_amount = excluded.target_amount,
  created_by    = excluded.created_by;


-- ============================================================
-- TRANSACTIONS + TRANSACTION ITEMS
-- 30 transactions over the last 30 days
-- ============================================================

do $$
declare
  v_business_id   uuid    := 'f1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_staff_ids     uuid[]  := array[
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890'
  ];
  v_tx_id         uuid;
  v_tx_number     text;
  v_subtotal      numeric(10,2);
  v_discount      numeric(10,2);
  v_promo         record;
  v_product       record;
  v_qty           int;
  v_item_subtotal numeric(10,2);
  v_item_count    int;
  v_payments      payment_method[]     := array['Cash', 'Credit Card', 'Debit Card', 'E-Wallet']::payment_method[];
  v_statuses      transaction_status[] := array['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Pending', 'Cancelled']::transaction_status[];
  v_customers     text[]               := array['Maria', 'Jose', 'Anna', 'Carlo', 'Lea', 'Rico', 'Diana', 'Mark', 'Sofia', 'Luis', null, null, null];
  -- Promo codes to rotate through (only active ones, mix of types)
  v_promo_codes   text[]               := array['WELCOME10', 'FLAT5', 'SAVE15', 'FLAT10', 'TREAT3', null, null, null, null, null];
begin
  for i in 1..30 loop
    v_tx_id     := gen_random_uuid();
    v_tx_number := 'TRX-2026-' || lpad(i::text, 6, '0');
    v_subtotal  := 0;
    v_discount  := 0;

    insert into public.transactions (
      id, business_id, transaction_number, customer_name,
      subtotal, discount_amount, promo_code,
      tax_rate, tax_amount, total_amount,
      payment_method, status, user_id,
      created_at, updated_at
    ) values (
      v_tx_id,
      v_business_id,
      v_tx_number,
      v_customers[1 + (i % array_length(v_customers, 1))],
      0, 0, null,
      0.12, 0, 0,
      v_payments[1 + (i % array_length(v_payments, 1))],
      v_statuses[1 + (i % array_length(v_statuses, 1))],
      v_staff_ids[1 + (i % array_length(v_staff_ids, 1))],
      now() - ((30 - i) || ' days')::interval,
      now() - ((30 - i) || ' days')::interval
    );

    v_item_count := 1 + (i % 4);

    for j in 1..v_item_count loop
      select * into v_product
      from public.products
      where business_id = v_business_id
      order by id
      offset ((i * j) % 50)
      limit 1;

      v_qty           := 1 + (j % 3);
      v_item_subtotal := v_product.price * v_qty;
      v_subtotal      := v_subtotal + v_item_subtotal;

      insert into public.transaction_items (
        transaction_id, product_id, product_name,
        product_price, quantity, subtotal
      ) values (
        v_tx_id, v_product.id, v_product.name,
        v_product.price, v_qty, v_item_subtotal
      );
    end loop;

    -- Apply a promo code to every 3rd transaction (realistic usage rate)
    if v_promo_codes[1 + (i % array_length(v_promo_codes, 1))] is not null then
      select * into v_promo
      from public.promo_codes
      where business_id = v_business_id
        and code = v_promo_codes[1 + (i % array_length(v_promo_codes, 1))]
        and v_subtotal >= min_order;

      if found then
        v_discount := case
          when v_promo.type = 'percentage'
            then round(v_subtotal * v_promo.value / 100, 2)
          else
            least(v_promo.value, v_subtotal)
        end;
      end if;
    end if;

    update public.transactions
    set
      subtotal        = v_subtotal,
      discount_amount = v_discount,
      promo_code      = case when v_discount > 0 then v_promo_codes[1 + (i % array_length(v_promo_codes, 1))] else null end,
      tax_amount      = round((v_subtotal - v_discount) * 0.12, 2),
      total_amount    = round((v_subtotal - v_discount) * 1.12, 2)
    where id = v_tx_id;

  end loop;
end;
$$;
