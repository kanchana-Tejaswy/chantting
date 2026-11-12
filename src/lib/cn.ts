import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional Tailwind class names cleanly without specificity collisions.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

