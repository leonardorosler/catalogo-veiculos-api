import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import { favoriteLimiter } from '../../middlewares/rate-limit'
import * as favoritosController from './favoritos.controller'

const router = Router()

router.use(favoriteLimiter)
router.post('/', tenantMiddleware, favoritosController.favoritar)
router.delete('/:veiculoId', tenantMiddleware, favoritosController.desfavoritar)
router.get('/', tenantMiddleware, favoritosController.listar)

export default router
