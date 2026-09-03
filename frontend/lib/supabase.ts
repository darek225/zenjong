import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jifvosqcxkohhvnfnbit.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4FLQupOnHzj5e82LzL6JQ_w7ACDIAH';

export const dynamic = 'force-dynamic';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);