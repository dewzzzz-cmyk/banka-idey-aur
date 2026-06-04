export type IdeaStatus =
  | 'draft' | 'mod' | 'rework' | 'list' | 'expert'
  | 'work'  | 'done' | 'reject' | 'duplicate' | 'archive'

export type UserRole =
  | 'employee' | 'curator' | 'implementer' | 'committee'
  | 'admin'    | 'owner'   | 'knowledge_manager'

export type IdeaCategory = 'proc' | 'it' | 'prod' | 'save' | 'work' | 'cx'

export type RewardGrade = 'S' | 'M' | 'L'

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  draft:     'Черновик',
  mod:       'На модерации',
  rework:    'На доработке',
  list:      'В общем списке',
  expert:    'На экспертизе',
  work:      'Взято в работу',
  done:      'Реализовано',
  reject:    'Отклонено',
  duplicate: 'Дубликат',
  archive:   'В архиве',
}

export const CAT_LABELS: Record<IdeaCategory, string> = {
  proc: 'Процессы', it: 'IT', prod: 'Продукт',
  save: 'Экономия', work: 'Условия труда', cx: 'Клиентский опыт',
}

export const CAT_ICONS: Record<IdeaCategory, string> = {
  proc: 'flow', it: 'cpu', prod: 'box',
  save: 'piggy', work: 'smile', cx: 'heart',
}

export const MODERATED_STATUSES: IdeaStatus[] = ['list', 'expert', 'work', 'done']

export interface IdeaCardData {
  title: string
  problem: string
  who: string
  proposal: string
  resources: string
  effect: string
  effectEstimate: string
  openQuestions: string
}

export interface IdeaListItem {
  id: string
  status: IdeaStatus
  category: IdeaCategory
  cardData: IdeaCardData
  isConfidential: boolean
  isAnonymous: boolean
  authorId: string
  authorName: string
  authorDept: string
  votes: number
  votedByMe: boolean
  comments: number
  views: number
  createdAt: string
  assigneeName?: string
  dueDate?: string
  effectFact?: string
}

export interface User {
  id: string
  email: string
  name: string
  dept: string
  roles: UserRole[]
  createdAt: string
}

export interface Notification {
  id: string
  text: string
  icon: string
  createdAt: string
  isRead: boolean
  accent?: boolean
}

export interface AiCollectedFields {
  problem?: string
  who?: string
  proposal?: string
  resources?: string
  effect?: string
  effectEstimate?: string
}

export interface AiMessage {
  from: 'ai' | 'me'
  text: string
  kind?: 'filter' | 'rag'
  source?: string
}

export interface AiSession {
  id: string
  ideaId?: string
  collectedFields: AiCollectedFields
  messages: AiMessage[]
  currentStep: number
}
