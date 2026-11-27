import { create } from "@/lib/zustand";

interface TourState {
  /** Incremented to ask WelcomeTour to (re)start, e.g. "Replay tour". */
  replayRequest: number;
  requestReplay: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  replayRequest: 0,
  requestReplay: () => set((s) => ({ replayRequest: s.replayRequest + 1 })),
}));
