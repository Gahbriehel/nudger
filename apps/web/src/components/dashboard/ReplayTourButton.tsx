"use client";

import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTourStore } from "@/store/tourStore";

export function ReplayTourButton() {
  const requestReplay = useTourStore((s) => s.requestReplay);
  return (
    <Button
      variant="outline"
      onClick={requestReplay}
      className="h-10 px-4 rounded-xl font-semibold gap-2 shrink-0"
    >
      <PlayCircle className="w-4 h-4" /> Replay tour
    </Button>
  );
}
