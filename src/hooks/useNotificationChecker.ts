"use client";

import { useEffect, useRef } from "react";
import { useTaskStore } from "@/store/taskStore";
import { taskService } from "@/services/task.service";
import { toast } from "sonner";

export function useNotificationChecker() {
  const { tasks, updateTaskState } = useTaskStore();
  const checkedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();

      // Find tasks that are pending, have a reminder time, reminder is in the past, and not yet marked sent
      const pendingReminders = tasks.filter((task) => {
        if (task.status !== "pending") return false;
        if (!task.reminder_at) return false;

        // Grace check: if it was sent or we checked it in this session, skip
        if (task.reminder_sent || checkedTaskIdsRef.current.has(task.id))
          return false;

        const reminderTime = new Date(task.reminder_at);
        return reminderTime <= now;
      });

      for (const task of pendingReminders) {
        // Prevent double checking/triggering in this interval loop
        checkedTaskIdsRef.current.add(task.id);

        // Display the Sonner Toast
        toast.info(`Task Nudge! ⏰`, {
          description: task.title,
          duration: 10000,
          action: {
            label: "View Details",
            onClick: () => {
              // Can do something here, e.g., open a task view
            },
          },
        });

        // Update the task status in the database to prevent duplicate alerts
        try {
          // Update client state first for instant responsiveness
          updateTaskState(task.id, { reminder_sent: true });

          // Update DB
          await taskService.updateTask(task.id, { reminder_sent: true });
        } catch (error) {
          console.error(
            `Failed to update reminder_sent for task ${task.id}:`,
            error,
          );
        }
      }
    };

    // Run check immediately on load/mount
    checkReminders();

    // Check every 15 seconds
    const interval = setInterval(checkReminders, 15000);

    return () => clearInterval(interval);
  }, [tasks, updateTaskState]);
}
