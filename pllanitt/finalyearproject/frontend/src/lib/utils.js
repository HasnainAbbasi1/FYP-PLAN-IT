
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge multiple class names together and handle CSS conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
