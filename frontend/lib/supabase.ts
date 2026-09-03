import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Always create a Supabase client; uses placeholders at build-time so API routes
// have a non-null client. At runtime, requests will fail gracefully if env vars are invalid.
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'placeholder-key';

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || FALLBACK_URL,
  SUPABASE_ANON_KEY || FALLBACK_KEY
);