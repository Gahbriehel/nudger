import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

// Initialize web-push VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@nudger.app",
    vapidPublicKey,
    vapidPrivateKey,
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "VAPID keys are not configured on the server." },
        { status: 500 },
      );
    }

    // Accept an optional specific subscription from the body (sent right after subscribing)
    // so we can test even before the DB write propagates
    const body = await request.json().catch(() => ({}));
    const inlineSubscription = body?.subscription ?? null;

    let subscriptionsToTest: webpush.PushSubscription[] = [];

    if (inlineSubscription) {
      subscriptionsToTest = [inlineSubscription as webpush.PushSubscription];
    } else {
      // Fall back to fetching from the DB
      const { data: subs, error } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch subscriptions: ${error.message}` },
          { status: 500 },
        );
      }

      subscriptionsToTest = (subs ?? []).map(
        (s) => s.subscription as webpush.PushSubscription,
      );
    }

    if (subscriptionsToTest.length === 0) {
      return NextResponse.json(
        {
          error:
            "No active push subscriptions found. Make sure you have enabled notifications first.",
        },
        { status: 404 },
      );
    }

    const payload = JSON.stringify({
      title: "🎉 Nudger Notifications Active!",
      body: "Push notifications are working. You will be nudged when tasks are due.",
      data: { url: "/" },
    });

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptionsToTest) {
      try {
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        const message =
          err instanceof Error ? err.message : "Unknown push error";
        errors.push(`[${statusCode ?? "?"}] ${message}`);
        console.error("Test push failed:", err);
      }
    }

    if (sentCount === 0) {
      return NextResponse.json(
        {
          error: `Test notification failed to deliver. Details: ${errors.join("; ")}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${sentCount} device(s).`,
    });
  } catch (error: unknown) {
    console.error("Test notification route error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
