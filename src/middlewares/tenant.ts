import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

//sem isso: "Property 'tenantId' does not exist on type 'Request'"
declare global {
  namespace Express {
    interface Request {
      tenantId: string
    }
  }
}


//recebe, busca, valida e adiciona req.tenantID
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const slug = req.headers['x-tenant-id'] as string

  if (!slug) {
    res.status(400).json({ message: 'Header x-tenant-id é obrigatório' })
    return
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug }
  })

  if (!tenant || !tenant.ativo) {
    res.status(404).json({ message: 'Revenda não encontrada' })
    return
  }

  req.tenantId = tenant.id
  next()
}

//depois disso rotas usam tenantID