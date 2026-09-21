import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import * as adminController from './admin.controller'

const router = Router()

router.get('/dashboard', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), adminController.dashboard)
router.get('/estoque', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), adminController.estoque)

export default router
