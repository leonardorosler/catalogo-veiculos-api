import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { Prisma } from '../../generated/prisma/client'
import { CrmError } from './crm.domain'
import { crmTransactions, proposalMail, createLead, listLeads, patchLead, patchProposal, publicConfig, reports, serializable, type Context } from './crm.service'

const admin: Context = { tenantId: 'tenant-a', userId: 'admin-a', role: 'ADMIN', plano: 'PREMIUM' }
const vendedor: Context = { ...admin, userId: 'seller-a', role: 'VENDEDOR' }
const opportunity = { id: 'l', tenantId: 'tenant-a', etapa: 'NOVO', veiculoId: 'v', valorVenda: null, motivoPerda: null, responsavelId: 'seller-a' }
function transaction(t: TestContext, tx: unknown) {
  t.mock.method(crmTransactions, 'run', async (run: (client: unknown) => Promise<unknown>) => run(tx))
}
test('paginação mantém tenant, carteira própria, busca e filtros nos três cálculos', async t => {
  const queries: Record<string, unknown>[] = []
  const capture = (result: unknown) => async (query: Record<string, unknown>) => { queries.push(query); return result }
  transaction(t, { lead: { findMany: capture([]), count: capture(4), groupBy: capture([{ etapa: 'CONTATO', _count: { _all: 4 } }]) } })
  const result = await listLeads(vendedor, { page: 2, pageSize: 25, busca: 'João', origem: 'SITE', etapa: 'CONTATO', responsavelId: 'outro' })
  assert.equal(result.total, 4)
  assert.equal(result.etapas.CONTATO, 4)
  assert.equal(result.etapas.GANHO, 0)
  for (const query of queries) {
    assert.deepEqual(query.where, { tenantId: 'tenant-a', responsavelId: 'seller-a', etapa: 'CONTATO', origem: 'SITE', AND: [{ responsavelId: 'outro' }], OR: ['nome', 'telefone', 'email'].map(field => ({ [field]: { contains: 'João', mode: 'insensitive' } })) })
  }
  assert.equal(queries[0]!.skip, 25)
  assert.equal(queries[0]!.take, 25)
})
test('fechamento não grava lead/histórico se reserva do veículo falhar', async t => {
  let writes = 0
  transaction(t, {
    lead: { findFirst: async () => opportunity, update: async () => { writes++ } },
    veiculo: { updateMany: async (query: unknown) => { assert.deepEqual(query, { where: { id: 'v', tenantId: 'tenant-a', vendido: false }, data: { vendido: true } }); return { count: 0 } } },
    historicoLead: { create: async () => { writes++ } },
  })
  await assert.rejects(patchLead(vendedor, 'l', { etapa: 'GANHO', valorVenda: 80000 }), (e: unknown) => e instanceof CrmError && e.code === 'VEHICLE_ALREADY_SOLD')
  assert.equal(writes, 0)
})
test('reserva, fechamento e histórico usam a mesma transação e limpam agenda', async t => {
  const calls: string[] = [], updates: Record<string, unknown>[] = []
  const row = { ...opportunity, etapa: 'GANHO', valorVenda: new Prisma.Decimal(80000), responsavel: null, veiculo: null, historico: [], propostas: [] }
  transaction(t, {
    lead: { findFirst: async () => opportunity, update: async (q: { data: Record<string, unknown> }) => { calls.push('lead'); updates.push(q.data) }, findUniqueOrThrow: async () => row },
    veiculo: { updateMany: async () => { calls.push('veiculo'); return { count: 1 } } },
    historicoLead: { create: async () => { calls.push('historico') } },
  })
  const result = await patchLead(vendedor, 'l', { etapa: 'GANHO', valorVenda: 80000, proximaAtividadeEm: new Date(), motivoPerda: 'Não deve persistir' })
  assert.equal(calls[0], 'veiculo')
  assert.ok(calls.includes('historico'))
  assert.equal(updates[0]!.etapa, 'GANHO')
  assert.equal(updates[1]!.proximaAtividadeEm, null)
  assert.equal(updates[1]!.motivoPerda, null)
  assert.equal(result.valorVenda, 80000)
})
test('vendedor não muda responsável e Profissional não atribui a outro', async t => {
  transaction(t, { lead: { findFirst: async () => opportunity } })
  await assert.rejects(patchLead(vendedor, 'l', { responsavelId: 'outro' }), (e: unknown) => e instanceof CrmError && e.status === 403)
  await assert.rejects(patchLead({ ...admin, plano: 'PROFISSIONAL' }, 'l', { responsavelId: 'outro' }), (e: unknown) => e instanceof CrmError && e.code === 'PLAN_FEATURE_REQUIRED')
})
test('automação Premium escolhe menor carteira e persiste prazo/histórico junto ao lead', async t => {
  let created: Record<string, unknown> = {}, notes: string[] = []
  transaction(t, {
    tenant: { findFirst: async () => ({ plano: 'PREMIUM' }) },
    configuracaoComercial: { upsert: async () => ({ distribuicaoAutomatica: true, retornoAutomaticoHoras: 24 }) },
    usuario: { findMany: async () => [{ id: 'seller-b' }, { id: 'seller-a' }] },
    lead: { groupBy: async () => [{ responsavelId: 'seller-b', _count: { _all: 7 } }, { responsavelId: 'seller-a', _count: { _all: 1 } }], create: async (q: { data: Record<string, unknown> }) => { created = q.data; return { id: 'l' } }, findUniqueOrThrow: async () => ({ id: 'l' }) },
    historicoLead: { create: async (q: { data: { tipo: string } }) => { notes.push(q.data.tipo) } },
  })
  const before = Date.now()
  await createLead('tenant-a', { nome: 'Cliente', telefone: '11999999999', tipo: 'INTERESSE', origem: 'SITE', dados: { cpf: 'não persistir' } })
  assert.equal(created.responsavelId, 'seller-a')
  assert.deepEqual(created.dados, {})
  assert.ok((created.proximaAtividadeEm as Date).getTime() >= before + 24 * 3600000)
  assert.deepEqual(notes, ['CRIACAO', 'ATRIBUICAO', 'AUTOMACAO'])
})
test('lead público Profissional fica sem responsável e sem automação Premium', async t => {
  let created: Record<string, unknown> = {}
  transaction(t, { tenant: { findFirst: async () => ({ plano: 'PROFISSIONAL' }) },
    lead: { create: async (q: { data: Record<string, unknown> }) => { created = q.data; return { id: 'l' } }, findUniqueOrThrow: async () => ({ id: 'l' }) }, historicoLead: { create: async () => ({}) } })
  await createLead('tenant-a', { nome: 'Cliente', telefone: '11999999999', tipo: 'INTERESSE', origem: 'SITE' })
  assert.equal(created.responsavelId, null)
  assert.equal(created.proximaAtividadeEm, null)
})
test('lead manual de vendedor é atribuído ao próprio autor mesmo com distribuição ativa', async t => {
  let created: Record<string, unknown> = {}
  transaction(t, { tenant: { findFirst: async () => ({ plano: 'PREMIUM' }) },
    configuracaoComercial: { upsert: async () => ({ distribuicaoAutomatica: true, retornoAutomaticoHoras: null }) },
    lead: { create: async (q: { data: Record<string, unknown> }) => { created = q.data; return { id: 'l' } }, findUniqueOrThrow: async () => ({ id: 'l' }) }, historicoLead: { create: async () => ({}) } })
  await createLead('tenant-a', { nome: 'Cliente', telefone: '11999999999', tipo: 'INTERESSE', origem: 'OUTRO' }, vendedor)
  assert.equal(created.responsavelId, 'seller-a')
})
test('lead de outra carteira recebe 404 sem escrita e validação de veículo é scoped', async t => {
  transaction(t, { lead: { findFirst: async (q: unknown) => { assert.deepEqual(q, { where: { id: 'l', tenantId: 'tenant-a', responsavelId: 'seller-a' } }); return null } } })
  await assert.rejects(patchLead(vendedor, 'l', { nome: 'Nome' }), (e: unknown) => e instanceof CrmError && e.status === 404)
  transaction(t, { tenant: { findFirst: async () => ({ plano: 'PREMIUM' }) }, veiculo: { findFirst: async (q: { where: unknown }) => {
    assert.deepEqual(q.where, { id: 'outro-tenant', tenantId: 'tenant-a', vendido: false }); return null
  } } })
  await assert.rejects(createLead('tenant-a', { nome: 'Cliente', telefone: '11999999999', tipo: 'INTERESSE', origem: 'SITE', veiculoId: 'outro-tenant' }), (e: unknown) => e instanceof CrmError && e.code === 'VEHICLE_UNAVAILABLE')
})
test('proposta expirada não chega à reserva de venda', async t => {
  transaction(t, { proposta: { findFirst: async () => ({ status: 'ENVIADA', validadeEm: new Date('2000-01-01'), lead: opportunity }) } })
  await assert.rejects(patchProposal(vendedor, 'p', { status: 'ACEITA' }), (e: unknown) => e instanceof CrmError && e.code === 'PROPOSAL_EXPIRED')
})
test('email falho persiste compartilhamento e falha auditável; retry não afirma entrega', async t => {
  const oldKey = process.env.RESEND_API_KEY, oldFrom = process.env.EMAIL_FROM
  process.env.RESEND_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'test@example.com'
  t.after(() => { if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey; if (oldFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = oldFrom })
  let row = { id: 'p', tenantId: 'tenant-a', leadId: 'l', numero: 1, status: 'RASCUNHO', validadeEm: new Date('2099-01-01'), valor: new Prisma.Decimal(10000), entrada: null, trocaValor: null, veiculoId: 'v', veiculo: { id: 'v', marca: 'Fiat', modelo: 'Uno', ano: 2020, preco: 10000 }, compartilhadaEm: null as Date | null, envioEmailStatus: null as string | null, lead: { ...opportunity, email: 'cliente@example.com' } }
  const descriptions: string[] = []
  transaction(t, {
    proposta: { findFirst: async () => row, update: async (q: { data: Record<string, unknown> }) => { row = { ...row, ...q.data }; return row }, updateMany: async (q: { data: { envioEmailStatus: string } }) => { row.envioEmailStatus = q.data.envioEmailStatus; return { count: 1 } } },
    veiculo: { findFirst: async () => row.veiculo }, historicoLead: { create: async (q: { data: { descricao: string } }) => { descriptions.push(q.data.descricao) } },
  })
  const mail = t.mock.method(proposalMail, 'send', async () => false)
  await assert.rejects(patchProposal(vendedor, 'p', { status: 'ENVIADA', canal: 'EMAIL' }), (e: unknown) => e instanceof CrmError && e.code === 'EMAIL_SEND_FAILED')
  assert.equal(row.status, 'ENVIADA')
  assert.equal(row.envioEmailStatus, 'FALHOU')
  assert.ok(descriptions.some(d => d.includes('Falha no envio')))
  mail.mock.mockImplementation(async () => true)
  const result = await patchProposal(vendedor, 'p', { status: 'ENVIADA', canal: 'EMAIL' })
  assert.equal(result.envioEmailStatus, 'ENVIADO')
  assert.ok(descriptions.some(d => d.includes('entrega ao destinatário não confirmada')))
  assert.equal(mail.mock.callCount(), 2)
  await assert.rejects(patchProposal(vendedor, 'p', { status: 'ENVIADA', canal: 'EMAIL' }), (e: unknown) => e instanceof CrmError && e.status === 409)
  assert.equal(mail.mock.callCount(), 2)
})
test('relatório separa cohort de criação e receita de fechamento no período, com carteira própria', async t => {
  const filters: Record<string, unknown>[] = []
  transaction(t, { lead: { findMany: async (q: { where: Record<string, unknown> }) => {
    filters.push(q.where)
    return 'criadoEm' in q.where ? [
      { etapa: 'GANHO', origem: 'SITE', responsavelId: 'seller-a', responsavel: { nome: 'A' }, criadoEm: new Date('2026-10-09T12:00Z') },
      { etapa: 'NOVO', origem: 'WHATSAPP', responsavelId: 'seller-a', responsavel: { nome: 'A' }, criadoEm: new Date('2026-10-09T12:00Z') },
    ] : [{ responsavelId: 'seller-a', responsavel: { nome: 'A' }, valorVenda: new Prisma.Decimal('12345.67') }]
  } } })
  const result = await reports(vendedor, '2026-10-09', '2026-10-10')
  assert.deepEqual(result.resumo, { leads: 2, ganhos: 1, perdidos: 0, conversao: 50, receita: 12345.67 })
  assert.equal(result.porDia[1]!.total, 0)
  for (const filter of filters) { assert.equal(filter.tenantId, 'tenant-a'); assert.equal(filter.responsavelId, 'seller-a') }
  assert.ok('criadoEm' in filters[0]!)
  assert.ok('fechadoEm' in filters[1]!)
})
test('retries de conflito serializável são limitados e não mascaram erro de domínio', async t => {
  let attempts = 0
  t.mock.method(crmTransactions, 'run', async () => {
    attempts++
    if (attempts < 3) throw new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })
    return 'ok'
  })
  assert.equal(await serializable(async () => 'unused'), 'ok')
  assert.equal(attempts, 3)
})
test('configuração pública em planos inferiores devolve vazio sem conexão de banco', async () => {
  assert.deepEqual(await publicConfig('tenant-a', 'PROFISSIONAL'), {})
  assert.deepEqual(await publicConfig('tenant-a', 'BASICO'), {})
})
