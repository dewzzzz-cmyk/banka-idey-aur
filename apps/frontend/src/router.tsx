import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import { useAuthStore } from './stores/auth'
import { API_BASE } from './lib/api'

const Home      = lazy(() => import('./pages/Home'))
const Chat      = lazy(() => import('./pages/Chat'))
const Card      = lazy(() => import('./pages/Card'))
const Lists     = lazy(() => import('./pages/Lists'))
const Cabinet   = lazy(() => import('./pages/Cabinet'))
const Curator   = lazy(() => import('./pages/Curator'))
const Impl      = lazy(() => import('./pages/Impl'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Admin     = lazy(() => import('./pages/Admin'))
const Guide     = lazy(() => import('./pages/Guide'))

const Fallback = () => (
  <div className="wrap fade">
    <div className="sk" style={{ height: 200, borderRadius: 12 }} />
  </div>
)

function ProtectedRoute() {
  const { user, setUser } = useAuthStore()
  const [checking, setChecking] = useState(!user)

  useEffect(() => {
    if (!user) {
      fetch(API_BASE + '/api/auth/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) setUser(data.user)
        })
        .catch(() => {})
        .finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [])

  if (checking) return <Fallback />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

const S = ({ C }: { C: React.LazyExoticComponent<() => React.JSX.Element> }) => (
  <Suspense fallback={<Fallback />}><C /></Suspense>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { path: '/',           element: <S C={Home} /> },
        { path: '/chat',       element: <S C={Chat} /> },
        { path: '/card/:id?',  element: <S C={Card} /> },
        { path: '/lists',      element: <S C={Lists} /> },
        { path: '/cabinet',    element: <S C={Cabinet} /> },
        { path: '/curator',    element: <S C={Curator} /> },
        { path: '/impl',       element: <S C={Impl} /> },
        { path: '/analytics',  element: <S C={Analytics} /> },
        { path: '/admin',      element: <S C={Admin} /> },
        { path: '/guide',      element: <S C={Guide} /> },
        { path: '*',           element: <Navigate to="/" replace /> },
      ],
    }],
  },
])
