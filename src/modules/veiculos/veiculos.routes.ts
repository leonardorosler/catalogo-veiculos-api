import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware } from '../../middlewares/auth'
import * as veiculosController from './veiculos.controller'

const router = Router()

// Públicas
router.get('/', tenantMiddleware, veiculosController.listar)
router.get('/destaques', tenantMiddleware, veiculosController.listarDestaques)
router.get('/:id', tenantMiddleware, veiculosController.buscarPorId)

// Admin
router.post('/', tenantMiddleware, authMiddleware, veiculosController.criar)
router.put('/:id', tenantMiddleware, authMiddleware, veiculosController.atualizar)
router.delete('/:id', tenantMiddleware, authMiddleware, veiculosController.deletar)
router.patch('/:id/destaque', tenantMiddleware, authMiddleware, veiculosController.marcarDestaque)
router.patch('/:id/vendido', tenantMiddleware, authMiddleware, veiculosController.marcarVendido)

export default router