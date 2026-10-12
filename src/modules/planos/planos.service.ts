import { PLANOS, RECURSOS, getPlano, recursoEstaImplementado, type PlanoNome } from '../../config/planos'
import { prisma } from '../../lib/prisma'

function mapRecursos(plano: PlanoNome) {
  const config = getPlano(plano)

  return Object.fromEntries(RECURSOS.map(recurso => [
    recurso,
    {
      incluido: config.recursos.includes(recurso),
      implementado: recursoEstaImplementado(recurso),
    },
  ]))
}

export function resumoPublico(plano: PlanoNome) {
  const config = getPlano(plano)

  return {
    plano,
    nome: config.nome,
    recursos: mapRecursos(plano),
  }
}

export async function resumoAdministrativo(tenantId: string, plano: PlanoNome) {
  const config = PLANOS[plano]
  const [veiculos, usuarios] = await Promise.all([
    prisma.veiculo.count({ where: { tenantId, vendido: false } }),
    prisma.usuario.count({ where: { tenantId } }),
  ])

  return {
    ...resumoPublico(plano),
    limites: config.limites,
    uso: { veiculos, usuarios },
  }
}
