import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { createAuthMiddleware, type UsuarioAutenticado } from './auth.session'

const secret = 'synthetic-test-secret-with-at-least-32-characters'
const usuario: UsuarioAutenticado = {
  id: 'user-a', nome: 'Usuário atual', email: 'atual@example.test', role: 'VENDEDOR',
}

function token(payload: object = { userId: usuario.id, tenantId: 'tenant-a', role: 'ADMIN' }) {
  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

function request(authorization: string | undefined = `Bearer ${token()}`, tenantId = 'tenant-a') {
  const req = { headers: { authorization }, tenantId } as Request
  const res = {
    status: mock.fn((_status: number): unknown => res),
    json: mock.fn((_body: unknown): unknown => res),
  }
  const next = mock.fn((_error?: unknown) => {})
  return { req, res, next }
}

test('token de usuário removido recebe 401 e não segue para a rota', async () => {
  const findUsuario = mock.fn(async (_id: string, _tenantId: string) => null)
  const middleware = createAuthMiddleware({ getSecret: () => secret, findUsuario })
  const { req, res, next } = request()
  await middleware(req, res as unknown as Response, next)
  assert.deepEqual(findUsuario.mock.calls[0].arguments, ['user-a', 'tenant-a'])
  assert.equal(res.status.mock.calls[0].arguments[0], 401)
  assert.equal(next.mock.callCount(), 0)
  assert.equal(req.userId, undefined)
})

test('role e projeção vêm do banco e refletem alterações com o mesmo token', async () => {
  let atual = { ...usuario }
  const middleware = createAuthMiddleware({
    getSecret: () => secret,
    findUsuario: async () => atual,
  })
  const first = request()
  await middleware(first.req, first.res as unknown as Response, first.next)
  assert.equal(first.req.role, 'VENDEDOR')
  assert.deepEqual(first.req.authUsuario, usuario)
  assert.equal(first.next.mock.callCount(), 1)
  assert.deepEqual(first.next.mock.calls[0].arguments, [])

  atual = { ...usuario, nome: 'Nome atualizado', role: 'ADMIN' }
  const second = request(first.req.headers.authorization)
  await middleware(second.req, second.res as unknown as Response, second.next)
  assert.equal(second.req.role, 'ADMIN')
  assert.deepEqual(second.req.authUsuario, atual)
  assert.deepEqual(Object.keys(second.req.authUsuario).sort(), ['email', 'id', 'nome', 'role'])
})

test('token de outra revenda recebe 403 sem consultar ou autorizar usuário', async () => {
  const findUsuario = mock.fn(async () => usuario)
  const middleware = createAuthMiddleware({ getSecret: () => secret, findUsuario })
  const { req, res, next } = request(`Bearer ${token()}`, 'tenant-b')
  await middleware(req, res as unknown as Response, next)
  assert.equal(res.status.mock.calls[0].arguments[0], 403)
  assert.equal(findUsuario.mock.callCount(), 0)
  assert.equal(next.mock.callCount(), 0)
})

test('ID existente somente em outra revenda não autentica', async () => {
  const findUsuario = mock.fn(async (id: string, tenantId: string) => {
    return id === usuario.id && tenantId === 'tenant-b' ? usuario : null
  })
  const middleware = createAuthMiddleware({ getSecret: () => secret, findUsuario })
  const { req, res, next } = request()
  await middleware(req, res as unknown as Response, next)
  assert.deepEqual(findUsuario.mock.calls[0].arguments, ['user-a', 'tenant-a'])
  assert.equal(res.status.mock.calls[0].arguments[0], 401)
  assert.equal(next.mock.callCount(), 0)
})

test('falha no banco recebe 503 genérico e nunca usa claims como fallback', async () => {
  const middleware = createAuthMiddleware({
    getSecret: () => secret,
    findUsuario: async () => { throw new Error('Detalhes internos da conexão') },
  })
  const { req, res, next } = request()
  await middleware(req, res as unknown as Response, next)
  assert.equal(res.status.mock.calls[0].arguments[0], 503)
  assert.deepEqual(res.json.mock.calls[0].arguments[0], { message: 'Serviço temporariamente indisponível' })
  assert.equal(next.mock.callCount(), 0)
  assert.equal(req.role, undefined)
  assert.equal(req.authUsuario, undefined)
})

test('erro de configuração é encaminhado uma vez ao handler genérico de erro', async () => {
  const error = new Error('Configuração indisponível')
  const findUsuario = mock.fn(async () => usuario)
  const middleware = createAuthMiddleware({
    getSecret: () => { throw error },
    findUsuario,
  })
  const { req, res, next } = request()
  await middleware(req, res as unknown as Response, next)
  assert.equal(next.mock.callCount(), 1)
  assert.deepEqual(next.mock.calls[0].arguments, [error])
  assert.equal(findUsuario.mock.callCount(), 0)
  assert.equal(res.json.mock.callCount(), 0)
  assert.equal(req.userId, undefined)
})

test('claims de identidade ausentes ou de tipos inválidos recebem 401', async () => {
  const findUsuario = mock.fn(async () => usuario)
  const middleware = createAuthMiddleware({ getSecret: () => secret, findUsuario })
  for (const payload of [
    {}, { userId: 123, tenantId: 'tenant-a' },
    { userId: 'user-a', tenantId: ['tenant-a'] },
    { userId: ' ', tenantId: 'tenant-a' },
  ]) {
    const { req, res, next } = request(`Bearer ${token(payload)}`)
    await middleware(req, res as unknown as Response, next)
    assert.equal(res.status.mock.calls[0].arguments[0], 401)
    assert.equal(next.mock.callCount(), 0)
  }
  assert.equal(findUsuario.mock.callCount(), 0)
})

test('tokens sem assinatura válida, expirados ou com algoritmo diferente recebem 401', async () => {
  const payload = { userId: 'user-a', tenantId: 'tenant-a' }
  const findUsuario = mock.fn(async () => usuario)
  const middleware = createAuthMiddleware({ getSecret: () => secret, findUsuario })
  for (const invalid of [
    'invalid-token',
    jwt.sign(payload, 'different-synthetic-secret'),
    jwt.sign(payload, secret, { expiresIn: -1 }),
    jwt.sign(payload, secret, { algorithm: 'HS384' }),
  ]) {
    const { req, res, next } = request(`Bearer ${invalid}`)
    await middleware(req, res as unknown as Response, next)
    assert.equal(res.status.mock.calls[0].arguments[0], 401)
    assert.equal(next.mock.callCount(), 0)
  }
  assert.equal(findUsuario.mock.callCount(), 0)
})

test('sem Bearer não consulta banco nem configuração', async () => {
  const getSecret = mock.fn(() => secret)
  const findUsuario = mock.fn(async () => usuario)
  const middleware = createAuthMiddleware({ getSecret, findUsuario })
  const { req, res, next } = request('')
  await middleware(req, res as unknown as Response, next)
  assert.equal(res.status.mock.calls[0].arguments[0], 401)
  assert.equal(findUsuario.mock.callCount(), 0)
  assert.equal(getSecret.mock.callCount(), 0)
  assert.equal(next.mock.callCount(), 0)
})
