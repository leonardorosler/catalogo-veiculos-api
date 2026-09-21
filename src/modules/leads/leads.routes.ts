import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { leadLimiter } from '../../middlewares/rate-limit'
import * as leadsController from './leads.controller'

const router = Router()

// Públicas
router.post('/vender-carro', leadLimiter, tenantMiddleware, leadsController.venderCarro)
router.post('/financiamento', leadLimiter, tenantMiddleware, leadsController.financiamento)

// Admin
router.get('/', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), leadsController.listarLeads)
router.patch('/:id/lido', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'VENDEDOR'), leadsController.marcarLido)

export default router
