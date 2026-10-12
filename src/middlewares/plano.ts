import { NextFunction, Request, Response } from 'express'
import { getPlano, planoIncluiRecurso, type RecursoPlano } from '../config/planos'

export function requirePlanFeature(recurso: RecursoPlano) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!planoIncluiRecurso(req.tenantPlano, recurso)) {
      res.status(403).json({
        code: 'PLAN_FEATURE_REQUIRED',
        message: `O recurso exige um plano superior ao ${getPlano(req.tenantPlano).nome}.`,
        plano: req.tenantPlano,
        recurso,
      })
      return
    }

    next()
  }
}
