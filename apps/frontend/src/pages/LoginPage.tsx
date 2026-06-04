import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('anna@can.ru')
  const [password, setPassword] = useState('test123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!res.ok) { setError('Неверный email или пароль'); return }
      const { user: u } = await res.json()
      setUser(u)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg, #f5f5f8)' }}>
      <div className="card" style={{ width: 360, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="var(--accent, #2F62E6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <rect x="6" y="5" width="12" height="14" rx="1"/>
            <ellipse cx="12" cy="5" rx="6" ry="2"/>
            <ellipse cx="12" cy="19" rx="6" ry="2"/>
            <path d="M11 3.5 C11.5 2.8 12.5 2.8 13 3.5"/>
            <line x1="7" y1="9" x2="17" y2="9"/>
            <line x1="7" y1="15" x2="17" y2="15"/>
          </svg>
          <h2 style={{ margin: '0 0 4px' }}>Банка Идей</h2>
          <p className="faint" style={{ fontSize: 13, margin: 0 }}>Открой идею · can.ru</p>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label className="faint" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Email</label>
            <input
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', fontSize: 14, background: 'var(--bg)', color: 'var(--ink-1)' }}
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label className="faint" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Пароль</label>
            <input
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', fontSize: 14, background: 'var(--bg)', color: 'var(--ink-1)' }}
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
            />
          </div>
          {error && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p className="faint" style={{ fontSize: 11, marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
          Тестовые аккаунты: anna / curator / impl / admin / owner @can.ru<br />пароль: test123
        </p>
      </div>
    </div>
  )
}
