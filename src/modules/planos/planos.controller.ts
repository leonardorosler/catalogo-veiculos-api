import { Request, Response } from 'express'
import * as planosService from './planos.service'

export function publico(req: Request, res: Response) {
  res.json(planosService.resumoPublico(req.tenantPlano))
}

export async function administrativo(req: Request, res: Response) {
  try {
    res.json(await planosService.resumoAdministrativo(req.tenantId, req.tenantPlano))
  } catch {
    res.status(500).json({ message: 'Não foi possível consultar o plano' })
  }
}
