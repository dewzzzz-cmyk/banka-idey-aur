import { useNavigate } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { Avatar } from '@/components/ui/Avatar'
import { SectionH } from '@/components/ui/SectionH'
import { CatChip } from '@/components/ui/CatChip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import type { IdeaStatus } from '@portal/types'

const FUNNEL_STAGES: { k: IdeaStatus; label: string; cls: string }[] = [
  { k: 'draft', label: 'Черновики', cls: 'b-draft' },
  { k: 'mod', label: 'На модерации', cls: 'b-mod' },
  { k: 'list', label: 'В общем списке', cls: 'b-list' },
  { k: 'work', label: 'Взято в работу', cls: 'b-work' },
  { k: 'done', label: 'Реализовано', cls: 'b-done' },
]

const BADGES = [
  { type: 'first_idea', emoji: '💡', label: 'Первая идея', desc: 'Подана первая идея' },
  { type: 'idea_realized', emoji: '🏆', label: 'Реализована', desc: 'Идея дошла до внедрения' },
  { type: 'top_week', emoji: '🔥', label: 'Топ недели', desc: 'Идея вошла в топ по голосам' },
]

export default function Cabinet() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setDetailIdea } = useUIStore()

  const { data: myIdeasData, isLoading } = trpc.idea.list.useQuery({ mine: true, limit: 100 })
  const { data: pointsData } = trpc.idea.getMyPoints.useQuery()

  const myIdeas = myIdeasData?.items ?? []
  const totalPoints = pointsData?.total ?? 0

  // Compute status counts from myIdeas data locally
  const statusCounts = (myIdeas ?? []).reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {})

  // Funnel using statusCounts
  const funnelData = FUNNEL_STAGES.map((s) => ({
    ...s,
    n: statusCounts[s.k] ?? 0,
  }))

  const totalIdeas = myIdeas.length
  const doneCount = statusCounts['done'] ?? 0

  const maxN = Math.max(...funnelData.map((s) => s.n), 1)

  return (
    <div className="wrap fade">
      {/* Profile header */}
      <div className="profile card">
        {user && <Avatar name={user.name} size="lg" />}
        <div className="profile-info">
          <h2>{user?.name ?? '—'}</h2>
          <p>{user?.dept ?? ''}</p>
        </div>
        <div className="profile-points">
          <div className="pp-coins">
            <Icon name="coins" size={22} />
          </div>
          <div>
            <div className="pp-n">{totalPoints}</div>
            <div className="pp-l">баллов</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/chat')}>
          <Icon name="plus" size={18} />
          Новая идея
        </button>
      </div>

      <div className="cab-grid">
        <main>
          {/* Funnel */}
          <div className="card cab-card">
            <SectionH title="Мои идеи по статусам" />
            <div className="funnel">
              {funnelData.map((s) => (
                <div key={s.k} className="funnel-col">
                  <div
                    className={`funnel-bar ${s.cls}`}
                    style={{ height: 40 + (s.n / maxN) * 104 }}
                  >
                    <span className="funnel-n">{s.n}</span>
                  </div>
                  <span className="funnel-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ideas list */}
          <div className="card cab-card">
            <SectionH title="Список моих идей" />
            <div className="mylist">
              {isLoading ? (
                [0, 1, 2].map((i) => (
                  <div key={i} className="myrow">
                    <div className="sk" style={{ width: 80, height: 22 }} />
                    <div className="sk" style={{ flex: 1, height: 16, margin: '0 12px' }} />
                    <div className="sk" style={{ width: 80, height: 22 }} />
                  </div>
                ))
              ) : myIdeas.length === 0 ? (
                <div className="empty">
                  <div className="empty-ic" style={{ maxWidth: 64, height: 64, opacity: 0.3 }}>
                    <Icon name="bulb" size={30} />
                  </div>
                  <h3>Идей пока нет</h3>
                  <p>Поделитесь первой идеей — это просто!</p>
                  <button className="btn btn-primary" onClick={() => navigate('/chat')}>
                    Предложить идею
                  </button>
                </div>
              ) : (
                myIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="myrow"
                    onClick={() => setDetailIdea(idea)}
                    style={{ cursor: 'pointer' }}
                  >
                    <CatChip cat={idea.category} />
                    <span className="myrow-t">{idea.cardData.title || 'Без названия'}</span>
                    <StatusBadge status={idea.status} />
                    <span className="myrow-v">
                      <Icon name="arrowUp" size={14} />
                      {idea.votes}
                    </span>
                    <Icon name="chevRight" size={16} style={{ color: 'var(--faint)' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        <aside className="cab-aside">
          {/* Badges */}
          <div className="card cab-card">
            <SectionH title="Бейджи признания" />
            <div className="badges-grid">
              {BADGES.map((b) => (
                <div key={b.type} className="badge-tile got">
                  <div className="badge-tile-ic">{b.emoji}</div>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card cab-card">
            <SectionH title="Статистика" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span className="faint">Всего идей</span>
                <b>{totalIdeas}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span className="faint">Реализовано</span>
                <b style={{ color: 'var(--st-done-t)' }}>{doneCount}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span className="faint">Всего голосов</span>
                <b>{myIdeas.reduce((acc, i) => acc + i.votes, 0)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span className="faint">Баллов</span>
                <b style={{ color: 'var(--accent)' }}>{totalPoints}</b>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
