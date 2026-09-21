import { prisma } from '../../lib/prisma'

export async function favoritar(sessionId: string, veiculoId: string, tenantId: string) {
  const veiculo = await prisma.veiculo.findFirst({ where: { id: veiculoId, tenantId } })
  if (!veiculo) throw new Error('Veículo não encontrado')

  return prisma.favorito.upsert({
    where: { sessionId_veiculoId: { sessionId, veiculoId } },
    update: {},
    create: { sessionId, veiculoId }
  })
}

export async function desfavoritar(sessionId: string, veiculoId: string, tenantId: string) {
  const favorito = await prisma.favorito.findFirst({
    where: { sessionId, veiculoId, veiculo: { tenantId } }
  })

  if (!favorito) throw new Error('Favorito não encontrado')

  return prisma.favorito.delete({
    where: { id: favorito.id }
  })
}

export async function listar(sessionId: string, tenantId: string) {
  const favoritos = await prisma.favorito.findMany({
    where: { sessionId, veiculo: { tenantId } },
    include: {
      veiculo: {
        include: {
          fotos: { where: { capa: true }, take: 1 }
        }
      }
    }
  })

  return favoritos.map((favorito) => favorito.veiculo)
}
