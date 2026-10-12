import type { CambioType, CombustivelType } from '../../lib/prisma-client'
import { prisma } from '../../lib/prisma'
import type { VehicleInput, VehicleUpdateInput } from './veiculos.schemas'
import { getPlano, type PlanoNome } from '../../config/planos'
import { LimitePlanoError } from '../../errors/planos'
import { serializableTransaction } from '../usuarios/usuarios.policies'

interface FiltrosVeiculo {
  marca?: string
  modelo?: string
  ano?: number
  preco_min?: number
  preco_max?: number
  combustivel?: CombustivelType
  cambio?: CambioType
  categoria?: string
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
      ...(filtros.categoria && { categoria: { equals: filtros.categoria, mode: 'insensitive' } }),
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

export async function criar(dados: VehicleInput, tenantId: string, plano: PlanoNome) {
  const limite = getPlano(plano).limites.veiculos

  if (limite === null) {
    return prisma.veiculo.create({ data: { ...dados, tenantId } })
  }

  return serializableTransaction(options => prisma.$transaction(async tx => {
    const emEstoque = await tx.veiculo.count({ where: { tenantId, vendido: false } })

    if (emEstoque >= limite) {
      throw new LimitePlanoError(
        `O plano ${getPlano(plano).nome} permite até ${limite} veículos disponíveis.`,
        plano,
        limite,
      )
    }

    return tx.veiculo.create({ data: { ...dados, tenantId } })
  }, options))
}

export async function atualizar(id: string, dados: VehicleUpdateInput, tenantId: string) {
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

export async function marcarVendido(id: string, tenantId: string, plano: PlanoNome) {
  return serializableTransaction(options => prisma.$transaction(async tx => {
    const veiculo = await tx.veiculo.findFirst({ where: { id, tenantId } })
    if (!veiculo) throw new Error('Veículo não encontrado')

    if (veiculo.vendido) {
      const vendaCRM = await tx.lead.findFirst({ where: { tenantId, veiculoId: id, etapa: 'GANHO' }, select: { id: true } })
      if (vendaCRM) throw Object.assign(new Error('Este veículo possui uma venda concluída no CRM. Preserve o registro da venda; não é possível reativá-lo como disponível.'), { status: 409, code: 'CRM_SALE_CLOSED' })
      const limite = getPlano(plano).limites.veiculos
      if (limite !== null) {
        const emEstoque = await tx.veiculo.count({ where: { tenantId, vendido: false } })
        if (emEstoque >= limite) {
          throw new LimitePlanoError(
            `O plano ${getPlano(plano).nome} permite até ${limite} veículos disponíveis.`,
            plano,
            limite,
          )
        }
      }
    }

    return tx.veiculo.update({
      where: { id },
      data: { vendido: !veiculo.vendido }
    })
  }, options))
}

export async function listarDestaques(tenantId: string) {
  return prisma.veiculo.findMany({
    where: { tenantId, destaque: true, vendido: false },
    include: { fotos: { where: { capa: true }, take: 1 } },
    take: 6
  })
}
