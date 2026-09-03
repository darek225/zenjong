import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jifvosqcxkohhvnfnbit.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4FLQupOnHzj5e82LzL6JQ_w7ACDIAH';
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { userId, itemId, currencyType } = body;

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, itemId" },
        { status: 400 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from("shop_items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const currency = currencyType || item.currency_type;
    const price = item.price;

    if (!currency || !price) {
      return NextResponse.json(
        { error: "Item has invalid currency or price configuration" },
        { status: 400 }
      );
    }

    const balanceColumn = currency === "jade" ? "jade_balance" : "pearl_balance";
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("jade_balance, pearl_balance")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance =
      currency === "jade" ? user.jade_balance : user.pearl_balance;

    if (currentBalance < price) {
      return NextResponse.json(
        { error: `Insufficient ${currency} balance`, currentBalance, price },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - price;
    const { error: updateError } = await supabase
      .from("users")
      .update({ [balanceColumn]: newBalance })
      .eq("id", userId);

    if (updateError) throw updateError;

    const { error: inventoryError } = await supabase
      .from("user_inventory")
      .insert({
        user_id: userId,
        item_id: itemId,
        acquired_at: new Date().toISOString(),
      });

    if (inventoryError) throw inventoryError;

    const { data: updatedUser, error: finalError } = await supabase
      .from("users")
      .select("jade_balance, pearl_balance, id, username")
      .eq("id", userId)
      .single();

    if (finalError) throw finalError;

    return NextResponse.json({
      success: true,
      user: updatedUser,
      purchasedItem: item,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);
    return NextResponse.json(
      { error: "Failed to process purchase" },
      { status: 500 }
    );
  }
}