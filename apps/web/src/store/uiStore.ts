import { create } from "@/lib/zustand";

interface UiState {
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showCreateModal: false,
  setShowCreateModal: (show) => set({ showCreateModal: show }),
}));
