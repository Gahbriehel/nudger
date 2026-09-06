import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Generates a random Date in the future (between minHours and maxHours)
 * to nudge the user for flexible tasks.
 */
export function getRandomReminderTime(minHours = 12, maxHours = 48): Date {
  const randomHours =
    Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours;
  const date = new Date();
  date.setHours(date.getHours() + randomHours);
  return date;
}
