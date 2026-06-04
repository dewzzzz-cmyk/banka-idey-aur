import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { useUIStore } from '@/stores/ui'
import { IdeaCard } from '@/components/ui/IdeaCard'
import { SectionH } from '@/components/ui/SectionH'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'

const CATS = [
  { k: 'proc', label: 'Процессы' },
  { k: 'it', label: 'IT' },
  { k: 'prod', label: 'Продукт' },
  { k: 'save', label: 'Экономия' },
  { k: 'work', label: 'Условия труда' },
  { k: 'cx', label: 'Клиентский опыт' },
]

export default function Home() {
  const navigate = useNavigate()
  const { setDetailIdea } = useUIStore()
  const [filter, setFilter] = useState('all')
  const [searchParams] = useSearchParams()
  const searchQ = searchParams.get('q') ?? ''

  const utils = trpc.useUtils()
  const { data: ideasData, isLoading } = trpc.idea.list.useQuery({ limit: 30, search: searchQ || undefined })
  const { data: kpi } = trpc.analytics.getKpi.useQuery({ period: 'quarter' })
  const voteMut = trpc.idea.vote.useMutation({ onSuccess: () => utils.idea.list.invalidate() })
  const unvoteMut = trpc.idea.unvote.useMutation({ onSuccess: () => utils.idea.list.invalidate() })

  const ideas = ideasData?.items ?? []

  const feed = ideas.filter(
    (i) => i.status !== 'draft' && (filter === 'all' || i.category === filter),
  )

  const topIdeas = [...ideas]
    .filter((i) => !['draft', 'reject', 'duplicate', 'archive'].includes(i.status))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3)

  const onVote = (id: string) => {
    const idea = ideas.find((i) => i.id === id)
    if (!idea) return
    if (idea.votedByMe) unvoteMut.mutate({ ideaId: id })
    else voteMut.mutate({ ideaId: id })
  }

  return (
    <div className="wrap fade">
      {/* Hero CTA — compact */}
      <div className="cta-hero" style={{ padding: '30px 40px' }}>
        <div className="cta-glow" />
        <div className="cta-content">
          <div className="cta-kicker">
            <Icon name="sparkles" size={15} />
            Каждая идея важна — даже маленькая
          </div>
          <h1 className="cta-title" style={{ fontSize: 26, marginBottom: 8 }}>Есть мысль, как сделать работу лучше?</h1>
          <p className="cta-sub" style={{ marginBottom: 16 }}>
            Расскажите своими словами — ИИ-помощник задаст пару вопросов и соберёт карточку за вас.
          </p>
          <div className="cta-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/chat')}
            >
              <Icon name="bulb" size={19} />
              Предложить идею
            </button>
            <button className="btn btn-lg cta-secondary">
              <Icon name="eye" size={18} />
              Как это работает
            </button>
          </div>
          <div className="cta-trust">
            <div className="trust-avs">
              {['Марат Сафин', 'Ольга Лебедева', 'Игорь Пономарёв', 'Наталья Ким'].map((n) => (
                <Avatar key={n} name={n} size="sm" />
              ))}
            </div>
            <span>
              Коллеги уже подали <b>{kpi?.totalIdeas ?? '...'} идей</b> — присоединяйтесь
            </span>
          </div>
        </div>
      </div>

      {/* Top ideas */}
      {topIdeas.length > 0 && (
        <div className="topweek" style={{ marginTop: 18 }}>
          <SectionH
            kicker="Топ идей"
            title="Что набирает голоса"
            more="Все рейтинги"
            onMore={() => navigate('/lists')}
          />
          <div className="topweek-grid">
            {topIdeas.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                variant="rank"
                rank={i + 1}
                onOpen={setDetailIdea}
                onVote={onVote}
              />
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div style={{ marginTop: 18 }}>
        {searchQ && (
          <div style={{ padding: '8px 0 12px', fontSize: 13, color: 'var(--muted)' }}>
            Поиск: «{searchQ}» · <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }} onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Очистить</button>
          </div>
        )}
        <div className="feed-head">
          <SectionH title="Свежие идеи" />
          <div className="feed-filters">
            <button
              className={`fchip ${filter === 'all' ? 'on' : ''}`}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            {CATS.map((c) => (
              <button
                key={c.k}
                className={`fchip ${filter === c.k ? 'on' : ''}`}
                onClick={() => setFilter(c.k)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="feed-list">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="card" style={{ padding: 18, display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div className="sk" style={{ width: 90, height: 22, marginBottom: 12 }} />
                  <div className="sk" style={{ width: '70%', height: 18, marginBottom: 10 }} />
                  <div className="sk" style={{ width: '95%', height: 13 }} />
                </div>
                <div className="sk" style={{ width: 52, height: 54 }} />
              </div>
            ))
          ) : feed.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-ic">
                  <Icon name="filter" size={30} />
                </div>
                <h3>Пока нет идей в этой категории</h3>
                <p>Может, ваша станет первой?</p>
                <button className="btn btn-soft" onClick={() => setFilter('all')}>
                  Показать все идеи
                </button>
              </div>
            </div>
          ) : (
            feed.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onOpen={setDetailIdea} onVote={onVote} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
