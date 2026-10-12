import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import {
  createAuthMiddleware,
  getJwtSecret,
  selectUsuarioAutenticado,
  type UsuarioAutenticado,
} from '../modules/auth/auth.session'

type Role = 'ADMIN' | 'VENDEDOR'

declare global {
  namespace Express {
    interface Request {
      userId: string
      role: string
      authUsuario: UsuarioAutenticado
    }
  }
}

export const authMiddleware = createAuthMiddleware({
  getSecret: getJwtSecret,
  findUsuario: (id, tenantId) => prisma.usuario.findFirst({
    where: { id, tenantId, ativo: true },
    select: selectUsuarioAutenticado,
  }),
})

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.role as Role)) {
      res.status(403).json({ message: 'Você não tem permissão para esta ação' })
      return
    }
    next()
  }
}
