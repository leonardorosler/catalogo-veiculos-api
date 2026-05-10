import { prisma } from '../../lib/prisma'

export async function favoritar(sessionId: string, veiculoId: string) {
  return prisma.favorito.upsert({
    where: { sessionId_veiculoId: { sessionId, veiculoId } },
    update: {},
    create: { sessionId, veiculoId }
  })
}

export async function desfavoritar(sessionId: string, veiculoId: string) {
  const favorito = await prisma.favorito.findUnique({
    where: { sessionId_veiculoId: { sessionId, veiculoId } }
  })

  if (!favorito) throw new Error('Favorito não encontrado')

  return prisma.favorito.delete({
    where: { sessionId_veiculoId: { sessionId, veiculoId } }
  })
}

export async function listar(sessionId: string) {
  const favoritos = await prisma.favorito.findMany({
    where: { sessionId },
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
