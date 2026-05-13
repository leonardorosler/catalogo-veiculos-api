import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware } from '../../middlewares/auth'
import * as leadsController from './leads.controller'

const router = Router()

// Públicas
router.post('/vender-carro', tenantMiddleware, leadsController.venderCarro)
router.post('/financiamento', tenantMiddleware, leadsController.financiamento)

// Admin
router.get('/', tenantMiddleware, authMiddleware, leadsController.listarLeads)
router.patch('/:id/lido', tenantMiddleware, authMiddleware, leadsController.marcarLido)

export default router