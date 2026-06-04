import type { FC } from 'react'

const AV_COLORS = ['#2F62E6','#6E54D6','#0E8F84','#23925C','#C4801E','#D1567F','#3D7DD6','#8158E0']

function avColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]!
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return ((p[0] ?? '')[0] ?? '') + ((p[1] ?? '')[0] ?? '')
}

interface Props { name: string; size?: 'sm' | 'md' | 'lg'; anon?: boolean }

export const Avatar: FC<Props> = ({ name, size = 'md', anon }) => {
  if (anon) {
    return <span className={`av av-${size}`} style={{ background: '#C2CAD8', color: '#fff', fontSize: 12 }}>?</span>
  }
  return (
    <span className={`av av-${size}`} style={{ background: avColor(name) }}>
      {initials(name)}
    </span>
  )
}
