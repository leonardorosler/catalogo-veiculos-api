import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

type Role = 'ADMIN' | 'VENDEDOR'

declare global {
  namespace Express {
    interface Request {
      userId: string
      role: string
    }
  }
}

interface JwtPayload {
  userId: string
  tenantId: string
  role: string
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET inválido')
  return secret
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token não informado' })
    return
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), getJwtSecret(), { algorithms: ['HS256'] }) as JwtPayload

    if (!payload.userId || !payload.tenantId || !payload.role || payload.tenantId !== req.tenantId) {
      res.status(403).json({ message: 'Token não pertence a esta revenda' })
      return
    }

    req.userId = payload.userId
    req.role = payload.role
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' })
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.role as Role)) {
      res.status(403).json({ message: 'Você não tem permissão para esta ação' })
      return
    }
    next()
  }
}
