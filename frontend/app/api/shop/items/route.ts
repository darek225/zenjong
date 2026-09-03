import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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