import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

//declara que req.userId, req.role existem
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

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token não informado' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload

    req.userId = payload.userId
    req.tenantId = payload.tenantId
    req.role = payload.role

    next()
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' })
  }
}