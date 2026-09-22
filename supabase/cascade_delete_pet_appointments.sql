-- ==============================================================================
-- SyncVet: Cascade Delete Appointments on Pet Deletion
-- ==============================================================================
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ufkhazeuphhirffopeim/sql/new
--
-- This ensures that whenever a pet is deleted from the `public.pets` table,
-- all scheduled and past appointments for that pet are automatically deleted
-- from `public.appointments` via PostgreSQL Foreign Key CASCADE.
-- ==============================================================================

-- 1. Drop existing foreign key constraint if present
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_pet_id_fkey;

-- 2. Re-create foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_pet_id_fkey
  FOREIGN KEY (pet_id)
  REFERENCES public.pets(id)
  ON DELETE CASCADE;

-- 3. Ensure appointments table emits full DELETE payloads for Realtime WebSockets
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- 4. Clean up any orphaned appointments that currently reference non-existent pets
DELETE FROM public.appointments
WHERE pet_id IS NOT NULL
  AND pet_id NOT IN (SELECT id FROM public.pets);
