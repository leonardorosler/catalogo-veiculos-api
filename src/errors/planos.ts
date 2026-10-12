import type { PlanoNome, RecursoPlano } from '../config/planos'

export class LimitePlanoError extends Error {
  readonly status = 409
  readonly code = 'PLAN_LIMIT_REACHED'

  constructor(
    message: string,
    readonly plano: PlanoNome,
    readonly limite: number,
  ) {
    super(message)
    this.name = 'LimitePlanoError'
  }
}

export class RecursoPlanoError extends Error {
  readonly status = 403
  readonly code = 'PLAN_FEATURE_REQUIRED'

  constructor(
    message: string,
    readonly recurso: RecursoPlano,
  ) {
    super(message)
    this.name = 'RecursoPlanoError'
  }
}
