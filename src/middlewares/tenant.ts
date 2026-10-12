import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import type { PlanoNome } from '../config/planos'

declare global {
  namespace Express {
    interface Request {
      tenantId: string
      tenantPlano: PlanoNome
    }
  }
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['x-tenant-id']
  const slug = typeof header === 'string' ? header.trim().toLowerCase() : ''

  if (!slug || slug.length > 80 || !/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ message: 'Header x-tenant-id inválido' })
    return
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } })

    if (!tenant || !tenant.ativo) {
      res.status(404).json({ message: 'Revenda não encontrada' })
      return
    }

    req.tenantId = tenant.id
    req.tenantPlano = tenant.plano
    next()
  } catch {
    res.status(503).json({ message: 'Serviço temporariamente indisponível' })
  }
}
