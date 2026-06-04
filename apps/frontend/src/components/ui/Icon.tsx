import type { FC, SVGProps } from 'react'

type SProps = {
  d?: string; children?: React.ReactNode; fill?: string; vb?: number; sw?: number
  // forwarded by Icon:
  width?: number; height?: number; className?: string; style?: React.CSSProperties
}
type PProps = SVGProps<SVGPathElement>
type CProps = SVGProps<SVGCircleElement>
type LProps = SVGProps<SVGLineElement>
type RProps = SVGProps<SVGRectElement>

const S: FC<SProps> = ({ d, children, fill, vb = 24, sw = 1.8, width, height, className, style }) => (
  <svg
    viewBox={`0 0 ${vb} ${vb}`}
    fill={fill || 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={width}
    height={height}
    className={className}
    style={style}
  >
    {d ? <path d={d} /> : children}
  </svg>
)

const P: FC<PProps> = (props) => <path {...props} />
const C: FC<CProps> = (props) => <circle {...props} />
const L: FC<LProps> = (props) => <line {...props} />
const R: FC<RProps> = (props) => <rect {...props} />

const ICONS: Record<string, () => React.ReactElement> = {
  bulb: () => <S><P key={1} d="M9 18h6" /><P key={2} d="M10 22h4" /><P key={3} d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" /></S>,
  home: () => <S><P key={1} d="M3 10.5 12 3l9 7.5" /><P key={2} d="M5 9.5V21h14V9.5" /></S>,
  chat: () => <S d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />,
  list: () => <S><L key={1} x1={8} y1={6} x2={21} y2={6} /><L key={2} x1={8} y1={12} x2={21} y2={12} /><L key={3} x1={8} y1={18} x2={21} y2={18} /><L key={4} x1={3} y1={6} x2={3.5} y2={6} /><L key={5} x1={3} y1={12} x2={3.5} y2={12} /><L key={6} x1={3} y1={18} x2={3.5} y2={18} /></S>,
  user: () => <S><P key={1} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><C key={2} cx={12} cy={7} r={4} /></S>,
  shield: () => <S><P key={1} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><P key={2} d="m9 12 2 2 4-4" /></S>,
  trophy: () => <S><P key={1} d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><P key={2} d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><P key={3} d="M4 22h16" /><P key={4} d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><P key={5} d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><P key={6} d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></S>,
  fire: () => <S d="M12 2c1 3-1.5 4.5-1.5 7 0 1.5 1 2.5 1.5 3 .5-.5 1-1 1-2 1.5 1 3 3 3 5.5a6 6 0 1 1-12 0c0-2 1-4 2.5-5.5C7.5 14 8 16 9 16.5 8 14 9 11 12 2Z" />,
  plus: () => <S><L key={1} x1={12} y1={5} x2={12} y2={19} /><L key={2} x1={5} y1={12} x2={19} y2={12} /></S>,
  arrowUp: () => <S><P key={1} d="M12 19V5" /><P key={2} d="m5 12 7-7 7 7" /></S>,
  arrowRight: () => <S><L key={1} x1={5} y1={12} x2={19} y2={12} /><P key={2} d="m12 5 7 7-7 7" /></S>,
  send: () => <S><P key={1} d="M22 2 11 13" /><P key={2} d="M22 2 15 22l-4-9-9-4 20-7Z" /></S>,
  check: () => <S d="M20 6 9 17l-5-5" />,
  checkCircle: () => <S><P key={1} d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><P key={2} d="m9 11 3 3L22 4" /></S>,
  x: () => <S><L key={1} x1={18} y1={6} x2={6} y2={18} /><L key={2} x1={6} y1={6} x2={18} y2={18} /></S>,
  edit: () => <S><P key={1} d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></S>,
  rotate: () => <S><P key={1} d="M3 12a9 9 0 1 0 3-6.7L3 8" /><P key={2} d="M3 3v5h5" /></S>,
  bell: () => <S><P key={1} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><P key={2} d="M13.7 21a2 2 0 0 1-3.4 0" /></S>,
  search: () => <S><C key={1} cx={11} cy={11} r={8} /><P key={2} d="m21 21-4.3-4.3" /></S>,
  clock: () => <S><C key={1} cx={12} cy={12} r={9} /><P key={2} d="M12 7v5l3 2" /></S>,
  calendar: () => <S><R key={1} x={3} y={4.5} width={18} height={17} rx={2} /><L key={2} x1={3} y1={9.5} x2={21} y2={9.5} /><L key={3} x1={8} y1={2.5} x2={8} y2={6} /><L key={4} x1={16} y1={2.5} x2={16} y2={6} /></S>,
  users: () => <S><P key={1} d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><C key={2} cx={9.5} cy={7} r={4} /><P key={3} d="M22 21v-2a4 4 0 0 0-3-3.87" /><P key={4} d="M16 3.13a4 4 0 0 1 0 7.75" /></S>,
  target: () => <S><C key={1} cx={12} cy={12} r={9} /><C key={2} cx={12} cy={12} r={5} /><C key={3} cx={12} cy={12} r={1} /></S>,
  spark: () => <S><P key={1} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></S>,
  gift: () => <S><R key={1} x={3} y={8} width={18} height={4} rx={1} /><P key={2} d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><P key={3} d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" /></S>,
  coins: () => <S><C key={1} cx={8} cy={8} r={5} /><P key={2} d="M18.09 10.37A5 5 0 1 1 15.6 16.9M7 6h1v4M16.71 13.88l.7.71-2.82 2.82" /></S>,
  medal: () => <S><P key={1} d="M7.21 4 8.5 9.5M16.79 4 15.5 9.5" /><C key={2} cx={12} cy={15} r={6} /><P key={3} d="m12 13 .7 1.5 1.6.2-1.2 1.1.3 1.6L12 16.7l-1.4.7.3-1.6-1.2-1.1 1.6-.2L12 13Z" /></S>,
  cog: () => <S><C key={1} cx={12} cy={12} r={3} /><P key={2} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.81 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.61.78 1 1.42 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></S>,
  cpu: () => <S><R key={1} x={5} y={5} width={14} height={14} rx={2} /><R key={2} x={9} y={9} width={6} height={6} rx={1} /><P key={3} d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></S>,
  flow: () => <S><R key={1} x={3} y={3} width={7} height={7} rx={1.5} /><R key={2} x={14} y={14} width={7} height={7} rx={1.5} /><P key={3} d="M10 6.5h4a3 3 0 0 1 3 3V14" /></S>,
  box: () => <S><P key={1} d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><P key={2} d="m3 8 9 5 9-5M12 13v8" /></S>,
  piggy: () => <S><P key={1} d="M19 9c0-1-1-2-3-2H9C6 7 4 9.5 4 12.5S6 18 9 18h.5l1 2.5h2L13 18h2l.5 1.5h2V16c1-.7 1.5-1.5 1.5-3" /><C key={2} cx={15.5} cy={11.5} r={0.6} fill="currentColor" /><P key={3} d="M9 7c0-1.5 1-2.5 2.5-2.5" /></S>,
  heart: () => <S d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.4l8.8-8.7a5 5 0 0 0 0-7.1Z" />,
  smile: () => <S><C key={1} cx={12} cy={12} r={9} /><P key={2} d="M8 14s1.5 2 4 2 4-2 4-2" /><L key={3} x1={9} y1={9} x2={9.01} y2={9} /><L key={4} x1={15} y1={9} x2={15.01} y2={9} /></S>,
  paperclip: () => <S d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49" />,
  chevDown: () => <S d="m6 9 6 6 6-6" />,
  chevRight: () => <S d="m9 6 6 6-6 6" />,
  dots: () => <S><C key={1} cx={12} cy={5} r={1.4} fill="currentColor" /><C key={2} cx={12} cy={12} r={1.4} fill="currentColor" /><C key={3} cx={12} cy={19} r={1.4} fill="currentColor" /></S>,
  comment: () => <S d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
  eye: () => <S><P key={1} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><C key={2} cx={12} cy={12} r={3} /></S>,
  lock: () => <S><R key={1} x={4} y={11} width={16} height={9} rx={2} /><P key={2} d="M8 11V7a4 4 0 0 1 8 0v4" /></S>,
  alert: () => <S><P key={1} d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><L key={2} x1={12} y1={9} x2={12} y2={13} /><L key={3} x1={12} y1={17} x2={12.01} y2={17} /></S>,
  wifiOff: () => <S><L key={1} x1={2} y1={2} x2={22} y2={22} /><P key={2} d="M8.5 16.5a5 5 0 0 1 7 0M5 12.86a10 10 0 0 1 5.17-2.7M19 12.86a10 10 0 0 0-2.4-1.74M2 8.82a15 15 0 0 1 4.17-2.65M22 8.82a15 15 0 0 0-7.95-3.6" /><L key={3} x1={12} y1={20} x2={12.01} y2={20} /></S>,
  filter: () => <S d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />,
  trend: () => <S><P key={1} d="m3 17 6-6 4 4 8-8" /><P key={2} d="M17 7h4v4" /></S>,
  sparkles: () => <S><P key={1} d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><P key={2} d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /></S>,
  flag: () => <S><P key={1} d="M4 21V4M4 4s1.5-1 4-1 4 2 7 2 4-1 4-1v9s-1.5 1-4 1-4-2-7-2-4 1-4 1" /></S>,
  inbox: () => <S><P key={1} d="M22 12h-6l-2 3h-4l-2-3H2" /><P key={2} d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></S>,
  logout: () => <S><P key={1} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><P key={2} d="m16 17 5-5-5-5M21 12H9" /></S>,
  download: () => <S><P key={1} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><P key={2} d="M7 10l5 5 5-5M12 15V3" /></S>,
  bars: () => <S><L key={1} x1={12} y1={20} x2={12} y2={10} /><L key={2} x1={18} y1={20} x2={18} y2={4} /><L key={3} x1={6} y1={20} x2={6} y2={16} /></S>,
  pie: () => <S><P key={1} d="M21.21 15.89A10 10 0 1 1 8 2.83" /><P key={2} d="M22 12A10 10 0 0 0 12 2v10z" /></S>,
  sliders: () => <S><L key={1} x1={4} y1={21} x2={4} y2={14} /><L key={2} x1={4} y1={10} x2={4} y2={3} /><L key={3} x1={12} y1={21} x2={12} y2={12} /><L key={4} x1={12} y1={8} x2={12} y2={3} /><L key={5} x1={20} y1={21} x2={20} y2={16} /><L key={6} x1={20} y1={12} x2={20} y2={3} /><L key={7} x1={1} y1={14} x2={7} y2={14} /><L key={8} x1={9} y1={8} x2={15} y2={8} /><L key={9} x1={17} y1={16} x2={23} y2={16} /></S>,
  book: () => <S><P key={1} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><P key={2} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></S>,
  history: () => <S><P key={1} d="M3 12a9 9 0 1 0 3-6.7L3 8" /><P key={2} d="M3 3v5h5M12 7v5l3 2" /></S>,
  grid: () => <S><R key={1} x={3} y={3} width={7} height={7} rx={1.5} /><R key={2} x={14} y={3} width={7} height={7} rx={1.5} /><R key={3} x={3} y={14} width={7} height={7} rx={1.5} /><R key={4} x={14} y={14} width={7} height={7} rx={1.5} /></S>,
  rocket: () => <S><P key={1} d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><P key={2} d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><P key={3} d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></S>,
  award: () => <S><C key={1} cx={12} cy={8} r={6} /><P key={2} d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" /></S>,
}

interface IconProps {
  name: string
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

export const Icon: FC<IconProps> = ({ name, size = 20, strokeWidth, className, style }) => {
  const factory = ICONS[name]
  if (!factory) return null
  const el = factory()
  return (
    <el.type
      {...el.props}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', ...(strokeWidth ? { strokeWidth } : {}), ...style }}
    />
  )
}

export const ICON_NAMES = Object.keys(ICONS)
