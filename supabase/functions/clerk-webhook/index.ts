import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.15.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLERK_WEBHOOK_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload = await req.text();
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    // Optional: Verify signature if secret is configured in Supabase secrets
    if (CLERK_WEBHOOK_SECRET && svixId && svixTimestamp && svixSignature) {
      const wh = new Webhook(CLERK_WEBHOOK_SECRET);
      wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    }

    const event = JSON.parse(payload);
    const eventType = event.type;
    const userId = event.data?.id;

    console.log(`[Clerk Webhook] Received event: ${eventType} for user: ${userId}`);

    // Handle User Deletion
    if (eventType === 'user.deleted') {
      if (!userId) {
        return new Response('Missing user ID', { status: 400 });
      }

      // Deleting from public.users automatically cascade-deletes pets, appointments, and transactions
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('[Clerk Webhook] Supabase delete error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log(`[Clerk Webhook] Successfully deleted user ${userId} and cascaded dependent records.`);
      return new Response(JSON.stringify({ success: true, deletedUser: userId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Clerk Webhook] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
