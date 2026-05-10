import { prisma } from '../../lib/prisma'

export async function dashboard(tenantId: string) {
  const [total, ativos, vendidos, destaques] = await Promise.all([
    prisma.veiculo.count({ where: { tenantId } }),
    prisma.veiculo.count({ where: { tenantId, vendido: false } }),
    prisma.veiculo.count({ where: { tenantId, vendido: true } }),
    prisma.veiculo.count({ where: { tenantId, destaque: true, vendido: false } }),
  ])

  return { total, ativos, vendidos, destaques }
}

export async function estoque(tenantId: string) {
  return prisma.veiculo.findMany({
    where: { tenantId },
    include: {
      fotos: { where: { capa: true }, take: 1 },
      _count: { select: { fotos: true } }
    },
    orderBy: { criadoEm: 'desc' }
  })
}