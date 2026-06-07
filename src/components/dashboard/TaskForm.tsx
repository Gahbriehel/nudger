"use client";

import { useState, useEffect } from "react";
import { useForm, zodResolver } from "@/lib/react-hook-form";
import { z, infer as zInfer } from "@/lib/zod";
import { taskService } from "@/services/task.service";
import { tagService } from "@/services/tag.service";
import { useTaskStore } from "@/store/taskStore";
import { Tag, TaskType, RecurrenceType } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  task_type: z.string(),
  due_date: z.string().optional(),
  reminder_at: z.string().optional(),
  recurrence_type: z.string().optional(),
  recurrence_interval: z.string().optional(),
  notes: z.string().optional(),
});

type TaskFormInput = zInfer<typeof taskSchema>;

interface TaskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ onSuccess, onCancel }: TaskFormProps) {
  const addTaskState = useTaskStore((s) => s.addTaskState);
  const [error, setError] = useState<string | null>(null);

  // Subtasks & Memory Cues local state
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [memoryCues, setMemoryCues] = useState<string[]>([]);
  const [newCue, setNewCue] = useState("");

  // Tags selection
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  const {
    register,
    handleSubmit,
    values,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormInput>({
    defaultValues: {
      title: "",
      description: "",
      task_type: "flexible",
      due_date: "",
      reminder_at: "",
      recurrence_type: "daily",
      recurrence_interval: "1",
      notes: "",
    },
    resolver: zodResolver(taskSchema),
  });

  const taskType = values.task_type;

  useEffect(() => {
    // Load existing tags
    tagService.getTags()
      .then(setAvailableTags)
      .catch((err) => console.error("Error fetching tags:", err));
  }, []);

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask("");
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleAddCue = () => {
    if (newCue.trim()) {
      setMemoryCues([...memoryCues, newCue.trim()]);
      setNewCue("");
    }
  };

  const handleRemoveCue = (index: number) => {
    setMemoryCues(memoryCues.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const cleanTag = newTagInput.trim().toLowerCase();
    if (cleanTag && !selectedTags.includes(cleanTag)) {
      setSelectedTags([...selectedTags, cleanTag]);
      setNewTagInput("");
    }
  };

  const handleToggleAvailableTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const onSubmit = async (data: TaskFormInput) => {
    setError(null);
    try {
      const interval = data.recurrence_interval
        ? parseInt(data.recurrence_interval, 10)
        : null;

      const taskPayload = {
        title: data.title,
        description: data.description || null,
        task_type: data.task_type as TaskType,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        reminder_at: data.reminder_at ? new Date(data.reminder_at).toISOString() : null,
        recurrence_type: data.task_type === "recurring" ? (data.recurrence_type as RecurrenceType) : null,
        recurrence_interval: data.task_type === "recurring" ? (interval || 1) : null,
        notes: data.notes || null,
      };

      const newTask = await taskService.createTask(
        taskPayload,
        subtasks,
        memoryCues,
        selectedTags
      );

      addTaskState(newTask);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-foreground max-h-[80vh] overflow-y-auto px-1">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md p-3">
          {error}
        </div>
      )}

      {/* Task Title */}
      <div className="grid gap-2">
        <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
        <Input
          id="title"
          placeholder="What do you need to remember?"
          {...register("title")}
          className={cn(errors.title && "border-destructive/50")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
        <Textarea
          id="description"
          placeholder="Add details about this task..."
          {...register("description")}
          className="min-h-[80px]"
        />
      </div>

      {/* Task Type Select */}
      <div className="grid gap-2">
        <Label htmlFor="task_type" className="text-sm font-semibold">Task Type</Label>
        <select
          id="task_type"
          {...register("task_type")}
          className="bg-background border border-input text-foreground rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="flexible">Flexible (No set deadline)</option>
          <option value="scheduled">Scheduled (Specific deadline)</option>
          <option value="recurring">Recurring (Repeats on interval)</option>
        </select>
      </div>

      {/* Conditional Fields based on Task Type */}
      {taskType === "scheduled" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border bg-muted/20 p-4 rounded-lg">
          <div className="grid gap-2">
            <Label htmlFor="due_date" className="text-sm font-semibold">Due Date</Label>
            <Input
              id="due_date"
              type="datetime-local"
              {...register("due_date")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reminder_at" className="text-sm font-semibold">Reminder</Label>
            <Input
              id="reminder_at"
              type="datetime-local"
              {...register("reminder_at")}
            />
          </div>
        </div>
      )}

      {taskType === "recurring" && (
        <div className="space-y-4 border border-border bg-muted/20 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="due_date" className="text-sm font-semibold">Initial Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                {...register("due_date")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder_at" className="text-sm font-semibold">Reminder</Label>
              <Input
                id="reminder_at"
                type="datetime-local"
                {...register("reminder_at")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="recurrence_type" className="text-sm font-semibold">Recurrence Interval</Label>
              <select
                id="recurrence_type"
                {...register("recurrence_type")}
                className="bg-background border border-input text-foreground rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recurrence_interval" className="text-sm font-semibold">Repeat Every</Label>
              <Input
                id="recurrence_interval"
                type="number"
                min="1"
                {...register("recurrence_interval")}
              />
            </div>
          </div>
        </div>
      )}

      {/* Subtasks checklist */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Subtasks / Checklist</Label>
        <div className="flex gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Add subtask details..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSubtask();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleAddSubtask}
            variant="outline"
            className="px-4"
          >
            Add
          </Button>
        </div>
        {subtasks.length > 0 && (
          <ul className="space-y-2 max-h-[150px] overflow-y-auto bg-muted/20 p-2 rounded-md border border-border">
            {subtasks.map((sub, idx) => (
              <li key={idx} className="flex justify-between items-center bg-background px-3 py-1.5 rounded text-sm text-foreground border border-border">
                <span>{sub}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(idx)}
                  className="text-destructive hover:text-destructive/80 text-xs transition-colors"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Memory Cues */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Memory Cues (triggers to help you remember)</Label>
        <div className="flex gap-2">
          <Input
            value={newCue}
            onChange={(e) => setNewCue(e.target.value)}
            placeholder="e.g. Put keys by the fridge, post-it on monitor..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCue();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleAddCue}
            variant="outline"
            className="px-4"
          >
            Add
          </Button>
        </div>
        {memoryCues.length > 0 && (
          <ul className="space-y-2 max-h-[150px] overflow-y-auto bg-muted/20 p-2 rounded-md border border-border">
            {memoryCues.map((cue, idx) => (
              <li key={idx} className="flex justify-between items-center bg-background px-3 py-1.5 rounded text-sm text-foreground border border-border">
                <span>{cue}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCue(idx)}
                  className="text-destructive hover:text-destructive/80 text-xs transition-colors"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Add new tag name..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleAddTag}
            variant="outline"
            className="px-4"
          >
            Add Tag
          </Button>
        </div>

        {/* Selected Tags list */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((t) => (
              <span
                key={t}
                className="bg-primary/20 text-foreground border border-primary/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-primary/30 transition-colors"
                onClick={() => handleToggleAvailableTag(t)}
              >
                #{t}
                <span className="text-[10px] opacity-60">×</span>
              </span>
            ))}
          </div>
        )}

        {/* Available Tags list */}
        {availableTags.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">Select from existing tags:</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags
                .filter((tag) => !selectedTags.includes(tag.name))
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleAvailableTag(tag.name)}
                    className="bg-muted hover:bg-muted/80 border border-border text-xs text-foreground px-2.5 py-1 rounded-full transition-all"
                  >
                    #{tag.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="grid gap-2">
        <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any other mental hooks or reference notes..."
          {...register("notes")}
          className="min-h-[80px]"
        />
      </div>

      {/* Form Controls */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating Task..." : "Save Task"}
        </Button>
      </div>
    </form>
  );
}
