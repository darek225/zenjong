import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jifvosqcxkohhvnfnbit.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4FLQupOnHzj5e82LzL6JQ_w7ACDIAH';
  return createClient(url, key);
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("shop_items")
      .select("*");

    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error("Error fetching shop items:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop items" },
      { status: 500 }
    );
  }
}