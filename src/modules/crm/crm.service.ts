import { Resend } from 'resend'
import { prisma } from '../../lib/prisma'
import { Prisma } from '../../generated/prisma/client'
import { planoIncluiRecurso, type PlanoNome, type RecursoPlano } from '../../config/planos'
import { CrmError, ETAPAS, ORIGENS, fail, isClosed, sanitizeDados, validateLeadChange, validateProposalTransition, validateProposalValues, reportRange } from './crm.domain'
import type { ConfigInput, CreateLead, HistoryInput, ListQuery, PatchLead, ProposalInput, ProposalPatch } from './crm.schemas'

export type Context = { tenantId: string; userId: string; role: string; plano: PlanoNome }
type Tx = Prisma.TransactionClient
// Explicit transaction boundary also permits service tests without a live database.
export const crmTransactions = { run: prisma.$transaction.bind(prisma) }
export const proposalMail = {
  async send(input: { id: string; numero: number; email: string; proposal: ProposalRow }) {
    const p = input.proposal
    try {
      const response = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.EMAIL_FROM!, to: input.email, subject: `Proposta #${input.numero}`,
        text: `Proposta #${input.numero}\nVeículo: ${p.veiculo.marca} ${p.veiculo.modelo} ${p.veiculo.ano}\nValor: R$ ${Number(p.valor).toFixed(2)}\nEntrada: R$ ${Number(p.entrada ?? 0).toFixed(2)}\nTroca: ${p.trocaDescricao ?? 'Não informada'}\nValor da troca: R$ ${Number(p.trocaValor ?? 0).toFixed(2)}\nValidade: ${p.validadeEm.toISOString()}\n${p.observacoes ?? ''}`,
      }, { idempotencyKey: `crm-proposta-${input.id}` })
      return !response.error && !!response.data?.id
    } catch { return false }
  },
}
const personSelect = { id: true, nome: true } as const
export const vehicleSelect = { id: true, marca: true, modelo: true, ano: true, preco: true } as const
const proposalInclude = { veiculo: { select: vehicleSelect } } as const
const leadInclude = { responsavel: { select: personSelect }, veiculo: { select: vehicleSelect } } as const
const detailInclude = {
  ...leadInclude,
  historico: { orderBy: { criadoEm: 'desc' as const }, include: { autor: { select: personSelect } } },
  propostas: { orderBy: { criadoEm: 'desc' as const }, include: proposalInclude },
} as const
type LeadRow = Prisma.LeadGetPayload<{ include: typeof leadInclude }>
type DetailRow = Prisma.LeadGetPayload<{ include: typeof detailInclude }>
type ProposalRow = Prisma.PropostaGetPayload<{ include: typeof proposalInclude }>

export const scope = (ctx: Context): Prisma.LeadWhereInput => ({
  tenantId: ctx.tenantId, ...(ctx.role === 'VENDEDOR' ? { responsavelId: ctx.userId } : {}),
})
export function feature(ctx: Context, resource: RecursoPlano) {
  if (!planoIncluiRecurso(ctx.plano, resource)) fail(403, `O plano não inclui ${resource}`, 'PLAN_FEATURE_REQUIRED')
}
export function serializeProposal(row: ProposalRow) {
  return {
    id: row.id, numero: row.numero, status: row.status, leadId: row.leadId, veiculoId: row.veiculoId,
    valor: Number(row.valor), entrada: row.entrada === null ? null : Number(row.entrada),
    trocaDescricao: row.trocaDescricao, trocaValor: row.trocaValor === null ? null : Number(row.trocaValor),
    observacoes: row.observacoes, validadeEm: row.validadeEm, criadoEm: row.criadoEm,
    canal: row.canal, compartilhadaEm: row.compartilhadaEm, envioEmailStatus: row.envioEmailStatus, veiculo: row.veiculo,
  }
}
export function serializeLead(row: LeadRow | DetailRow, role: string, detail = false, legacy = false) {
  return {
    id: row.id, tipo: row.tipo, nome: row.nome, telefone: row.telefone, email: row.email,
    lido: row.lido, etapa: row.etapa, origem: row.origem, responsavelId: row.responsavelId,
    veiculoId: row.veiculoId, responsavel: row.responsavel, veiculo: row.veiculo,
    ultimoContatoEm: row.ultimoContatoEm, proximaAtividadeEm: row.proximaAtividadeEm,
    motivoPerda: row.motivoPerda, valorVenda: row.valorVenda === null ? null : Number(row.valorVenda),
    fechadoEm: row.fechadoEm, criadoEm: row.criadoEm, atualizadoEm: row.atualizadoEm,
    ...(legacy ? { tenantId: row.tenantId } : {}),
    ...(legacy || detail ? { dados: sanitizeDados(row.dados, role, row.tipo) } : {}),
    ...(detail && 'historico' in row ? {
      historico: row.historico.map(h => ({ id: h.id, tipo: h.tipo, descricao: h.descricao, criadoEm: h.criadoEm, autor: h.autor })),
      propostas: row.propostas.map(serializeProposal),
    } : {}),
  }
}

// No network side effects inside retryable transactions.
export async function serializable<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await crmTransactions.run(run, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }) }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
        if (attempt < 3) { await new Promise(resolve => setTimeout(resolve, 20 * 2 ** attempt)); continue }
        fail(409, 'Conflito concorrente. Atualize os dados e tente novamente', 'CONCURRENT_UPDATE')
      }
      throw error
    }
  }
}
async function loadLead(tx: Tx, ctx: Context, id: string) {
  const lead = await tx.lead.findFirst({ where: { ...scope(ctx), id } })
  if (!lead) fail(404, 'Lead não encontrado')
  return lead
}
async function availableVehicle(tx: Tx, tenantId: string, id: string) {
  const vehicle = await tx.veiculo.findFirst({ where: { id, tenantId, vendido: false }, select: vehicleSelect })
  if (!vehicle) fail(409, 'Veículo indisponível nesta revenda', 'VEHICLE_UNAVAILABLE')
  return vehicle
}
function history(tx: Tx, tenantId: string, leadId: string, tipo: string, descricao: string, autorId?: string) {
  return tx.historicoLead.create({ data: { tenantId, leadId, tipo, descricao, autorId }, include: { autor: { select: personSelect } } })
}
async function config(tx: Tx, tenantId: string) {
  return tx.configuracaoComercial.upsert({ where: { tenantId }, create: { tenantId }, update: {} })
}
async function autoAssignee(tx: Tx, tenantId: string) {
  const users = await tx.usuario.findMany({ where: { tenantId, role: 'VENDEDOR', ativo: true }, select: { id: true }, orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }] })
  if (!users.length) return null
  const counts = await tx.lead.groupBy({ by: ['responsavelId'], where: { tenantId, etapa: { notIn: ['GANHO', 'PERDIDO'] }, responsavelId: { in: users.map(u => u.id) } }, _count: { _all: true } })
  const workload = new Map(counts.map(c => [c.responsavelId, c._count._all]))
  return users.reduce((best, u) => (workload.get(u.id) ?? 0) < (workload.get(best.id) ?? 0) ? u : best).id
}

export async function createLead(tenantId: string, input: CreateLead, actor?: Context) {
  if (actor) { feature(actor, 'FUNIL_ATENDIMENTO'); if (actor.tenantId !== tenantId) fail(403, 'Revenda inválida') }
  return serializable(async tx => {
    // Re-read current plan in the transaction, including for public/legacy ingestion.
    const tenant = await tx.tenant.findFirst({ where: { id: tenantId, ativo: true }, select: { plano: true } })
    if (!tenant) fail(404, 'Revenda não encontrada')
    if (!planoIncluiRecurso(tenant.plano, 'LEADS')) fail(403, 'Plano não inclui LEADS', 'PLAN_FEATURE_REQUIRED')
    if (input.veiculoId) await availableVehicle(tx, tenantId, input.veiculoId)
    const settings = tenant.plano === 'PREMIUM' ? await config(tx, tenantId) : null
    const automatic = !!settings?.distribuicaoAutomatica && (!actor || actor.role === 'ADMIN')
    const responsavelId = automatic ? (await autoAssignee(tx, tenantId)) ?? actor?.userId ?? null : actor?.userId ?? null
    const due = settings?.retornoAutomaticoHoras != null ? new Date(Date.now() + settings.retornoAutomaticoHoras * 3600000) : null
    const lead = await tx.lead.create({ data: {
      tenantId, nome: input.nome, telefone: input.telefone, email: input.email,
      tipo: input.tipo, origem: input.origem, veiculoId: input.veiculoId, responsavelId,
      // CPF is not persisted even when submitted in arbitrary manual JSON.
      dados: sanitizeDados(input.dados ?? {}, 'ADMIN', input.tipo) as Prisma.InputJsonObject,
      proximaAtividadeEm: due,
    } })
    await history(tx, tenantId, lead.id, 'CRIACAO', actor ? 'Oportunidade criada manualmente' : 'Oportunidade recebida pelo formulário público', actor?.userId)
    if (responsavelId) await history(tx, tenantId, lead.id, 'ATRIBUICAO', automatic ? 'Responsável atribuído automaticamente por menor carteira aberta' : 'Responsável atribuído ao autor', actor?.userId)
    if (due) await history(tx, tenantId, lead.id, 'AUTOMACAO', `Retorno agendado automaticamente para ${due.toISOString()}`, actor?.userId)
    return tx.lead.findUniqueOrThrow({ where: { id: lead.id }, include: detailInclude })
  })
}

export async function listLeads(ctx: Context, query: ListQuery) {
  feature(ctx, 'FUNIL_ATENDIMENTO')
  const where: Prisma.LeadWhereInput = {
    ...scope(ctx), ...(query.etapa ? { etapa: query.etapa } : {}), ...(query.origem ? { origem: query.origem } : {}),
    ...(query.responsavelId ? { AND: [{ responsavelId: query.responsavelId }] } : {}),
    ...(query.busca ? { OR: ['nome', 'telefone', 'email'].map(field => ({ [field]: { contains: query.busca, mode: 'insensitive' } })) } : {}),
  }
  return crmTransactions.run(async tx => {
    const [items, total, grouped] = await Promise.all([
      tx.lead.findMany({ where, include: leadInclude, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      tx.lead.count({ where }), tx.lead.groupBy({ by: ['etapa'], where, _count: { _all: true } }),
    ])
    const etapas = Object.fromEntries(ETAPAS.map(etapa => [etapa, grouped.find(g => g.etapa === etapa)?._count._all ?? 0]))
    return { items: items.map(l => serializeLead(l, ctx.role)), total, page: query.page, pageSize: query.pageSize, etapas }
  }, { isolationLevel: 'RepeatableRead' })
}
export async function getLead(ctx: Context, id: string) {
  feature(ctx, 'FUNIL_ATENDIMENTO')
  const lead = await prisma.lead.findFirst({ where: { ...scope(ctx), id }, include: detailInclude })
  if (!lead) fail(404, 'Lead não encontrado')
  return serializeLead(lead, ctx.role, true)
}

async function closeSale(tx: Tx, ctx: Context, leadId: string, veiculoId: string, valorVenda: number) {
  const reserved = await tx.veiculo.updateMany({ where: { id: veiculoId, tenantId: ctx.tenantId, vendido: false }, data: { vendido: true } })
  if (reserved.count !== 1) fail(409, 'Veículo já vendido ou indisponível', 'VEHICLE_ALREADY_SOLD')
  await tx.lead.update({ where: { id: leadId }, data: { etapa: 'GANHO', veiculoId, valorVenda, fechadoEm: new Date(), proximaAtividadeEm: null, motivoPerda: null } })
}
export async function patchLead(ctx: Context, id: string, input: PatchLead) {
  feature(ctx, 'FUNIL_ATENDIMENTO')
  return serializable(async tx => {
    const lead = await loadLead(tx, ctx, id)
    const next = validateLeadChange(lead, input)
    if (input.responsavelId !== undefined && input.responsavelId !== lead.responsavelId) {
      if (ctx.role !== 'ADMIN') fail(403, 'Somente administrador pode alterar o responsável')
      // Professional admins can claim an unassigned public lead for themselves.
      if (!(lead.responsavelId === null && input.responsavelId === ctx.userId)) feature(ctx, 'DISTRIBUICAO_LEADS')
      if (input.responsavelId && !await tx.usuario.findFirst({ where: { id: input.responsavelId, tenantId: ctx.tenantId, ativo: true }, select: { id: true } })) fail(400, 'Responsável inválido ou inativo')
    }
    if (input.veiculoId && input.etapa !== 'GANHO') await availableVehicle(tx, ctx.tenantId, input.veiculoId)
    if (input.etapa === 'GANHO') await closeSale(tx, ctx, id, next.veiculoId!, Number(next.valorVenda))
    const { etapa, veiculoId, valorVenda, ...rest } = input
    await tx.lead.update({ where: { id }, data: {
      ...rest,
      ...(etapa === 'GANHO' ? {} : { etapa, veiculoId, valorVenda }),
      ...(etapa === 'GANHO' ? { proximaAtividadeEm: null, motivoPerda: null } : {}),
      ...(etapa === 'PERDIDO' ? { fechadoEm: new Date(), proximaAtividadeEm: null } : {}),
    } })
    if (input.etapa && input.etapa !== lead.etapa) await history(tx, ctx.tenantId, id, 'ETAPA', `Etapa alterada de ${lead.etapa} para ${input.etapa}`, ctx.userId)
    if (input.responsavelId !== undefined && input.responsavelId !== lead.responsavelId) await history(tx, ctx.tenantId, id, 'ATRIBUICAO', input.responsavelId ? 'Responsável alterado pelo administrador' : 'Responsável removido pelo administrador', ctx.userId)
    if (Object.keys(input).some(k => !['etapa', 'responsavelId'].includes(k))) await history(tx, ctx.tenantId, id, 'ATUALIZACAO', `Campos atualizados: ${Object.keys(input).filter(k => !['etapa', 'responsavelId'].includes(k)).join(', ')}`, ctx.userId)
    return serializeLead(await tx.lead.findUniqueOrThrow({ where: { id }, include: detailInclude }), ctx.role, true)
  })
}
export async function addHistory(ctx: Context, id: string, input: HistoryInput) {
  feature(ctx, 'FUNIL_ATENDIMENTO')
  return serializable(async tx => {
    const lead = await loadLead(tx, ctx, id)
    if (isClosed(lead.etapa) && (input.tipo !== 'NOTA' || input.proximaAtividadeEm !== undefined)) fail(409, 'Oportunidade encerrada aceita somente notas')
    await tx.lead.update({ where: { id }, data: {
      ...(input.tipo === 'CONTATO' ? { ultimoContatoEm: new Date() } : {}),
      ...(input.proximaAtividadeEm !== undefined ? { proximaAtividadeEm: input.proximaAtividadeEm } : {}),
    } })
    const h = await history(tx, ctx.tenantId, id, input.tipo, input.descricao, ctx.userId)
    return { id: h.id, tipo: h.tipo, descricao: h.descricao, criadoEm: h.criadoEm, autor: h.autor }
  })
}
export async function listUsers(ctx: Context) {
  feature(ctx, 'FUNIL_ATENDIMENTO')
  // Without distribution entitlement, the selector exposes only its own actor.
  return prisma.usuario.findMany({ where: { tenantId: ctx.tenantId, ativo: true, ...(ctx.role === 'VENDEDOR' || !planoIncluiRecurso(ctx.plano, 'DISTRIBUICAO_LEADS') ? { id: ctx.userId } : {}) }, select: { ...personSelect, role: true }, orderBy: { nome: 'asc' } })
}
export async function listVehicles(ctx: Context) {
  feature(ctx, 'FUNIL_ATENDIMENTO')
  return prisma.veiculo.findMany({ where: { tenantId: ctx.tenantId, vendido: false }, select: vehicleSelect, orderBy: [{ marca: 'asc' }, { modelo: 'asc' }] })
}
export async function createProposal(ctx: Context, id: string, input: ProposalInput) {
  feature(ctx, 'PROPOSTAS')
  if (input.trocaDescricao || input.trocaValor !== undefined) feature(ctx, 'AVALIACAO_TROCA')
  validateProposalValues(input)
  return serializable(async tx => {
    const lead = await loadLead(tx, ctx, id)
    if (isClosed(lead.etapa)) fail(409, 'Oportunidade encerrada')
    await availableVehicle(tx, ctx.tenantId, input.veiculoId)
    // A per-tenant counter avoids max()+1 races and is rolled back with the proposal.
    await config(tx, ctx.tenantId)
    const settings = await tx.configuracaoComercial.update({ where: { tenantId: ctx.tenantId }, data: { sequenciaProposta: { increment: 1 } } })
    const proposal = await tx.proposta.create({ data: { ...input, tenantId: ctx.tenantId, leadId: id, numero: settings.sequenciaProposta }, include: proposalInclude })
    const newStage = ['NOVO', 'CONTATO', 'QUALIFICADO'].includes(lead.etapa) ? 'PROPOSTA' : lead.etapa
    await tx.lead.update({ where: { id }, data: { etapa: newStage, veiculoId: input.veiculoId } })
    await history(tx, ctx.tenantId, id, 'PROPOSTA', `Proposta #${proposal.numero} criada (rascunho)`, ctx.userId)
    if (newStage !== lead.etapa) await history(tx, ctx.tenantId, id, 'ETAPA', `Etapa alterada de ${lead.etapa} para ${newStage}`, ctx.userId)
    return serializeProposal(proposal)
  })
}

export async function getProposal(ctx: Context, id: string) {
  feature(ctx, 'PROPOSTAS')
  const proposal = await prisma.proposta.findFirst({ where: { id, tenantId: ctx.tenantId, lead: scope(ctx) }, include: { ...proposalInclude, lead: { select: { nome: true, email: true } }, tenant: { select: { nome: true, whatsapp: true } } } })
  if (!proposal) fail(404, 'Proposta não encontrada')
  return proposal
}
export async function patchProposal(ctx: Context, id: string, input: ProposalPatch) {
  feature(ctx, 'PROPOSTAS')
  const canal = input.canal ?? 'MANUAL'
  const emailRequested = input.status === 'ENVIADA' && canal === 'EMAIL'
  const result = await serializable(async tx => {
    const proposal = await tx.proposta.findFirst({ where: { id, tenantId: ctx.tenantId, lead: scope(ctx) }, include: { ...proposalInclude, lead: true } })
    if (!proposal) fail(404, 'Proposta não encontrada')
    if (isClosed(proposal.lead.etapa)) fail(409, 'Oportunidade encerrada')
    const staleEmail = proposal.envioEmailStatus === 'PENDENTE' && !!proposal.compartilhadaEm && Date.now() - proposal.compartilhadaEm.getTime() >= 5 * 60000
    const retryEmail = emailRequested && proposal.status === 'ENVIADA' && (proposal.envioEmailStatus === 'FALHOU' || staleEmail)
    if (!retryEmail) validateProposalTransition(proposal.status, input.status, proposal.validadeEm)
    if (emailRequested) {
      if (!proposal.lead.email) fail(400, 'Lead sem endereço de email')
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) fail(503, 'Envio de email não configurado', 'EMAIL_NOT_CONFIGURED')
    }
    if (input.status === 'ACEITA') {
      await closeSale(tx, ctx, proposal.leadId, proposal.veiculoId, Number(proposal.valor))
      await history(tx, ctx.tenantId, proposal.leadId, 'ETAPA', `Etapa alterada de ${proposal.lead.etapa} para GANHO pela proposta #${proposal.numero}`, ctx.userId)
      // Alternative drafts can no longer be accepted after closing this opportunity.
      const alternatives = await tx.proposta.updateMany({ where: { tenantId: ctx.tenantId, leadId: proposal.leadId, id: { not: id }, status: { in: ['RASCUNHO', 'ENVIADA'] } }, data: { status: 'RECUSADA' } })
      if (alternatives.count) await history(tx, ctx.tenantId, proposal.leadId, 'PROPOSTA', `${alternatives.count} proposta(s) alternativa(s) recusada(s) automaticamente pelo fechamento`, ctx.userId)
    }
    if (input.status === 'ENVIADA') await availableVehicle(tx, ctx.tenantId, proposal.veiculoId)
    const updated = await tx.proposta.update({ where: { id }, data: {
      status: input.status,
      ...(input.status === 'ENVIADA' ? { canal, compartilhadaEm: new Date(), ...(emailRequested ? { envioEmailStatus: 'PENDENTE' } : {}) } : {}),
    }, include: proposalInclude })
    await history(tx, ctx.tenantId, proposal.leadId, 'PROPOSTA', input.status === 'ENVIADA'
      ? `Compartilhamento da proposta #${proposal.numero} registrado pelo operador via ${canal}${retryEmail ? ' (nova tentativa de email)' : ''}; entrega não confirmada`
      : `Proposta #${proposal.numero} ${input.status.toLowerCase()}`, ctx.userId)
    return { proposal: updated, email: proposal.lead.email }
  })
  if (emailRequested) {
    const sent = await proposalMail.send({ id, numero: result.proposal.numero, email: result.email!, proposal: result.proposal })
    await serializable(async tx => {
      // A late provider response must not overwrite the outcome of a newer lease.
      const finalized = await tx.proposta.updateMany({ where: { id, tenantId: ctx.tenantId, envioEmailStatus: 'PENDENTE', compartilhadaEm: result.proposal.compartilhadaEm }, data: { envioEmailStatus: sent ? 'ENVIADO' : 'FALHOU' } })
      if (finalized.count) await history(tx, ctx.tenantId, result.proposal.leadId, 'EMAIL', sent ? 'Email aceito pelo provedor; entrega ao destinatário não confirmada' : 'Falha no envio de email; nova tentativa disponível', ctx.userId)
    })
    if (!sent) throw new CrmError(502, 'Compartilhamento registrado, mas o email falhou. Repita ENVIADA com canal EMAIL para tentar novamente', 'EMAIL_SEND_FAILED')
    result.proposal.envioEmailStatus = 'ENVIADO'
  }
  return serializeProposal(result.proposal)
}

type ConfigValue = { distribuicaoAutomatica: boolean; retornoAutomaticoHoras: number | null; diasEstoqueAlerta: number; diasSemContatoAlerta: number; nomeExibicao: string | null; corPrimaria: string | null; logoUrl: string | null; mensagemHero: string | null }
const configDefaults: ConfigValue = { distribuicaoAutomatica: false, retornoAutomaticoHoras: 24, diasEstoqueAlerta: 60, diasSemContatoAlerta: 2, nomeExibicao: null, corPrimaria: null, logoUrl: null, mensagemHero: null }
function serializeConfig(value: ConfigValue) {
  return { distribuicaoAutomatica: value.distribuicaoAutomatica, retornoAutomaticoHoras: value.retornoAutomaticoHoras,
    diasEstoqueAlerta: value.diasEstoqueAlerta, diasSemContatoAlerta: value.diasSemContatoAlerta,
    personalizacao: { nomeExibicao: value.nomeExibicao, corPrimaria: value.corPrimaria, logoUrl: value.logoUrl, mensagemHero: value.mensagemHero } }
}
function configAccess(ctx: Context) { feature(ctx, 'AUTOMACOES_COMERCIAIS'); if (ctx.role !== 'ADMIN') fail(403, 'Somente administrador pode configurar o CRM') }
export async function getConfig(ctx: Context) {
  configAccess(ctx)
  return serializeConfig(await prisma.configuracaoComercial.findUnique({ where: { tenantId: ctx.tenantId } }) ?? configDefaults)
}
export async function putConfig(ctx: Context, input: ConfigInput) {
  configAccess(ctx)
  const { personalizacao, ...settings } = input
  const data = { ...settings, ...personalizacao }
  const value = await prisma.configuracaoComercial.upsert({ where: { tenantId: ctx.tenantId }, create: { tenantId: ctx.tenantId, ...data }, update: data })
  return serializeConfig(value)
}
export async function publicConfig(tenantId: string, plano: PlanoNome) {
  if (!planoIncluiRecurso(plano, 'PERSONALIZACAO_AVANCADA')) return {}
  const value = await prisma.configuracaoComercial.findUnique({ where: { tenantId }, select: { nomeExibicao: true, corPrimaria: true, logoUrl: true, mensagemHero: true } })
  return { personalizacao: value ?? { nomeExibicao: null, corPrimaria: null, logoUrl: null, mensagemHero: null } }
}

export async function alerts(ctx: Context) {
  feature(ctx, 'AUTOMACOES_COMERCIAIS')
  const settings = await prisma.configuracaoComercial.findUnique({ where: { tenantId: ctx.tenantId } }) ?? configDefaults
  const now = new Date(), oldStock = new Date(now.getTime() - settings.diasEstoqueAlerta * 86400000), oldContact = new Date(now.getTime() - settings.diasSemContatoAlerta * 86400000)
  const [stock, activities, noContact] = await Promise.all([
    prisma.veiculo.findMany({ where: { tenantId: ctx.tenantId, vendido: false, criadoEm: { lte: oldStock } }, select: { ...vehicleSelect, criadoEm: true }, orderBy: { criadoEm: 'asc' }, take: 100 }),
    prisma.lead.findMany({ where: { ...scope(ctx), etapa: { notIn: ['GANHO', 'PERDIDO'] }, proximaAtividadeEm: { lte: now } }, select: { id: true, nome: true, telefone: true, responsavel: { select: personSelect }, proximaAtividadeEm: true }, orderBy: { proximaAtividadeEm: 'asc' }, take: 100 }),
    prisma.lead.findMany({ where: { ...scope(ctx), etapa: { notIn: ['GANHO', 'PERDIDO'] }, OR: [{ ultimoContatoEm: { lte: oldContact } }, { ultimoContatoEm: null, criadoEm: { lte: oldContact } }] }, select: { id: true, nome: true, criadoEm: true }, orderBy: { criadoEm: 'asc' }, take: 100 }),
  ])
  return { estoque: stock.map(v => ({ id: v.id, marca: v.marca, modelo: v.modelo, ano: v.ano, diasEmEstoque: Math.floor((now.getTime() - v.criadoEm.getTime()) / 86400000), motivos: [`Estoque há pelo menos ${settings.diasEstoqueAlerta} dias`] })), atividades: activities, semContato: noContact }
}

export async function reports(ctx: Context, inicio: string, fim: string) {
  feature(ctx, 'RELATORIOS_CONVERSAO')
  const range = reportRange(inicio, fim), dateFilter = { gte: range.start, lt: range.endExclusive }
  return crmTransactions.run(async tx => {
    const [cohort, sales] = await Promise.all([
      tx.lead.findMany({ where: { ...scope(ctx), criadoEm: dateFilter }, select: { etapa: true, origem: true, responsavelId: true, responsavel: { select: personSelect }, criadoEm: true } }),
      tx.lead.findMany({ where: { ...scope(ctx), etapa: 'GANHO', fechadoEm: dateFilter }, select: { responsavelId: true, responsavel: { select: personSelect }, valorVenda: true } }),
    ])
    const conversion = (wins: number, total: number) => total ? Math.round(wins / total * 10000) / 100 : 0
    const moneySum = (values: typeof sales) => Math.round(values.reduce((sum, s) => sum + Number(s.valorVenda ?? 0), 0) * 100) / 100
    const won = cohort.filter(l => l.etapa === 'GANHO').length
    const sellers = new Map<string | null, { id: string | null; nome: string; total: number; ganhos: number; receita: number; conversao: number }>()
    const seller = (id: string | null, nome?: string) => {
      if (!sellers.has(id)) sellers.set(id, { id, nome: nome ?? 'Sem responsável', total: 0, ganhos: 0, receita: 0, conversao: 0 })
      return sellers.get(id)!
    }
    for (const lead of cohort) { const row = seller(lead.responsavelId, lead.responsavel?.nome); row.total++; if (lead.etapa === 'GANHO') row.ganhos++ }
    for (const sale of sales) seller(sale.responsavelId, sale.responsavel?.nome).receita += Number(sale.valorVenda ?? 0)
    const daily = new Map<string, { data: string; total: number; ganhos: number }>()
    for (let day = range.start.getTime(); day < range.endExclusive.getTime(); day += 86400000) { const data = new Date(day).toISOString().slice(0, 10); daily.set(data, { data, total: 0, ganhos: 0 }) }
    for (const lead of cohort) { const row = daily.get(lead.criadoEm.toISOString().slice(0, 10))!; row.total++; if (lead.etapa === 'GANHO') row.ganhos++ }
    return {
      periodo: { inicio, fim }, resumo: { leads: cohort.length, ganhos: won, perdidos: cohort.filter(l => l.etapa === 'PERDIDO').length, conversao: conversion(won, cohort.length), receita: moneySum(sales) },
      porOrigem: ORIGENS.map(origem => { const leads = cohort.filter(l => l.origem === origem), ganhos = leads.filter(l => l.etapa === 'GANHO').length; return { origem, total: leads.length, ganhos, conversao: conversion(ganhos, leads.length) } }),
      porVendedor: [...sellers.values()].map(row => ({ ...row, receita: Math.round(row.receita * 100) / 100, conversao: conversion(row.ganhos, row.total) })),
      porEtapa: ETAPAS.map(etapa => ({ etapa, total: cohort.filter(l => l.etapa === etapa).length })), porDia: [...daily.values()],
    }
  }, { isolationLevel: 'RepeatableRead' })
}

// Legacy endpoints keep their array/toggle contract, with the same seller isolation.
export async function legacyList(ctx: Context, tipo?: 'VENDER_CARRO' | 'FINANCIAMENTO' | 'INTERESSE') {
  feature(ctx, 'LEADS')
  const leads = await prisma.lead.findMany({ where: { ...scope(ctx), ...(tipo ? { tipo } : {}) }, include: leadInclude, orderBy: { criadoEm: 'desc' } })
  return leads.map(l => serializeLead(l, ctx.role, false, true))
}
export async function legacyToggle(ctx: Context, id: string) {
  feature(ctx, 'LEADS')
  return serializable(async tx => {
    const lead = await loadLead(tx, ctx, id)
    const updated = await tx.lead.update({ where: { id }, data: { lido: !lead.lido }, include: leadInclude })
    return serializeLead(updated, ctx.role, false, true)
  })
}
