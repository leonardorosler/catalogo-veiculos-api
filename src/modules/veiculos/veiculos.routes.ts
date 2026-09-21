import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import * as veiculosController from './veiculos.controller'

const router = Router()

// Públicas
router.get('/', tenantMiddleware, veiculosController.listar)
router.get('/destaques', tenantMiddleware, veiculosController.listarDestaques)
router.get('/:id', tenantMiddleware, veiculosController.buscarPorId)

// Admin
router.post('/', tenantMiddleware, authMiddleware, requireRole('ADMIN'), veiculosController.criar)
router.put('/:id', tenantMiddleware, authMiddleware, requireRole('ADMIN'), veiculosController.atualizar)
router.delete('/:id', tenantMiddleware, authMiddleware, requireRole('ADMIN'), veiculosController.deletar)
router.patch('/:id/destaque', tenantMiddleware, authMiddleware, requireRole('ADMIN'), veiculosController.marcarDestaque)
router.patch('/:id/vendido', tenantMiddleware, authMiddleware, requireRole('ADMIN'), veiculosController.marcarVendido)

export default router
