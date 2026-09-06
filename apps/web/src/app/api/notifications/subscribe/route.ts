import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { subscription, action } = await request.json();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription payload is required" },
        { status: 400 },
      );
    }

    if (action === "subscribe") {
      // Upsert the subscription record for the current user
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          subscription: subscription,
        },
        { onConflict: "user_id, subscription" },
      );

      if (error) {
        console.error("Error saving subscription:", error);
        return NextResponse.json(
          { error: "Failed to save subscription" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Subscribed successfully",
      });
    } else if (action === "unsubscribe") {
      // Delete the subscription matching this specific endpoint
      const endpoint = subscription.endpoint;

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .filter("subscription->>endpoint", "eq", endpoint);

      if (error) {
        console.error("Error deleting subscription:", error);
        return NextResponse.json(
          { error: "Failed to delete subscription" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Unsubscribed successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Subscription route error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
