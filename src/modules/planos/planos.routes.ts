import { Router } from 'express'
import { tenantMiddleware } from '../../middlewares/tenant'
import * as planosController from './planos.controller'

const router = Router()

router.get('/', tenantMiddleware, planosController.publico)

export default router
