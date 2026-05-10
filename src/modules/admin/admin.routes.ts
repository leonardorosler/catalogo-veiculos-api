import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware } from '../../middlewares/auth'
import * as adminController from './admin.controller'

const router = Router()

router.get('/dashboard', tenantMiddleware, authMiddleware, adminController.dashboard)
router.get('/estoque', tenantMiddleware, authMiddleware, adminController.estoque)

export default router