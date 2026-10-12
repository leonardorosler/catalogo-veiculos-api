import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { leadLimiter } from '../../middlewares/rate-limit'
import * as leadsController from './leads.controller'
import { requirePlanFeature } from '../../middlewares/plano'
import { crmActor } from '../crm/crm.routes'

const router = Router()

// Públicas
router.post('/vender-carro', leadLimiter, tenantMiddleware, requirePlanFeature('LEADS'), leadsController.venderCarro)
router.post('/financiamento', leadLimiter, tenantMiddleware, requirePlanFeature('LEADS'), leadsController.financiamento)
router.post('/interesse', leadLimiter, tenantMiddleware, requirePlanFeature('LEADS'), leadsController.interesse)

// Admin
router.get('/', tenantMiddleware, authMiddleware, crmActor, requireRole('ADMIN', 'VENDEDOR'), requirePlanFeature('LEADS'), leadsController.listarLeads)
router.patch('/:id/lido', tenantMiddleware, authMiddleware, crmActor, requireRole('ADMIN', 'VENDEDOR'), requirePlanFeature('LEADS'), leadsController.marcarLido)

export default router
