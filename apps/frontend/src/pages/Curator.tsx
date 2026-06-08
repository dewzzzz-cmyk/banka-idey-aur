import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { CatChip } from '@/components/ui/CatChip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { AiScoreBadge } from '@/components/ui/AiScoreBadge'
import { AiEvalPanel } from '@/components/ui/AiEvalPanel'
import type { IdeaListItem, IdeaStatus } from '@portal/types'

type Modal = 'reject' | 'rework' | 'assign' | null

export default function Curator() {
  const utils = trpc.useUtils()
  const { data: modData, isLoading } = trpc.idea.list.useQuery({ status: 'mod', limit: 50 })
  const { data: expertData } = trpc.idea.list.useQuery({ status: 'expert', limit: 50 })
  const { data: usersData } = trpc.moderation.listUsers.useQuery({})

  const setStatus = trpc.moderation.setStatus.useMutation({
    onSuccess: () => {
      utils.idea.list.invalidate()
    },
  })
  const assignImpl = trpc.moderation.assignImplementer.useMutation({
    onSuccess: () => {
      utils.idea.list.invalidate()
    },
  })
  const addNote = trpc.moderation.addInternalNote.useMutation()

  const requestEval = trpc.ai.requestEvaluation.useMutation({
    onSuccess: () => {
      utils.idea.list.invalidate()
      if (sel) utils.idea.getById.invalidate({ id: sel.id })
    },
  })

  const queue: IdeaListItem[] = [
    ...(modData?.items ?? []),
    ...(expertData?.items ?? []),
  ]

  const [selId, setSelId] = useState<string | undefined>()
  const [modal, setModal] = useState<Modal>(null)
  const [reason, setReason] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [due, setDue] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [resolved, setResolved] = useState<Record<string, string>>({})

  const sel = selId ? queue.find((i) => i.id === selId) : queue[0]
  const selIdReal = sel?.id

  const act = async (ideaId: string, status: IdeaStatus, label: string, comment?: string) => {
    await setStatus.mutateAsync({ ideaId, status, comment })
    setResolved((r) => ({ ...r, [ideaId]: label }))
    setModal(null)
    setReason('')
  }

  const handleAssign = async () => {
    if (!selIdReal || !assigneeId || !due) return
    await act(selIdReal, 'work', 'Взято в работу')
    await assignImpl.mutateAsync({ ideaId: selIdReal, assigneeId, dueDate: due })
    setModal(null)
  }

  const handleSaveNote = async () => {
    if (!selIdReal || !internalNote.trim()) return
    await addNote.mutateAsync({ ideaId: selIdReal, body: internalNote })
    setInternalNote('')
  }

  const slaInfo = (idea: IdeaListItem) => {
    const createdAt = new Date(idea.createdAt)
    const hoursElapsed = (Date.now() - createdAt.getTime()) / 3600000
    const hoursLeft = 72 - hoursElapsed
    if (hoursLeft < 0) return { cls: 'overdue', label: 'Просрочено · эскалация', icon: 'alert' }
    if (hoursLeft <= 8) return { cls: 'risk', label: `${Math.round(hoursLeft)} ч до SLA`, icon: 'clock' }
    return { cls: 'ok', label: `${Math.round(hoursLeft)} ч до SLA`, icon: 'clock' }
  }

  const overdueCount = queue.filter((i) => {
    const h = (Date.now() - new Date(i.createdAt).getTime()) / 3600000
    return 72 - h <= 8
  }).length

  if (isLoading) {
    return (
      <div className="wrap fade">
        <div className="sk" style={{ width: '40%', height: 28, marginBottom: 20 }} />
        <div className="sk" style={{ width: '100%', height: 400 }} />
      </div>
    )
  }

  return (
    <div className="wrap fade">
      <div className="cur-head">
        <div>
          <div className="kicker" style={{ marginBottom: 5 }}>
            Модерация · очередь идей
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Очередь идей</h2>
        </div>
        <div className="cur-head-stats">
          <span className="cur-stat">
            <b>{queue.length}</b> на рассмотрении
          </span>
          {overdueCount > 0 && (
            <span className="cur-stat warn">
              <Icon name="clock" size={15} />
              <b>{overdueCount}</b> близко к SLA
            </span>
          )}
        </div>
      </div>

      <div className="cur-layout">
        {/* Queue */}
        <div className="cur-queue">
          {queue.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <Icon name="checkCircle" size={32} />
              <p style={{ marginTop: 8, color: 'var(--faint)' }}>Очередь пуста — отлично!</p>
            </div>
          ) : (
            queue.map((idea) => {
              const sla = slaInfo(idea)
              return (
                <button
                  key={idea.id}
                  className={`queue-item ${(selIdReal ?? queue[0]?.id) === idea.id ? 'sel' : ''} ${resolved[idea.id] ? 'resolved' : ''}`}
                  onClick={() => setSelId(idea.id)}
                >
                  <div className="queue-top">
                    <CatChip cat={idea.category} />
                    {idea.status === 'expert' && (
                      <span className="badge b-expert" style={{ padding: '3px 8px' }}>
                        <span className="bdot" />
                        Экспертиза
                      </span>
                    )}
                    {resolved[idea.id] && (
                      <span className="qresolved">
                        <Icon name="check" size={13} />
                        {resolved[idea.id]}
                      </span>
                    )}
                    <AiScoreBadge score={idea.aiEvaluation?.overall} />
                  </div>
                  <div className="queue-title">{idea.cardData.title || 'Без названия'}</div>
                  <div className="queue-foot">
                    <span className="author">
                      <Avatar name={idea.authorName} size="sm" />
                      <span className="faint">{idea.isAnonymous ? 'Аноним' : idea.authorName}</span>
                    </span>
                    <span className={`sla-chip ${sla.cls}`}>
                      <Icon name={sla.icon} size={12} />
                      {sla.label}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Detail */}
        {sel && (
          <div className="cur-detail">
            <div className="card cur-card">
              <div className="cur-card-head">
                <div>
                  <div className="cur-inline-meta">
                    <CatChip cat={sel.category} />
                    <StatusBadge status={sel.status} />
                  </div>
                  <h3 className="cur-card-title">{sel.cardData.title || 'Без названия'}</h3>
                  <div className="author" style={{ fontSize: 13 }}>
                    <Avatar name={sel.authorName} size="sm" />
                    <b>{sel.isAnonymous ? 'Аноним (псевдоним)' : sel.authorName}</b>
                    <span className="dot-sep">·</span>
                    <span className="faint">{sel.authorDept}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="chat" size={15} />
                  История диалога
                </button>
              </div>

              <div className="cur-fields">
                {[
                  ['alert', 'Проблема', sel.cardData.problem],
                  ['users', 'Кого касается', sel.cardData.who],
                  ['bulb', 'Предложение', sel.cardData.proposal],
                  ['cog', 'Ресурсы', sel.cardData.resources],
                  ['trend', 'Ожидаемый эффект', sel.cardData.effect],
                ].map(([ic, l, v]) =>
                  v ? (
                    <div key={l} className="cur-field">
                      <span className="cur-field-l">
                        <Icon name={ic as string} size={14} />
                        {l}
                      </span>
                      <p>{v}</p>
                    </div>
                  ) : null,
                )}
              </div>

              <AiEvalPanel
                evaluation={sel.aiEvaluation}
                isLoading={requestEval.isPending}
                onRefresh={() => requestEval.mutate({ ideaId: sel.id })}
              />

              <div className="cur-internal">
                <span className="cur-field-l">
                  <Icon name="lock" size={14} />
                  Внутренний комментарий (не виден автору)
                </span>
                <textarea
                  placeholder="Заметка для других кураторов…"
                  rows={2}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  onBlur={handleSaveNote}
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="cur-actions card">
              {resolved[sel.id] ? (
                <div className="resolved-note">
                  <Icon name="checkCircle" size={18} />
                  Решение принято: <b>{resolved[sel.id]}</b>
                  <button
                    className="btn btn-quiet btn-sm"
                    onClick={() => setResolved((r) => { const n = { ...r }; delete n[sel.id]; return n })}
                  >
                    Отменить
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => setModal('assign')}
                    disabled={setStatus.isPending}
                  >
                    <Icon name="checkCircle" size={18} />
                    Принять и взять в работу
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => act(sel.id, 'list', 'В общий список')}
                    disabled={setStatus.isPending}
                  >
                    <Icon name="list" size={17} />В общий список
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setModal('rework')}
                    disabled={setStatus.isPending}
                  >
                    <Icon name="rotate" size={17} />
                    На доработку
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setModal('reject')}
                    disabled={setStatus.isPending}
                  >
                    <Icon name="x" size={17} />
                    Отклонить
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject / Rework modal */}
      {(modal === 'reject' || modal === 'rework') && sel && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'reject' ? 'Отклонить идею' : 'Вернуть на доработку'}</h3>
            <p className="muted">
              Обоснование обязательно — автор увидит его и сможет{' '}
              {modal === 'reject' ? 'подать апелляцию' : 'доработать идею'}.
            </p>
            <textarea
              autoFocus
              rows={4}
              placeholder={
                modal === 'reject'
                  ? 'Почему идея отклонена…'
                  : 'Что нужно уточнить или дополнить…'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="modal-foot">
              <button className="btn btn-quiet" onClick={() => setModal(null)}>
                Отмена
              </button>
              <button
                className={`btn ${modal === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                disabled={!reason.trim() || setStatus.isPending}
                onClick={() =>
                  act(
                    sel.id,
                    modal === 'reject' ? 'reject' : 'rework',
                    modal === 'reject' ? 'Отклонено' : 'На доработке',
                    reason,
                  )
                }
              >
                {modal === 'reject' ? 'Отклонить' : 'Вернуть автору'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {modal === 'assign' && sel && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>Взять идею в работу</h3>
            <p className="muted">Назначьте реализатора и плановый срок внедрения.</p>
            <label className="modal-label">Реализатор</label>
            <div className="impl-pick">
              {(usersData ?? []).map((u) => (
                <button
                  key={u.id}
                  className={`impl-chip ${assigneeId === u.id ? 'on' : ''}`}
                  onClick={() => setAssigneeId(u.id)}
                >
                  <Avatar name={u.name} size="sm" />
                  {u.name}
                </button>
              ))}
            </div>
            <label className="modal-label">Плановый срок</label>
            <div className="date-field">
              <Icon name="calendar" size={16} />
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-quiet" onClick={() => setModal(null)}>
                Отмена
              </button>
              <button
                className="btn btn-primary"
                disabled={!due.trim() || !assigneeId || assignImpl.isPending}
                onClick={handleAssign}
              >
                <Icon name="check" size={17} />
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
