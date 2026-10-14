import { clsx, type ClassValue } from 'clsx'

/** Thin wrapper around clsx so class-merging reads consistently across components. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
