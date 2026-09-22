-- ==============================================================================
-- SyncVet: Clerk Third-Party Auth & Metadata to Supabase Tables Migration
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Project: syncvet (ufkhazeuphhirffopeim)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure `public.users` table has all necessary profile columns
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY, -- Clerk User ID (e.g., 'user_2xyz...')
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

-- Ensure all required columns exist on users (in case table already existed)
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
-- 2. Modify `public.pets` table to include all mobile app fields
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL,
  breed text,
  microchip_number text,
  rabies_vaccinated boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add all metadata fields from the SyncVet mobile app
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS birth_year integer;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS is_vaccinated boolean DEFAULT false;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS is_spayed_neutered boolean DEFAULT false;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS weight_category text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS avatar_id text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS vaccination_doses integer DEFAULT 0;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS last_vaccination_date text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS next_vaccination_date text;

-- ------------------------------------------------------------------------------
-- 3. Create `public.appointments` table
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
  location text DEFAULT 'SyncVet Main Clinic',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure foreign key cascades deletions if table previously existed
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_pet_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_pet_id_fkey
  FOREIGN KEY (pet_id)
  REFERENCES public.pets(id)
  ON DELETE CASCADE;

-- ------------------------------------------------------------------------------
-- 4. Create `public.activities` table (User activity history)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'booking' | 'confirmed' | 'completed' | 'registration'
  title text NOT NULL,
  detail text,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. RPC Function: `sync_clerk_user_data`
-- Unpacks Clerk user profile + unsafeMetadata directly into real tables.
-- Callable from Expo/React Native via: supabase.rpc('sync_clerk_user_data', { ... })
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_clerk_user_data(
  p_user_id text,
  p_email text,
  p_full_name text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone text;
  v_address text;
  v_profile_completed boolean;
  v_pet jsonb;
  v_appt jsonb;
  v_pets_count integer := 0;
  v_appts_count integer := 0;
BEGIN
  -- Extract scalar fields from Clerk metadata
  v_phone := COALESCE(p_metadata->>'mobileNumber', p_metadata->>'phone_number');
  v_address := p_metadata->>'address';
  v_profile_completed := COALESCE((p_metadata->>'profileCompleted')::boolean, false);

  -- 1. Upsert into public.users
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone_number,
    address,
    avatar_url,
    profile_completed,
    raw_user_meta_data,
    updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    p_first_name,
    p_last_name,
    COALESCE(p_full_name, TRIM(CONCAT(COALESCE(p_first_name, ''), ' ', COALESCE(p_last_name, '')))),
    v_phone,
    v_address,
    p_avatar_url,
    v_profile_completed,
    p_metadata,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, users.phone_number),
    address = COALESCE(EXCLUDED.address, users.address),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    profile_completed = COALESCE(EXCLUDED.profile_completed, users.profile_completed),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- 2. Unpack and upsert pets from metadata.pets
  IF jsonb_typeof(p_metadata->'pets') = 'array' THEN
    FOR v_pet IN SELECT * FROM jsonb_array_elements(p_metadata->'pets')
    LOOP
      INSERT INTO public.pets (
        id,
        owner_id,
        name,
        species,
        breed,
        gender,
        birth_year,
        is_vaccinated,
        is_spayed_neutered,
        weight_category,
        notes,
        avatar_id,
        photo_url,
        vaccination_doses,
        last_vaccination_date,
        next_vaccination_date,
        updated_at
      )
      VALUES (
        COALESCE(v_pet->>'id', gen_random_uuid()::text),
        p_user_id,
        COALESCE(v_pet->>'name', 'Pet'),
        COALESCE(v_pet->>'species', 'dog'),
        v_pet->>'breed',
        v_pet->>'gender',
        (v_pet->>'birthYear')::integer,
        COALESCE((v_pet->>'isVaccinated')::boolean, false),
        COALESCE((v_pet->>'isSpayedNeutered')::boolean, false),
        v_pet->>'weightCategory',
        v_pet->>'notes',
        v_pet->>'avatarId',
        v_pet->>'photoUrl',
        COALESCE((v_pet->>'vaccinationDoses')::integer, 0),
        v_pet->>'lastVaccinationDate',
        v_pet->>'nextVaccinationDate',
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        species = EXCLUDED.species,
        breed = EXCLUDED.breed,
        gender = EXCLUDED.gender,
        birth_year = EXCLUDED.birth_year,
        is_vaccinated = EXCLUDED.is_vaccinated,
        is_spayed_neutered = EXCLUDED.is_spayed_neutered,
        weight_category = EXCLUDED.weight_category,
        notes = EXCLUDED.notes,
        avatar_id = EXCLUDED.avatar_id,
        photo_url = EXCLUDED.photo_url,
        vaccination_doses = EXCLUDED.vaccination_doses,
        last_vaccination_date = EXCLUDED.last_vaccination_date,
        next_vaccination_date = EXCLUDED.next_vaccination_date,
        updated_at = now();

      v_pets_count := v_pets_count + 1;
    END LOOP;
  END IF;

  -- 3. Unpack and upsert appointments from metadata.appointments
  IF jsonb_typeof(p_metadata->'appointments') = 'array' THEN
    FOR v_appt IN SELECT * FROM jsonb_array_elements(p_metadata->'appointments')
    LOOP
      INSERT INTO public.appointments (
        id,
        owner_id,
        pet_id,
        pet_name,
        service_id,
        status,
        date,
        time_slot,
        location,
        notes,
        updated_at
      )
      VALUES (
        COALESCE(v_appt->>'id', gen_random_uuid()::text),
        p_user_id,
        v_appt->>'petId',
        COALESCE(v_appt->>'petName', 'Pet'),
        COALESCE(v_appt->>'serviceId', 'consultation'),
        COALESCE(v_appt->>'status', 'pending'),
        COALESCE(v_appt->>'date', to_char(now(), 'YYYY-MM-DD')),
        COALESCE(v_appt->>'timeSlot', '09:00 AM'),
        COALESCE(v_appt->>'location', 'SyncVet Main Clinic'),
        v_appt->>'notes',
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        pet_id = EXCLUDED.pet_id,
        pet_name = EXCLUDED.pet_name,
        service_id = EXCLUDED.service_id,
        status = EXCLUDED.status,
        date = EXCLUDED.date,
        time_slot = EXCLUDED.time_slot,
        location = EXCLUDED.location,
        notes = EXCLUDED.notes,
        updated_at = now();

      v_appts_count := v_appts_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'userId', p_user_id,
    'petsSynced', v_pets_count,
    'appointmentsSynced', v_appts_count
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. ONE-TIME MIGRATION OF EXISTING `raw_user_meta_data`
-- If you already have rows in `public.users` with JSON metadata, this converts it:
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, email, full_name, first_name, last_name, avatar_url, raw_user_meta_data FROM public.users WHERE raw_user_meta_data IS NOT NULL AND raw_user_meta_data <> '{}'::jsonb
  LOOP
    PERFORM public.sync_clerk_user_data(
      r.id,
      r.email,
      r.full_name,
      r.first_name,
      r.last_name,
      r.avatar_url,
      r.raw_user_meta_data
    );
  END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Policies for Clerk Third-Party Auth
-- Supabase Third-Party Auth validates the Clerk JWT:
-- (auth.jwt() ->> 'sub') contains the Clerk user ID ('user_2...').
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to prevent conflicts
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

DROP POLICY IF EXISTS "Users can select own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;

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

CREATE POLICY "Users can update own appointments"
  ON public.appointments FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = owner_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can delete own appointments"
  ON public.appointments FOR DELETE
  USING ((auth.jwt() ->> 'sub') = owner_id);

-- Activities policies
CREATE POLICY "Users can select own activities"
  ON public.activities FOR SELECT
  USING ((auth.jwt() ->> 'sub') = owner_id);

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_id);

-- ------------------------------------------------------------------------------
-- 8. Grant Execution Rights
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.sync_clerk_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_clerk_user_data TO service_role;
