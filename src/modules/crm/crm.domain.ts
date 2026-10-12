export const ETAPAS = ['NOVO', 'CONTATO', 'QUALIFICADO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO'] as const
export const ORIGENS = ['SITE', 'WHATSAPP', 'INDICACAO', 'OUTRO'] as const
export type Etapa = typeof ETAPAS[number]
export class CrmError extends Error {
  constructor(public status: number, message: string, public code = 'CRM_ERROR') { super(message) }
}
export function fail(status: number, message: string, code?: string): never { throw new CrmError(status, message, code) }
export const isClosed = (etapa: string) => etapa === 'GANHO' || etapa === 'PERDIDO'

export function validateLeadChange(current: { etapa: Etapa; veiculoId: string | null; valorVenda: unknown; motivoPerda: string | null }, patch: {
  etapa?: Etapa; veiculoId?: string | null; valorVenda?: number | null; motivoPerda?: string | null
}) {
  if (isClosed(current.etapa)) fail(409, 'Oportunidade encerrada não pode ser alterada', 'LEAD_CLOSED')
  const next = { ...current, ...patch }
  if (next.etapa === 'GANHO' && (!next.veiculoId || !Number.isFinite(Number(next.valorVenda)) || Number(next.valorVenda) <= 0)) {
    fail(400, 'Para fechar como GANHO informe veículo e valorVenda positivo')
  }
  if (next.etapa === 'PERDIDO' && !next.motivoPerda?.trim()) fail(400, 'Informe o motivo da perda')
  return next
}

export function validateProposalValues(value: { valor: number; entrada?: number | null; trocaValor?: number | null; trocaDescricao?: string | null; validadeEm: Date }, now = new Date()) {
  const amounts = [value.valor, value.entrada ?? 0, value.trocaValor ?? 0]
  if (amounts.some(n => !Number.isFinite(n) || n < 0) || value.valor <= 0) fail(400, 'Valores monetários inválidos')
  if (Math.round((amounts[1]! + amounts[2]!) * 100) > Math.round(value.valor * 100)) fail(400, 'Entrada e troca não podem exceder o valor da proposta')
  if (value.trocaValor && !value.trocaDescricao?.trim()) fail(400, 'Informe a descrição do veículo de troca')
  if (!Number.isFinite(value.validadeEm.getTime()) || value.validadeEm <= now) fail(400, 'A validade deve ser futura')
}

export function validateProposalTransition(current: string, next: string, validadeEm: Date, now = new Date()) {
  if (current === 'ACEITA' || current === 'RECUSADA') fail(409, 'Proposta encerrada', 'PROPOSAL_CLOSED')
  if (next === 'ACEITA' && validadeEm <= now) fail(409, 'Proposta expirada', 'PROPOSAL_EXPIRED')
  if (current === next) fail(409, 'Status já registrado', 'PROPOSAL_STATUS_CONFLICT')
}

export function reportRange(inicio: string, fim: string) {
  const parse = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) fail(400, 'Use datas YYYY-MM-DD')
    const date = new Date(`${s}T00:00:00.000Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== s) fail(400, 'Data inválida')
    return date
  }
  const start = parse(inicio), end = parse(fim)
  if (end < start) fail(400, 'fim deve ser igual ou posterior a inicio')
  if ((end.getTime() - start.getTime()) / 86400000 > 365) fail(400, 'Período máximo de 366 dias')
  return { inicio, fim, start, endExclusive: new Date(end.getTime() + 86400000) }
}

export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

// Lists never expose legacy JSON/CPF. Sales staff receive no arbitrary financial JSON,
// including historical records that may predate the current ingestion schemas.
export function sanitizeDados(value: unknown, role: string, tipo: string): unknown {
  if (role === 'VENDEDOR') {
    if (tipo !== 'VENDER_CARRO' || !value || typeof value !== 'object' || Array.isArray(value)) return {}
    value = Object.fromEntries(Object.entries(value).filter(([key, v]) => ['marca', 'modelo', 'ano', 'km', 'condicao', 'observacoes'].includes(key) && typeof v === 'string'))
  }
  const clean = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(clean)
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input)
      .filter(([key]) => !/cpf|cnpj|documento|senha|password/i.test(key)).map(([key, v]) => [key, clean(v)]))
    return input
  }
  return clean(value)
}
