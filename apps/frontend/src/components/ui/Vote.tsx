import type { FC } from 'react'
import { Icon } from './Icon'

interface Props {
  count: number
  voted: boolean
  onToggle?: () => void
  dir?: 'col' | 'row'
}

export const Vote: FC<Props> = ({ count, voted, onToggle, dir = 'col' }) => {
  const style = dir === 'row' ? { flexDirection: 'row' as const, gap: 8, padding: '8px 14px' } : undefined
  return (
    <button
      className={`vote ${voted ? 'on' : ''}`}
      style={style}
      onClick={(e) => { e.stopPropagation(); onToggle?.() }}
    >
      <Icon name="arrowUp" size={17} />
      <span className="vn">{count}</span>
    </button>
  )
}
