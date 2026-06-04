import type { FC } from 'react'

interface Props { kicker?: string; title: string; more?: string; onMore?: () => void }

export const SectionH: FC<Props> = ({ kicker, title, more, onMore }) => (
  <div className="section-h">
    <div>
      {kicker && <div className="kicker" style={{ marginBottom: 5 }}>{kicker}</div>}
      <h2>{title}</h2>
    </div>
    {more && <span className="more" onClick={onMore}>{more} →</span>}
  </div>
)
