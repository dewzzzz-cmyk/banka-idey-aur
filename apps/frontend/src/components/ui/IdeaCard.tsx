import type { FC } from 'react'
import type { IdeaListItem } from '@portal/types'
import { Avatar } from './Avatar'
import { StatusBadge } from './StatusBadge'
import { CatChip } from './CatChip'
import { Vote } from './Vote'
import { Icon } from './Icon'

interface Props {
  idea: IdeaListItem
  variant?: 'feed' | 'rank' | 'work' | 'hall' | 'compact'
  rank?: number
  onOpen?: (idea: IdeaListItem) => void
  onVote?: (id: string) => void
}

export const IdeaCard: FC<Props> = ({ idea, variant = 'feed', rank, onOpen, onVote }) => {
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <article className="idea card" data-variant={variant} onClick={() => onOpen?.(idea)}>
      {rank != null && <div className={`rankno ${rank <= 3 ? 'top' : ''}`}>{rank}</div>}
      <div className="idea-body">
        <div className="idea-top">
          <CatChip cat={idea.category} />
          <StatusBadge status={idea.status} />
          {idea.isAnonymous && <span className="anon-tag"><Icon name="eye" size={12} />Псевдоним</span>}
        </div>
        <h3 className="idea-title">{idea.cardData.title || 'Без названия'}</h3>
        {variant !== 'compact' && idea.cardData.problem && (
          <p className="idea-desc">{idea.cardData.problem}</p>
        )}
        {variant === 'work' && idea.assigneeName && (
          <div className="idea-meta-row">
            <span className="metaitem"><Icon name="user" size={15} />Реализатор: <b>{idea.assigneeName}</b></span>
            {idea.dueDate && (
              <span className="metaitem"><Icon name="calendar" size={15} />Срок: <b>{new Date(idea.dueDate).toLocaleDateString('ru-RU')}</b></span>
            )}
          </div>
        )}
        {variant === 'hall' && idea.effectFact && (
          <div className="effect-strip"><Icon name="trend" size={16} /><span>{idea.effectFact}</span></div>
        )}
        <div className="idea-foot" onClick={stop}>
          <div className="author">
            <Avatar name={idea.authorName} size="sm" anon={idea.isAnonymous} />
            <span className="author-name">{idea.authorName}</span>
            <span className="dot-sep">·</span>
            <span className="faint">{idea.authorDept}</span>
            <span className="dot-sep">·</span>
            <span className="faint">{new Date(idea.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
          <div className="idea-stats">
            <span className="ministat"><Icon name="comment" size={15} />{idea.comments}</span>
            <span className="ministat"><Icon name="eye" size={15} />{idea.views}</span>
          </div>
        </div>
      </div>
      {variant !== 'hall' && (
        <div className="idea-vote" onClick={stop}>
          <Vote count={idea.votes} voted={idea.votedByMe} onToggle={() => onVote?.(idea.id)} />
        </div>
      )}
      {variant === 'hall' && (
        <div className="hall-medal"><Icon name="medal" size={26} /></div>
      )}
    </article>
  )
}
