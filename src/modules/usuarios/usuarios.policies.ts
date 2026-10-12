interface UsuarioDeletionTransaction {
  usuario: {
    findFirst: (args: {
      where: { id: string; tenantId: string }
      select: { role: true; ativo: true }
    }) => Promise<{ role: string; ativo?: boolean } | null>
    count: (args: { where: { tenantId: string; role: 'ADMIN'; ativo: true } }) => Promise<number>
    delete: (args: { where: { id: string; tenantId: string } }) => Promise<unknown>
  }
}

export class UsuarioPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsuarioPolicyError'
  }
}

// Repete a transação inteira: o PostgreSQL pode abortar uma disputa serializável.
export async function serializableTransaction<T>(
  run: (options: { isolationLevel: 'Serializable' }) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run({ isolationLevel: 'Serializable' })
    } catch (error) {
      const conflito = typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'P2034'
      if (!conflito || attempt >= 2) throw error
    }
  }
}

export async function removerUsuario(
  tx: UsuarioDeletionTransaction,
  id: string,
  tenantId: string,
  userId: string,
) {
  if (id === userId) throw new UsuarioPolicyError('Você não pode remover o próprio usuário')

  const usuario = await tx.usuario.findFirst({
    where: { id, tenantId },
    select: { role: true, ativo: true },
  })
  if (!usuario) throw new UsuarioPolicyError('Usuário não encontrado')

  if (usuario.role === 'ADMIN' && usuario.ativo !== false) {
    const admins = await tx.usuario.count({ where: { tenantId, role: 'ADMIN', ativo: true } })
    if (admins <= 1) {
      throw new UsuarioPolicyError('A loja deve manter pelo menos um administrador')
    }
  }

  await tx.usuario.delete({ where: { id, tenantId } })
}
