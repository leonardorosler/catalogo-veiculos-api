import bcrypt from 'bcryptjs'
import { getPlano, type PlanoNome } from '../../config/planos'
import { LimitePlanoError } from '../../errors/planos'
import { prisma } from '../../lib/prisma'
import type { UsuarioInput } from './usuarios.schemas'
import { removerUsuario, serializableTransaction, UsuarioPolicyError } from './usuarios.policies'

const selectUsuario = {
  id: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  criadoEm: true,
} as const

export function listar(tenantId: string) {
  return prisma.usuario.findMany({
    where: { tenantId },
    select: selectUsuario,
    orderBy: { criadoEm: 'asc' },
  })
}

export async function criar(dados: UsuarioInput, tenantId: string, plano: PlanoNome) {
  const limite = getPlano(plano).limites.usuarios
  const senha = await bcrypt.hash(dados.senha, 12)

  return serializableTransaction(options => prisma.$transaction(async tx => {
    if (limite !== null) {
      const total = await tx.usuario.count({ where: { tenantId } })
      if (total >= limite) {
        throw new LimitePlanoError(
          `O plano ${getPlano(plano).nome} permite até ${limite} usuário(s).`,
          plano,
          limite,
        )
      }
    }

    return tx.usuario.create({
      data: { ...dados, senha, tenantId },
      select: selectUsuario,
    })
  }, options))
}

export async function remover(id: string, tenantId: string, userId: string) {
  return serializableTransaction(options => prisma.$transaction(
    tx => removerUsuario(tx, id, tenantId, userId),
    options,
  ))
}

export async function alterarAtivo(id: string, tenantId: string, userId: string, ativo: boolean) {
  if (!ativo && id === userId) throw new UsuarioPolicyError('Você não pode desativar sua própria conta')
  return serializableTransaction(options => prisma.$transaction(async tx => {
    const usuario = await tx.usuario.findFirst({ where: { id, tenantId } })
    if (!usuario) throw new UsuarioPolicyError('Usuário não encontrado')
    if (!ativo && usuario.ativo && usuario.role === 'ADMIN') {
      const admins = await tx.usuario.count({ where: { tenantId, role: 'ADMIN', ativo: true } })
      if (admins <= 1) throw new UsuarioPolicyError('A loja deve manter pelo menos um administrador ativo')
    }
    return tx.usuario.update({ where: { id, tenantId }, data: { ativo }, select: selectUsuario })
  }, options))
}
