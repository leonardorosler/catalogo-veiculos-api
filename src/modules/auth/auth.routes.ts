import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { loginLimiter } from '../../middlewares/rate-limit'
import * as authController from './auth.controller'

const router = Router()

router.post('/login', loginLimiter, tenantMiddleware, authController.login)

export default router
