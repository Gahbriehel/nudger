import { create } from "@/lib/zustand";

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
  openCreateTask: () => set({ editor: { mode: "create" } }),
  openEditTask: (taskId) => set({ editor: { mode: "edit", taskId } }),
  closeEditor: () => set({ editor: null }),
}));
