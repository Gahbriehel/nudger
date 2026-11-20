import { create } from "@/lib/zustand";
import { requireOnline } from "@/lib/offline";

/** Which task editor (if any) is open. One editor serves create and edit. */
export type EditorState = { mode: "create" } | { mode: "edit"; taskId: string };

interface UiState {
  editor: EditorState | null;
  openCreateTask: () => void;
  openEditTask: (taskId: string) => void;
  closeEditor: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  editor: null,
  // Offline mode is read-only, so the editor stays closed
  openCreateTask: () => {
    if (requireOnline()) set({ editor: { mode: "create" } });
  },
  openEditTask: (taskId) => {
    if (requireOnline()) set({ editor: { mode: "edit", taskId } });
  },
  closeEditor: () => set({ editor: null }),
}));
