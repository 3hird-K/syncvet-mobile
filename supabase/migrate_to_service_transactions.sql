-- ==============================================================================
-- SyncVet: Pure Supabase Schema & Governmental Service Transactions Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Project: syncvet
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. `public.users` table (Resident Profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY, -- Clerk User ID (e.g. 'user_2xyz...')
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  phone_number text,
  address text,
  role text NOT NULL DEFAULT 'resident',
  avatar_url text,
  profile_completed boolean DEFAULT false,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all columns exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'resident';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ------------------------------------------------------------------------------
-- 2. `public.pets` table (Registered Resident Animals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL,
  breed text,
  gender text,
  birth_year integer,
  is_vaccinated boolean DEFAULT false,
  is_spayed_neutered boolean DEFAULT false,
  weight_category text,
  microchip_number text,
  rabies_vaccinated boolean DEFAULT false,
  notes text,
  avatar_id text,
  photo_url text,
  vaccination_doses integer DEFAULT 0,
  last_vaccination_date text,
  next_vaccination_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. `public.appointments` table (Clinic Appointments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id text REFERENCES public.pets(id) ON DELETE CASCADE,
  pet_name text NOT NULL,
  service_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
  date text NOT NULL,
  time_slot text NOT NULL,
  location text DEFAULT 'City Veterinary Office Main Clinic',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. `public.service_transactions` table (Official Governmental Service Records)
-- ------------------------------------------------------------------------------
-- Drop old activities table if desired (or keep as alias)
DROP TABLE IF EXISTS public.activities CASCADE;

CREATE TABLE IF NOT EXISTS public.service_transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_no text NOT NULL,
  owner_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'registration' | 'booking' | 'confirmed' | 'completed' | 'cancellation'
  title text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'completed', -- 'pending' | 'approved' | 'completed' | 'cancelled'
  reference_id text, -- ID of related pet or appointment
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast resident lookup & chronological timeline
CREATE INDEX IF NOT EXISTS idx_service_transactions_owner_id_date 
  ON public.service_transactions (owner_id, date DESC);

-- Unique index for transaction reference number
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_transactions_no 
  ON public.service_transactions (transaction_no);

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Policies for Clerk Authentication
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_transactions ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Users can select own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

DROP POLICY IF EXISTS "Users can select own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can delete own pets" ON public.pets;

DROP POLICY IF EXISTS "Users can select own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

DROP POLICY IF EXISTS "Users can select own transactions" ON public.service_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.service_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.service_transactions;

-- Users policies
CREATE POLICY "Users can select own profile"
  ON public.users FOR SELECT
  USING ((auth.jwt() ->> 'sub') = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = id)
  WITH CHECK ((auth.jwt() ->> 'sub') = id);

-- Pets policies
CREATE POLICY "Users can select own pets"
  ON public.pets FOR SELECT
  USING ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can insert own pets"
  ON public.pets FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can update own pets"
  ON public.pets FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = owner_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can delete own pets"
  ON public.pets FOR DELETE
  USING ((auth.jwt() ->> 'sub') = owner_id);

-- Appointments policies
CREATE POLICY "Users can select own appointments"
  ON public.appointments FOR SELECT
  USING ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can insert own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

-- Service transactions policies
CREATE POLICY "Users can select own transactions"
  ON public.service_transactions FOR SELECT
  USING ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can insert own transactions"
  ON public.service_transactions FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can update own transactions"
  ON public.service_transactions FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = owner_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

-- ------------------------------------------------------------------------------
-- 6. Enable Realtime Replication for Tables
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;
