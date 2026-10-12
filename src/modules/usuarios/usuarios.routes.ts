import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { tenantMiddleware } from '../../middlewares/tenant'
import * as usuariosController from './usuarios.controller'

const router = Router()

router.use(tenantMiddleware, authMiddleware, requireRole('ADMIN'))
router.get('/', usuariosController.listar)
router.post('/', usuariosController.criar)
router.patch('/:id/ativo', usuariosController.alterarAtivo)
router.delete('/:id', usuariosController.remover)

export default router
