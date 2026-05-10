import type { CambioType, CombustivelType } from '../../lib/prisma-client'
import { prisma } from '../../lib/prisma'

interface FiltrosVeiculo {
  marca?: string
  modelo?: string
  ano?: number
  preco_min?: number
  preco_max?: number
  combustivel?: CombustivelType
  cambio?: CambioType
}

export async function listar(tenantId: string, filtros: FiltrosVeiculo) {
  return prisma.veiculo.findMany({
    where: {
      tenantId,
      vendido: false,
      ...(filtros.marca && { marca: { contains: filtros.marca, mode: 'insensitive' } }),
      ...(filtros.modelo && { modelo: { contains: filtros.modelo, mode: 'insensitive' } }),
      ...(filtros.ano && { ano: filtros.ano }),
      ...(filtros.combustivel && { combustivel: filtros.combustivel }),
      ...(filtros.cambio && { cambio: filtros.cambio }),
      ...((filtros.preco_min || filtros.preco_max) && {
        preco: {
          ...(filtros.preco_min && { gte: filtros.preco_min }),
          ...(filtros.preco_max && { lte: filtros.preco_max }),
        }
      }),
    },
    include: {
      fotos: { where: { capa: true }, take: 1 }
    },
    orderBy: { criadoEm: 'desc' }
  })
}

export async function buscarPorId(id: string, tenantId: string) {
  const veiculo = await prisma.veiculo.findFirst({
    where: { id, tenantId },
    include: { fotos: { orderBy: { ordem: 'asc' } } }
  })

  if (!veiculo) throw new Error('Veículo não encontrado')
  return veiculo
}

export async function criar(dados: any, tenantId: string) {
  return prisma.veiculo.create({
    data: { ...dados, tenantId }
  })
}

export async function atualizar(id: string, dados: any, tenantId: string) {
  const existe = await prisma.veiculo.findFirst({ where: { id, tenantId } })
  if (!existe) throw new Error('Veículo não encontrado')

  return prisma.veiculo.update({
    where: { id },
    data: dados
  })
}

export async function deletar(id: string, tenantId: string) {
  const existe = await prisma.veiculo.findFirst({ where: { id, tenantId } })
  if (!existe) throw new Error('Veículo não encontrado')

  return prisma.veiculo.delete({ where: { id } })
}

export async function marcarDestaque(id: string, tenantId: string) {
  const veiculo = await prisma.veiculo.findFirst({ where: { id, tenantId } })
  if (!veiculo) throw new Error('Veículo não encontrado')

  return prisma.veiculo.update({
    where: { id },
    data: { destaque: !veiculo.destaque }
  })
}

export async function marcarVendido(id: string, tenantId: string) {
  const veiculo = await prisma.veiculo.findFirst({ where: { id, tenantId } })
  if (!veiculo) throw new Error('Veículo não encontrado')

  return prisma.veiculo.update({
    where: { id },
    data: { vendido: !veiculo.vendido }
  })
}

export async function listarDestaques(tenantId: string) {
  return prisma.veiculo.findMany({
    where: { tenantId, destaque: true, vendido: false },
    include: { fotos: { where: { capa: true }, take: 1 } },
    take: 6
  })
}
