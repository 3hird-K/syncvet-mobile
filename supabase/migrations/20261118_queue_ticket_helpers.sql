-- Queue requirements: server-side sequence allocation and canonical status sync.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'queue_tickets_date_sequence_key'
  ) THEN
    ALTER TABLE public.queue_tickets
      ADD CONSTRAINT queue_tickets_date_sequence_key UNIQUE (date, queue_sequence);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.allocate_queue_ticket_sequence(p_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(queue_sequence), 0) + 1
    INTO v_next
    FROM public.queue_tickets
   WHERE date = p_date;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_queue_ticket_sequence(date) TO anon, authenticated;
