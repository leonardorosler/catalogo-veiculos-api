import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import * as adminController from './admin.controller'
import * as planosController from '../planos/planos.controller'

const router = Router()

router.get('/dashboard', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), adminController.dashboard)
router.get('/estoque', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), adminController.estoque)
router.get('/plano', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), planosController.administrativo)

export default router
