/**
 * Supabase client — use anon key in browser, service role in API routes.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

export const supabaseBrowser = createClient(url, anonKey ?? '', {
  auth: { persistSession: true },
});

export function supabaseServer() {
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for server');
  }
  return createClient(url!, serviceKey, { auth: { persistSession: false } });
}
