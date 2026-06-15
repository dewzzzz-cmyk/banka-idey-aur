import { useState } from 'react'
import type { FC } from 'react'
import { useUIStore } from '@/stores/ui'
import { trpc } from '@/lib/trpc'
import { CatChip } from './CatChip'
import { StatusBadge } from './StatusBadge'

interface CommentsSectionProps {
  ideaId: string
}

const CommentsSection: FC<CommentsSectionProps> = ({ ideaId }) => {
  const [val, setVal] = useState('')
  const utils = trpc.useUtils()

  const { data: comments = [] } = trpc.comment.list.useQuery(
    { ideaId, includeInternal: false },
    { enabled: !!ideaId }
  )

  const addMutation = trpc.comment.add.useMutation({
    onSuccess: () => {
      setVal('')
      utils.comment.list.invalidate()
    },
  })

  const handleSend = () => {
    if (!val.trim()) return
    addMutation.mutate({ ideaId, body: val.trim() })
  }

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
        Обсуждение · {comments.length}
      </div>

      {comments.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 16 }}>
          Пока нет комментариев — будьте первым.
        </div>
      )}

      {comments.map((c, i) => (
        <div key={c.id ?? i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
            {c.author?.name ?? '?'}
            <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>
              · {new Date(c.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>{c.body}</div>
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        <textarea
          placeholder="Написать комментарий…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            resize: 'vertical',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13.5,
            color: 'var(--ink)',
            background: 'var(--surface)',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!val.trim() || addMutation.isPending}
          style={{
            alignSelf: 'flex-end',
            padding: '6px 18px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: val.trim() && !addMutation.isPending ? 'pointer' : 'not-allowed',
            fontSize: 13.5,
            opacity: val.trim() && !addMutation.isPending ? 1 : 0.55,
          }}
        >
          Отправить
        </button>
      </div>
    </div>
  )
}

export function IdeaDrawer() {
  const { detailIdea, setDetailIdea } = useUIStore()

  if (!detailIdea) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setDetailIdea(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 'min(520px, 95vw)',
        background: 'var(--surface)',
        zIndex: 201,
        overflowY: 'auto',
        padding: 24,
        boxShadow: '-2px 0 24px rgba(0,0,0,0.12)',
      }}>
        {/* Close button — 44×44px touch target */}
        <button
          onClick={() => setDetailIdea(null)}
          style={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, borderRadius: 8 }}
          aria-label="Закрыть"
        >
          ✕
        </button>

        {/* Status + category row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, marginTop: 4 }}>
          <StatusBadge status={detailIdea.status} />
          <CatChip cat={detailIdea.category} />
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 4px', fontSize: 20, lineHeight: 1.25 }}>
          {detailIdea.cardData.title || 'Без названия'}
        </h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          {detailIdea.authorName} · {detailIdea.authorDept} · {new Date(detailIdea.createdAt).toLocaleDateString('ru-RU')}
        </div>

        {/* Fields */}
        {[
          { label: 'Проблема', value: detailIdea.cardData.problem },
          { label: 'Предложение', value: detailIdea.cardData.proposal },
          { label: 'Кого касается', value: detailIdea.cardData.who },
          { label: 'Ресурсы', value: detailIdea.cardData.resources },
          { label: 'Ожидаемый эффект', value: detailIdea.cardData.effect },
        ].filter(f => f.value).map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>
              {f.label}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{f.value}</div>
          </div>
        ))}

        {/* Comments section */}
        <CommentsSection ideaId={detailIdea.id} />
      </div>
    </>
  )
}
