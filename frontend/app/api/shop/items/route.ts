import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jifvosqcxkohhvnfnbit.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4FLQupOnHzj5e82LzL6JQ_w7ACDIAH';
    const supabase = createClient(url, key);

    const { data, error } = await supabase.from('shop_items').select('*');
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch items', items: [] }, { status: 500 });
  }
}