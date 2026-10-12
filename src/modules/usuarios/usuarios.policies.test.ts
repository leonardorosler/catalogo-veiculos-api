import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { removerUsuario, serializableTransaction, UsuarioPolicyError } from './usuarios.policies'

function transaction(role: string | null = 'ADMIN', admins = 2) {
  return {
    usuario: {
      findFirst: mock.fn(async (_args: unknown) => role === null ? null : { role }),
      count: mock.fn(async (_args: unknown) => admins),
      delete: mock.fn(async (_args: unknown) => ({})),
    },
  }
}

test('autodeleção é recusada antes de qualquer operação no banco', async () => {
  const tx = transaction()
  await assert.rejects(removerUsuario(tx, 'self', 'tenant-a', 'self'), UsuarioPolicyError)
  assert.equal(tx.usuario.findFirst.mock.callCount(), 0)
  assert.equal(tx.usuario.delete.mock.callCount(), 0)
})

test('último administrador não pode ser excluído', async () => {
  const tx = transaction('ADMIN', 1)
  await assert.rejects(removerUsuario(tx, 'target', 'tenant-a', 'actor'), /pelo menos um administrador/)
  assert.deepEqual(tx.usuario.count.mock.calls[0].arguments, [{ where: { tenantId: 'tenant-a', role: 'ADMIN', ativo: true } }])
  assert.equal(tx.usuario.delete.mock.callCount(), 0)
})

test('consulta e exclusão usam o mesmo tenant e a mesma transação', async () => {
  const tx = transaction()
  await removerUsuario(tx, 'target', 'tenant-a', 'actor')
  assert.deepEqual(tx.usuario.findFirst.mock.calls[0].arguments, [{
    where: { id: 'target', tenantId: 'tenant-a' }, select: { role: true, ativo: true },
  }])
  assert.deepEqual(tx.usuario.delete.mock.calls[0].arguments, [{ where: { id: 'target', tenantId: 'tenant-a' } }])
})

test('vendedor pode ser excluído sem contar administradores', async () => {
  const tx = transaction('VENDEDOR', 1)
  await removerUsuario(tx, 'target', 'tenant-a', 'actor')
  assert.equal(tx.usuario.count.mock.callCount(), 0)
  assert.equal(tx.usuario.delete.mock.callCount(), 1)
})

test('usuário inexistente ou de outra revenda não é excluído', async () => {
  const tx = transaction(null)
  await assert.rejects(removerUsuario(tx, 'target', 'tenant-a', 'actor'), /Usuário não encontrado/)
  assert.equal(tx.usuario.count.mock.callCount(), 0)
  assert.equal(tx.usuario.delete.mock.callCount(), 0)
})

test('P2034 repete a transação inteira em Serializable e limita a três tentativas', async () => {
  const conflict = { code: 'P2034' }
  const run = mock.fn(async (options: { isolationLevel: 'Serializable' }) => {
    assert.deepEqual(options, { isolationLevel: 'Serializable' })
    throw conflict
  })
  await assert.rejects(serializableTransaction(run), error => error === conflict)
  assert.equal(run.mock.callCount(), 3)
})

test('retry pode concluir e não repete erros de política ou infraestrutura', async () => {
  let attempts = 0
  const result = await serializableTransaction(async () => {
    if (++attempts === 1) throw { code: 'P2034' }
    return 'concluído'
  })
  assert.equal(result, 'concluído')
  assert.equal(attempts, 2)

  for (const error of [new UsuarioPolicyError('Recusado'), new Error('Banco indisponível')]) {
    const run = mock.fn(async () => { throw error })
    await assert.rejects(serializableTransaction(run), actual => actual === error)
    assert.equal(run.mock.callCount(), 1)
  }
})

test('exclusões concorrentes fazem retry com nova contagem e preservam o último admin', async () => {
  // Simula snapshots e conflito de commit serializável, sem banco ou locks.
  let usuarios = new Set(['admin-a', 'admin-b'])
  let version = 0
  let attempts = 0
  let release!: () => void
  const bothStarted = new Promise<void>(resolve => { release = resolve })

  async function runTransaction<T>(
    operation: (tx: Parameters<typeof removerUsuario>[0]) => Promise<T>,
    options: { isolationLevel: 'Serializable' },
  ) {
    assert.equal(options.isolationLevel, 'Serializable')
    const initialVersion = version
    const snapshot = new Set(usuarios)
    const attempt = ++attempts
    if (attempt === 2) release()
    if (attempt <= 2) await bothStarted
    const tx = {
      usuario: {
        findFirst: mock.fn(async (args: { where: { id: string } }) => snapshot.has(args.where.id) ? { role: 'ADMIN' } : null),
        count: mock.fn(async (_args: unknown) => snapshot.size),
        delete: mock.fn(async (args: { where: { id: string } }) => { snapshot.delete(args.where.id); return {} }),
      },
    }
    const result = await operation(tx)
    if (version !== initialVersion) throw { code: 'P2034' }
    usuarios = snapshot
    version++
    return result
  }

  const results = await Promise.allSettled([
    serializableTransaction(options => runTransaction(
      tx => removerUsuario(tx, 'admin-a', 'tenant-a', 'admin-b'), options,
    )),
    serializableTransaction(options => runTransaction(
      tx => removerUsuario(tx, 'admin-b', 'tenant-a', 'admin-a'), options,
    )),
  ])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  const failed = results.find(result => result.status === 'rejected')
  assert.ok(failed && failed.status === 'rejected')
  assert.ok(failed.reason instanceof UsuarioPolicyError)
  assert.match(failed.reason.message, /pelo menos um administrador/)
  assert.equal(usuarios.size, 1)
  assert.equal(attempts, 3)
})
