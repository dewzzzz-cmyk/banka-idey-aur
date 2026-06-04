import type { FC } from 'react'
import type { IdeaCategory } from '@portal/types'
import { CAT_LABELS, CAT_ICONS } from '@portal/types'
import { Icon } from './Icon'

const CAT_CLS: Record<IdeaCategory, string> = {
  proc: 'cat-proc', it: 'cat-it', prod: 'cat-prod',
  save: 'cat-save', work: 'cat-work', cx: 'cat-cx',
}

export const CatChip: FC<{ cat: string }> = ({ cat }) => {
  const cls = CAT_CLS[cat as IdeaCategory] ?? 'cat-proc'
  const label = CAT_LABELS[cat as IdeaCategory] ?? cat
  const icon = CAT_ICONS[cat as IdeaCategory] ?? 'box'
  return (
    <span className={`chip ${cls}`}>
      <Icon name={icon} size={13} />
      {label}
    </span>
  )
}
