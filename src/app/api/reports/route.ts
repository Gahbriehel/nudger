import { createClient } from "@/lib/supabase/server";
import { reportService } from "@/services/report.service";
import { ReportPeriod } from "@/types/database.types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period");
    const offsetParam = searchParams.get("offset");

    const period: ReportPeriod =
      periodParam === "monthly" ? "monthly" : "weekly";
    const offset = offsetParam ? parseInt(offsetParam, 10) || 0 : 0;

    const reportData = await reportService.getReportData(
      period,
      offset,
      supabase,
    );

    return NextResponse.json(reportData);
  } catch (error: unknown) {
    console.error("Error generating report:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
