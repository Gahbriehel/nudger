"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, ClipboardCheck, Pencil } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useTaskStore } from "@/store/taskStore";
import { TaskEditor } from "./TaskEditor";
import { QuickAdd } from "./QuickAdd";
import type { Task } from "@/types/database.types";
import { useDialogFocus } from "@/hooks/useDialogFocus";

/**
 * The single create/edit task dialog. A bottom sheet on phones, a centred
 * dialog on larger screens. Guards against losing unsaved input.
 */
export function TaskEditorModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { editor, closeEditor } = useUiStore();
  const task = useTaskStore((s) =>
    editor?.mode === "edit"
      ? s.tasks.find((t) => t.id === editor.taskId)
      : undefined,
  );
  const dirtyRef = useRef(false);
  // Creating starts with quick add; "More options" switches to the full
  // editor, carrying the typed input over as a draft.
  const [draft, setDraft] = useState<{
    title: string;
    due_date: string;
  } | null>(null);
  useEffect(() => {
    if (!editor) setDraft(null);
  }, [editor]);

  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm("Discard your unsaved changes?")) {
      return;
    }
    dirtyRef.current = false;
    closeEditor();
  }, [closeEditor]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(!!editor, dialogRef);

  // Escape closes; lock background scroll while open
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [editor, requestClose]);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const handleSuccess = (saved: Task) => {
    dirtyRef.current = false;
    closeEditor();
    // Editing one occurrence of a recurring task creates a new task
    if (editor?.mode === "edit" && saved.id !== editor.taskId) {
      if (pathname.startsWith("/tasks/")) router.replace(`/tasks/${saved.id}`);
    }
  };

  if (!editor) return null;
  // Edit target vanished (deleted elsewhere / not loaded): nothing to edit
  if (editor.mode === "edit" && !task) return null;

  const isEdit = editor.mode === "edit";
  const isQuick = !isEdit && !draft;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={requestClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-editor-title"
        className="relative outline-none border border-border bg-card w-full sm:max-w-lg rounded-t-[24px] sm:rounded-[24px] shadow-2xl px-5 pt-5 sm:p-6 overflow-hidden max-h-[92dvh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-foreground/5 dark:bg-foreground/10 text-foreground rounded-xl">
              {isEdit ? (
                <Pencil className="w-5 h-5" />
              ) : (
                <ClipboardCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2
                id="task-editor-title"
                className="text-base font-bold text-foreground tracking-tight"
              >
                {isEdit ? "Edit Task" : "New Task"}
              </h2>
              {!isQuick && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEdit
                    ? "Checklist and memory cues are edited on the task page."
                    : "Add a checklist, memory cues, tags, and more."}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 p-2 -m-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain scroll-pt-3 -mx-1.5 px-1.5 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-0">
          {isQuick ? (
            <QuickAdd
              onSaved={() => {
                dirtyRef.current = false;
                closeEditor();
              }}
              onMoreOptions={setDraft}
              onDirtyChange={handleDirtyChange}
            />
          ) : (
            <TaskEditor
              // Remount per target so defaults re-initialise
              key={isEdit ? `edit-${task!.id}` : "create"}
              task={task}
              draft={draft ?? undefined}
              onSuccess={handleSuccess}
              onCancel={requestClose}
              onDirtyChange={handleDirtyChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
