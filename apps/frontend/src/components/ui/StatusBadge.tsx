import type { FC } from 'react'
import type { IdeaStatus } from '@portal/types'
import { STATUS_LABELS } from '@portal/types'

const STATUS_CLS: Record<IdeaStatus, string> = {
  draft: 'b-draft', mod: 'b-mod', rework: 'b-rework', list: 'b-list',
  expert: 'b-expert', work: 'b-work', done: 'b-done', reject: 'b-reject',
  duplicate: 'b-reject', archive: 'b-draft',
}

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const cls = STATUS_CLS[status as IdeaStatus] ?? 'b-draft'
  const label = STATUS_LABELS[status as IdeaStatus] ?? status
  return <span className={`badge ${cls}`}><span className="bdot" />{label}</span>
}
