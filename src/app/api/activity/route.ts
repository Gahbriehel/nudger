import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Upsert activity record
    const { error } = await adminClient.from("user_activity").upsert(
      {
        user_id: user.id,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Failed to update user activity:", error);
      return NextResponse.json(
        { error: "Failed to update activity" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
