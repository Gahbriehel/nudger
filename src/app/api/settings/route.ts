import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "Row not found"
      console.error("Failed to fetch user settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 },
      );
    }

    const defaultSettings = {
      user_id: user.id,
      max_flexible_nudges_per_day: 2,
      enable_idle_nudges: true,
      enable_subtask_nudges: true,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
      flexible_nudges_count_today: 0,
      last_nudge_date: new Date().toISOString().split("T")[0],
    };

    return NextResponse.json(settings || defaultSettings);
  } catch (error: unknown) {
    console.error("Settings GET error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

    const body = await request.json();

    const {
      max_flexible_nudges_per_day,
      enable_idle_nudges,
      enable_subtask_nudges,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
    } = body;

    const payload = {
      user_id: user.id,
      ...(max_flexible_nudges_per_day !== undefined && {
        max_flexible_nudges_per_day: Number(max_flexible_nudges_per_day),
      }),
      ...(enable_idle_nudges !== undefined && {
        enable_idle_nudges: Boolean(enable_idle_nudges),
      }),
      ...(enable_subtask_nudges !== undefined && {
        enable_subtask_nudges: Boolean(enable_subtask_nudges),
      }),
      ...(quiet_hours_enabled !== undefined && {
        quiet_hours_enabled: Boolean(quiet_hours_enabled),
      }),
      ...(quiet_hours_start !== undefined && { quiet_hours_start }),
      ...(quiet_hours_end !== undefined && { quiet_hours_end }),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to update user settings:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Settings POST error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
