"use client";

import { useEffect, useRef } from "react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import { toast } from "sonner";
import { getRandomReminderTime } from "@/lib/utils";

export function useNotificationChecker() {
  const { tasks, updateTaskState, loading } = useTaskStore();
  const checkedTaskIdsRef = useRef<Set<string>>(new Set());
  const tasksRef = useRef(tasks);
  const loadingRef = useRef(loading);

  // Keep refs updated
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Load notified task IDs from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nudger_notified_task_ids");
        if (cached) {
          const ids = JSON.parse(cached);
          if (Array.isArray(ids)) {
            ids.forEach((id) => checkedTaskIdsRef.current.add(id));
          }
        }
      } catch (err) {
        console.error("Failed to read notified tasks from localStorage:", err);
      }
    }
  }, []);

  const saveToLocalStorage = (id: string) => {
    checkedTaskIdsRef.current.add(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "nudger_notified_task_ids",
          JSON.stringify(Array.from(checkedTaskIdsRef.current)),
        );
      } catch (err) {
        console.error("Failed to save notified task to localStorage:", err);
      }
    }
  };

  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      const currentTasks = tasksRef.current;

      // 1. Process pending reminders
      const pendingReminders = currentTasks.filter((task) => {
        if (task.status !== "pending") return false;
        if (!task.reminder_at) return false;

        const key = `${task.id}-reminder`;
        if (
          task.reminder_sent ||
          checkedTaskIdsRef.current.has(task.id) ||
          checkedTaskIdsRef.current.has(key)
        ) {
          return false;
        }

        const reminderTime = new Date(task.reminder_at);
        return reminderTime <= now;
      });

      for (const task of pendingReminders) {
        const key = `${task.id}-reminder`;
        saveToLocalStorage(key);
        saveToLocalStorage(task.id); // for backward compatibility

        // Display the Sonner Toast for Reminder
        toast.info(
          task.task_type === "flexible"
            ? `Task Nudge (Flexible)`
            : `Task Nudge!`,
          {
            description: task.title,
            duration: 10000,
          },
        );

        // Update the task status in store and database to prevent duplicate alerts
        try {
          if (task.task_type === "flexible") {
            const nextReminder = getRandomReminderTime().toISOString();
            updateTaskState(task.id, {
              reminder_at: nextReminder,
              reminder_sent: false,
            });
            await taskService.updateTask(task.id, {
              reminder_at: nextReminder,
              reminder_sent: false,
            });
          } else {
            updateTaskState(task.id, { reminder_sent: true });
            await taskService.updateTask(task.id, { reminder_sent: true });
          }
        } catch (error) {
          console.error(
            `Failed to update reminder_sent for task ${task.id}:`,
            error,
          );
        }
      }

      // 2. Process pending due dates
      const pendingDues = currentTasks.filter((task) => {
        if (task.status !== "pending") return false;
        if (!task.due_date) return false;

        const key = `${task.id}-due`;
        if (task.due_sent || checkedTaskIdsRef.current.has(key)) {
          return false;
        }

        const dueTime = new Date(task.due_date);
        return dueTime <= now;
      });

      for (const task of pendingDues) {
        const key = `${task.id}-due`;
        saveToLocalStorage(key);

        // Display the Sonner Toast for Due Date
        toast.warning(`Task Due!`, {
          description: task.title,
          duration: 10000,
        });

        // Update the task status in store and database to prevent duplicate alerts
        try {
          updateTaskState(task.id, { due_sent: true });
          await taskService.updateTask(task.id, { due_sent: true });
        } catch (error) {
          console.error(
            `Failed to update due_sent for task ${task.id}:`,
            error,
          );
        }
      }

      // 3. Process idle nudges (no pending tasks)
      const hasPendingTasks = currentTasks.some(
        (task) => task.status === "pending",
      );
      if (!hasPendingTasks && !loadingRef.current) {
        let lastIdleNudge = 0;
        try {
          const cached = localStorage.getItem("nudger_last_idle_nudge");
          if (cached) {
            lastIdleNudge = parseInt(cached, 10);
          } else {
            // First time seeing no tasks, initialize the timer to now so it doesn't trigger immediately
            lastIdleNudge = now.getTime();
            localStorage.setItem(
              "nudger_last_idle_nudge",
              lastIdleNudge.toString(),
            );
          }
        } catch (err) {
          console.error("Failed to read last idle nudge:", err);
        }

        // Check if 4 hours have passed since the last nudge (or since they had no tasks)
        if (now.getTime() - lastIdleNudge > 4 * 60 * 60 * 1000) {
          // 2% chance every 15 seconds (~12.5 minutes average wait after the 4 hours)
          if (Math.random() < 0.02) {
            const messages = [
              "Your task list is empty! Time to add something new?",
              "Nothing on your plate? Add a task to keep the momentum going!",
              "All caught up? Plan your next move.",
              "Nudger is resting. Give it some work to do!",
              "You're all clear! Ready to tackle a new goal?",
            ];
            const randomMessage =
              messages[Math.floor(Math.random() * messages.length)];

            toast("Quiet day?", {
              description: randomMessage,
              duration: 8000,
              icon: "👋",
            });

            try {
              localStorage.setItem(
                "nudger_last_idle_nudge",
                now.getTime().toString(),
              );
            } catch (e) {
              console.error("Failed to save last idle nudge:", e);
            }
          }
        }
      }
    };

    // Run check immediately on load/mount
    checkReminders();

    // Check every 15 seconds
    const interval = setInterval(checkReminders, 15000);

    return () => clearInterval(interval);
  }, [updateTaskState]);
}
