import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import * as authController from './auth.controller'

const router = Router()

router.post('/register', tenantMiddleware, authController.register)
router.post('/login', tenantMiddleware, authController.login)

export default router