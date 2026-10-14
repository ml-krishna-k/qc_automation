/** Short, collision-resistant id for client-side entities (uploads, rows, runs). */
export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9)
  const time = Date.now().toString(36)
  return `${prefix}_${time}${random}`
}
