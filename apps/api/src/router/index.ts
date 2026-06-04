import { router } from '../trpc.js'
import { ideaRouter } from './idea.js'
import { commentRouter } from './comment.js'
import { moderationRouter } from './moderation.js'
import { implementationRouter } from './implementation.js'
import { rewardRouter } from './reward.js'
import { aiRouter } from './ai.js'
import { analyticsRouter } from './analytics.js'
import { adminRouter } from './admin.js'
import { notificationRouter } from './notification.js'

export const appRouter = router({
  idea: ideaRouter,
  comment: commentRouter,
  moderation: moderationRouter,
  implementation: implementationRouter,
  reward: rewardRouter,
  ai: aiRouter,
  analytics: analyticsRouter,
  admin: adminRouter,
  notification: notificationRouter,
})

export type AppRouter = typeof appRouter
