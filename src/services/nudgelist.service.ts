import { taskService } from "./task.service";
import { Task } from "@/types/database.types";

export interface NudgelistData {
  overdue: Task[];
  forgotten: Task[];
  stale: Task[];
}

export const nudgelistService = {
  async getNudgelist(): Promise<NudgelistData> {
    const tasks = await taskService.getTasks();
    const now = new Date();

    const overdue: Task[] = [];
    const forgotten: Task[] = [];
    const stale: Task[] = [];

    const ONE_DAY = 24 * 60 * 60 * 1000;

    tasks.forEach((task) => {
      if (task.status === "completed") return;

      const isOverdue =
        task.due_date && new Date(task.due_date).getTime() < now.getTime();
      
      const lastUpdatedTime = new Date(task.updated_at || task.created_at).getTime();
      const daysSinceInteraction = (now.getTime() - lastUpdatedTime) / ONE_DAY;

      if (isOverdue) {
        overdue.push(task);
      } else if (daysSinceInteraction >= 7) {
        forgotten.push(task);
      } else if (daysSinceInteraction >= 3) {
        stale.push(task);
      }
    });

    return {
      overdue,
      forgotten,
      stale,
    };
  },
};
