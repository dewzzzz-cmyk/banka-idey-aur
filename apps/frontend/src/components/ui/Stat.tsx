import type { FC } from 'react'
import { Icon } from './Icon'

interface Props { n: string | number; label: string; icon: string; tone?: string }

export const Stat: FC<Props> = ({ n, label, icon, tone }) => (
  <div className="statcard card">
    <div className={`statcard-ic ${tone ?? ''}`}><Icon name={icon} size={20} /></div>
    <div className="stat">
      <div className="sn">{n}</div>
      <div className="sl">{label}</div>
    </div>
  </div>
)
