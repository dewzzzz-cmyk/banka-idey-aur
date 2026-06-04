import type { FC, ReactNode } from 'react'
import { Icon } from './Icon'

interface Props { icon?: string; title: string; text?: string; action?: ReactNode }

export const Empty: FC<Props> = ({ icon = 'inbox', title, text, action }) => (
  <div className="empty">
    <div className="empty-ic"><Icon name={icon} size={30} /></div>
    <h3>{title}</h3>
    {text && <p>{text}</p>}
    {action}
  </div>
)
