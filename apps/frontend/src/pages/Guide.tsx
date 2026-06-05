import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

const STEPS = [
  {
    num: '01',
    icon: 'chat',
    title: 'Расскажите идею',
    desc: 'Напишите в чат с ИИ-ассистентом. Он задаст уточняющие вопросы и оформит карточку.',
    accent: '#6366f1',
  },
  {
    num: '02',
    icon: 'shield',
    title: 'Куратор рассматривает',
    desc: 'Куратор проверяет идею на соответствие критериям и назначает экспертов.',
    accent: '#f59e0b',
  },
  {
    num: '03',
    icon: 'users',
    title: 'Экспертиза и голосование',
    desc: 'Эксперты оценивают, коллеги голосуют. Топ-идеи рассматриваются первыми.',
    accent: '#10b981',
  },
  {
    num: '04',
    icon: 'rocket',
    title: 'Реализация и награда',
    desc: 'Принятая идея берётся в работу. Автор получает баллы и, возможно, вознаграждение.',
    accent: '#ec4899',
  },
]

const STATUSES = [
  { key: 'draft',     label: 'Черновик',        cls: 'b-draft' },
  { key: 'mod',       label: 'На модерации',     cls: 'b-mod' },
  { key: 'rework',    label: 'На доработке',     cls: 'b-rework' },
  { key: 'list',      label: 'В общем списке',   cls: 'b-list' },
  { key: 'expert',    label: 'На экспертизе',    cls: 'b-expert' },
  { key: 'work',      label: 'Взято в работу',   cls: 'b-work' },
  { key: 'done',      label: 'Реализовано',      cls: 'b-done' },
]

const SIDE_STATUSES = [
  { key: 'reject',    label: 'Отклонено',   cls: 'b-reject' },
  { key: 'duplicate', label: 'Дубликат',    cls: 'b-duplicate' },
  { key: 'archive',   label: 'В архиве',    cls: 'b-archive' },
]

const POINTS = [
  { icon: 'bulb',       label: 'Подача идеи',                 pts: '+10',  color: 'var(--muted)' },
  { icon: 'check',      label: 'Идея прошла модерацию',       pts: '+20',  color: '#6366f1' },
  { icon: 'rocket',     label: 'Идея взята в работу',         pts: '+50',  color: '#10b981' },
  { icon: 'trophy',     label: 'Идея реализована',            pts: '+100 + вознаграждение', color: '#f59e0b' },
]

const TIPS = [
  { emoji: '💬', title: 'Говорите своими словами', desc: 'ИИ разберётся — не нужно использовать официальный язык или шаблоны. Просто расскажите, что вас беспокоит или что хотите улучшить.' },
  { emoji: '🔒', title: 'Можно подать анонимно', desc: 'Если тема деликатная — выберите анонимный или конфиденциальный режим при оформлении. Куратор увидит только суть идеи.' },
  { emoji: '👀', title: 'Следите за статусом', desc: 'В разделе «Мои идеи» всегда видно, на каком этапе находится ваша идея и что нужно сделать дальше.' },
]

export default function Guide() {
  const navigate = useNavigate()

  return (
    <div className="wrap fade">

      {/* Hero */}
      <div className="cta-hero" style={{ padding: '40px 40px 32px', marginBottom: 24 }}>
        <div className="cta-glow" />
        <div className="cta-content">
          <div className="cta-kicker">
            <Icon name="book" size={15} />
            Руководство пользователя
          </div>
          <h1 className="cta-title" style={{ fontSize: 30, marginBottom: 10 }}>
            Как работает Банка Идей
          </h1>
          <p className="cta-sub" style={{ maxWidth: 540, marginBottom: 0 }}>
            От мысли в голове — до реализованного изменения. Здесь описаны все шаги и правила работы портала.
          </p>
        </div>
      </div>

      {/* 4-step process */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            Процесс
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Путь идеи — 4 шага</h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {STEPS.map((step) => (
            <div
              key={step.num}
              style={{
                position: 'relative',
                padding: '24px 20px 20px',
                borderRadius: 12,
                background: 'var(--bg-2)',
                border: '1px solid var(--border, rgba(0,0,0,0.07))',
                overflow: 'hidden',
              }}
            >
              {/* Big step number background */}
              <div style={{
                position: 'absolute',
                top: -10,
                right: 10,
                fontSize: 72,
                fontWeight: 900,
                color: step.accent,
                opacity: 0.08,
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none',
              }}>
                {step.num}
              </div>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: step.accent + '18',
                color: step.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}>
                <Icon name={step.icon} size={20} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: step.accent, marginBottom: 4, textTransform: 'uppercase' }}>
                Шаг {step.num}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status lifecycle */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            Статусы
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Жизненный цикл идеи</h2>
        </div>

        {/* Main lifecycle flow */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Основной путь:</div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
          }}>
            {STATUSES.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge ${s.cls}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                  {s.label}
                </span>
                {i < STATUSES.length - 1 && (
                  <Icon name="arrowRight" size={14} style={{ color: 'var(--faint)' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Side statuses */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Также возможные статусы:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SIDE_STATUSES.map((s) => (
              <span key={s.key} className={`badge ${s.cls}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Points & rewards */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            Мотивация
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Баллы и вознаграждения</h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {POINTS.map((p) => (
            <div
              key={p.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-2)',
                border: '1px solid var(--border, rgba(0,0,0,0.07))',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: p.color + '18',
                color: p.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={p.icon} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 2, lineHeight: 1.3 }}>{p.label}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: p.color }}>{p.pts}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'var(--bg-2)',
          fontSize: 13,
          color: 'var(--muted)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <Icon name="alert" size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <span>
            Баллы накапливаются в личном кабинете. Вознаграждение за реализованные идеи назначается решением комитета и может выплачиваться в форме бонуса или подарочного сертификата.
          </span>
        </div>
      </div>

      {/* Tips */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            Советы
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Как подать хорошую идею</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TIPS.map((tip) => (
            <div
              key={tip.title}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                padding: '16px 18px',
                borderRadius: 12,
                background: 'var(--bg-2)',
                border: '1px solid var(--border, rgba(0,0,0,0.07))',
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{tip.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{tip.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        textAlign: 'center',
        padding: '32px 20px 40px',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Готовы попробовать?</div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
          ИИ-помощник поможет оформить даже самую сырую мысль в структурированную карточку за несколько минут.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/chat')}
          style={{ fontSize: 16, padding: '14px 32px' }}
        >
          <Icon name="bulb" size={20} />
          Предложить идею
        </button>
      </div>

    </div>
  )
}
