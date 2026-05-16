import { Router } from 'express'
import multer from 'multer'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware } from '../../middlewares/auth'
import * as fotosController from './fotos.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/veiculos/:id/fotos', tenantMiddleware, authMiddleware, upload.single('foto'), fotosController.upload)
router.delete('/fotos/:id', tenantMiddleware, authMiddleware, fotosController.deletar)
router.patch('/fotos/:id/capa', tenantMiddleware, authMiddleware, fotosController.definirCapa)

export default router