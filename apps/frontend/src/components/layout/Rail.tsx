import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'
import { useAuthStore } from '@/stores/auth'

const NAV = [
  { to: '/',        label: 'Главная',      icon: 'home' },
  { to: '/chat',    label: 'Подать идею',  icon: 'bulb' },
  { to: '/lists',   label: 'Рейтинги',     icon: 'fire',   count: '24' },
  { to: '/cabinet', label: 'Мои идеи',     icon: 'user' },
]

const NAV_CUR = [
  { to: '/curator', label: 'Модерация',  icon: 'shield', count: '5' },
  { to: '/impl',    label: 'Реализация', icon: 'rocket', count: '2' },
]

const NAV_ADMIN = [
  { to: '/analytics', label: 'Аналитика',           icon: 'bars' },
  { to: '/admin',     label: 'Администрирование',    icon: 'cog' },
]

export function Rail() {
  const { user, logout } = useAuthStore()

  return (
    <nav className="rail">
      <div className="brand">
        <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="5" width="12" height="14" rx="1"/>
          <ellipse cx="12" cy="5" rx="6" ry="2"/>
          <ellipse cx="12" cy="19" rx="6" ry="2"/>
          <path d="M11 3.5 C11.5 2.8 12.5 2.8 13 3.5"/>
          <line x1="7" y1="9" x2="17" y2="9"/>
          <line x1="7" y1="15" x2="17" y2="15"/>
        </svg>
        <div className="name">
          Банка Идей
          <small>Открой идею</small>
        </div>
      </div>

      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon name={n.icon} size={19} />
          {n.label}
          {n.count && <span className="count">{n.count}</span>}
        </NavLink>
      ))}

      <div className="nav-group-label">Кураторам</div>
      {NAV_CUR.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon name={n.icon} size={19} />
          {n.label}
          {n.count && <span className="count">{n.count}</span>}
        </NavLink>
      ))}

      <div className="nav-group-label">Управление</div>
      {NAV_ADMIN.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon name={n.icon} size={19} />
          {n.label}
        </NavLink>
      ))}

      <div className="co">
        <div className="colog" style={{ background: 'var(--accent)', borderRadius: 8, width: 30, height: 30, display: 'grid', placeItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '-0.02em' }}>АУР</span>
        </div>
        <div className="cotxt">
          <b style={{ color: 'var(--ink-2)' }}>АУР</b>
          <br />Открой идею · can.ru
        </div>
      </div>
    </nav>
  )
}
