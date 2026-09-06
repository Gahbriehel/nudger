"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthenticatedLayout } from "@/components/dashboard/AuthenticatedLayout";
import { ReportPeriodSelector } from "@/components/dashboard/reports/ReportPeriodSelector";
import { ReportOverviewCards } from "@/components/dashboard/reports/ReportOverviewCards";
import { ActivityVelocityChart } from "@/components/dashboard/reports/ActivityVelocityChart";
import { CognitiveCueInsights } from "@/components/dashboard/reports/CognitiveCueInsights";
import { TaskDistributionBreakdown } from "@/components/dashboard/reports/TaskDistributionBreakdown";
import { AccomplishmentList } from "@/components/dashboard/reports/AccomplishmentList";
import { ReportExportModal } from "@/components/dashboard/reports/ReportExportModal";
import { Spinner } from "@/components/ui/spinner";
import { reportService } from "@/services/report.service";
import { ReportData, ReportPeriod } from "@/types/database.types";
import { toast } from "sonner";
import { BarChart2 } from "lucide-react";

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [offset, setOffset] = useState<number>(0);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadReport = useCallback(async (p: ReportPeriod, off: number) => {
    setLoading(true);
    try {
      const data = await reportService.getReportData(p, off);
      setReport(data);
    } catch (error: unknown) {
      console.error("Failed to load report data:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Please try refreshing the page.";
      toast.error("Failed to load report", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(period, offset);
  }, [period, offset, loadReport]);

  const handlePeriodChange = (newPeriod: ReportPeriod) => {
    if (newPeriod !== period) {
      setPeriod(newPeriod);
      setOffset(0); // Reset offset on timeframe switch
    }
  };

  const handlePrev = () => {
    setOffset((prev) => prev - 1);
  };

  const handleNext = () => {
    setOffset((prev) => Math.min(0, prev + 1));
  };

  const handleReset = () => {
    setOffset(0);
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 pb-12">
        {/* Page Banner Header */}
        <div className="relative overflow-hidden border border-border bg-card/85 backdrop-blur-md p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-indigo before:to-brand-blue">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-indigo/10 text-brand-indigo">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Productivity & Habit Reports
              </h1>
            </div>
            <p className="text-xs text-muted-foreground leading-normal max-w-lg">
              Review completion velocity, habit recurrence adherence, and
              cognitive cue impact across weekly and monthly cycles.
            </p>
          </div>
        </div>

        {/* Timeframe & Period Navigation */}
        {report && (
          <ReportPeriodSelector
            period={period}
            onPeriodChange={handlePeriodChange}
            timeframe={report.timeframe}
            onPrev={handlePrev}
            onNext={handleNext}
            onReset={handleReset}
            onOpenExport={() => setIsExportOpen(true)}
            loading={loading}
          />
        )}

        {/* Loading Spinner */}
        {loading && !report ? (
          <div className="py-24 flex items-center justify-center">
            <Spinner size="lg" label="Calculating productivity analytics..." />
          </div>
        ) : report ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Overview KPI Cards */}
            <ReportOverviewCards report={report} />

            {/* Daily / Monthly Activity Velocity Chart */}
            <ActivityVelocityChart
              dailyActivity={report.dailyActivity}
              mostProductiveDay={report.metrics.mostProductiveDay}
              period={period}
            />

            {/* Cognitive Cue Impact Section */}
            <CognitiveCueInsights metrics={report.metrics} />

            {/* Task Type and Focus Tag Breakdown */}
            <TaskDistributionBreakdown
              taskTypes={report.taskTypeBreakdown}
              tags={report.topTags}
            />

            {/* Accomplishment Log */}
            <AccomplishmentList items={report.completedItems} />

            {/* Export Summary Modal */}
            <ReportExportModal
              report={report}
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
            />
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Could not load report data.
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
