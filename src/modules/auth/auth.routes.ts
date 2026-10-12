import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware } from '../../middlewares/auth'
import { loginLimiter } from '../../middlewares/rate-limit'
import * as authController from './auth.controller'

const router = Router()

router.post('/login', loginLimiter, tenantMiddleware, authController.login)
router.get('/me', tenantMiddleware, authMiddleware, authController.me)

export default router
