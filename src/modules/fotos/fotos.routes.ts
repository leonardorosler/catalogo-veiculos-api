import { Router, type Request } from 'express'
import multer from 'multer'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { uploadLimiter } from '../../middlewares/rate-limit'
import * as fotosController from './fotos.controller'

const router = Router()
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 100 },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'foto'))
      return
    }
    callback(null, true)
  },
})

router.post('/veiculos/:id/fotos', uploadLimiter, tenantMiddleware, authMiddleware, requireRole('ADMIN'), upload.single('foto'), fotosController.upload)
router.delete('/fotos/:id', tenantMiddleware, authMiddleware, requireRole('ADMIN'), fotosController.deletar)
router.patch('/fotos/:id/capa', tenantMiddleware, authMiddleware, requireRole('ADMIN'), fotosController.definirCapa)

export default router
