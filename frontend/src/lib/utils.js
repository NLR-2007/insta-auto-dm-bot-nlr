import { clsx } from "clsx";
// Note: tailwind-merge has a default export or named export depending on version.
// Let's use the standard import form.
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
