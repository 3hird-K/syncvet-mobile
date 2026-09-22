-- ==============================================================================
-- SyncVet: Enable Supabase Realtime Replication for Mobile App
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- This allows the mobile app to receive instant WebSocket updates on:
-- 1. `pets` (new pets, updated details, avatar changes, deletions)
-- 2. `appointments` (status confirmations, schedule changes, cancellations)
-- 3. `activities` (timeline additions, clinical updates)
-- ==============================================================================

-- 1. Ensure Full Replica Identity so UPDATE and DELETE events carry previous row states
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.pets REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.service_transactions REPLICA IDENTITY FULL;

-- 2. Add tables to the default Supabase Realtime publication
-- Supabase creates `supabase_realtime` publication by default.
DO $$
BEGIN
  -- Add users
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;

  -- Add pets
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pets;
  END IF;

  -- Add appointments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;

  -- Add service_transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'service_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_transactions;
  END IF;
END;
$$;
