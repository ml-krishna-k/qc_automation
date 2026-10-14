import { Badge } from '@/components/ui/Badge'
import type { ChangeType } from '@/types/domain'

const CONFIG: Record<ChangeType, { label: string; tone: 'changed' | 'added' | 'removed' | 'warn' }> = {
  changed: { label: 'Changed', tone: 'changed' },
  added: { label: 'Added', tone: 'added' },
  removed: { label: 'Removed', tone: 'removed' },
  error: { label: 'Validation error', tone: 'warn' },
}

export function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const { label, tone } = CONFIG[type]
  return <Badge tone={tone}>{label}</Badge>
}
