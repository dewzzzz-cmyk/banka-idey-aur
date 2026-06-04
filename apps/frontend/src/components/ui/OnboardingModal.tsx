import { useState, useEffect } from 'react'

const STEPS = [
  {
    emoji: '💡',
    title: 'Предложите идею',
    text: 'Нажмите «Подать идею» и расскажите своими словами. ИИ-помощник задаст пару вопросов и оформит структурированную карточку.',
  },
  {
    emoji: '👍',
    title: 'Коллеги поддержат',
    text: 'Ваша идея попадает в общий список. Голосуйте за лучшие предложения — топ идей влияет на очерёдность рассмотрения.',
  },
  {
    emoji: '🏆',
    title: 'Получайте награды',
    text: 'Следите за статусом в личном кабинете. Баллы начисляются на каждом этапе — от публикации до реализации.',
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('aur_onboarding')) {
      const t = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const close = () => {
    localStorage.setItem('aur_onboarding', '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, padding: 32, position: 'relative' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>Добро пожаловать!</h2>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
            Банка Идей · Открой идею
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--bg-2)',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-block" onClick={close} style={{ fontSize: 15, marginBottom: 10 }}>
          Начать работу →
        </button>
        <button
          onClick={close}
          style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, cursor: 'pointer' }}
        >
          Пропустить
        </button>
      </div>
    </div>
  )
}
