import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface UsuarioAutenticado {
  id: string
  nome: string
  email: string
  role: 'ADMIN' | 'VENDEDOR'
}

export const selectUsuarioAutenticado = {
  id: true,
  nome: true,
  email: true,
  role: true,
} as const

interface AuthDependencies {
  getSecret: () => string
  findUsuario: (id: string, tenantId: string) => Promise<UsuarioAutenticado | null>
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET inválido')
  return secret
}

export function createAuthMiddleware({ getSecret, findUsuario }: AuthDependencies) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Token não informado' })
      return
    }

    let secret: string
    try {
      secret = getSecret()
    } catch (error) {
      next(error)
      return
    }

    let payload: jwt.JwtPayload | string
    try {
      payload = jwt.verify(authHeader.slice(7), secret, { algorithms: ['HS256'] })
    } catch {
      res.status(401).json({ message: 'Token inválido ou expirado' })
      return
    }

    if (typeof payload !== 'object' ||
        typeof payload.userId !== 'string' || !payload.userId.trim() ||
        typeof payload.tenantId !== 'string' || !payload.tenantId.trim()) {
      res.status(401).json({ message: 'Token inválido ou expirado' })
      return
    }

    if (payload.tenantId !== req.tenantId) {
      res.status(403).json({ message: 'Token não pertence a esta revenda' })
      return
    }

    let usuario: UsuarioAutenticado | null
    try {
      usuario = await findUsuario(payload.userId, req.tenantId)
    } catch {
      res.status(503).json({ message: 'Serviço temporariamente indisponível' })
      return
    }

    if (!usuario) {
      res.status(401).json({ message: 'Token inválido ou expirado' })
      return
    }

    req.userId = usuario.id
    req.role = usuario.role
    req.authUsuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    }
    next()
  }
}
