import { z } from 'zod'
import { ETAPAS, ORIGENS } from './crm.domain'

const text = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\0\r\n]/.test(v), 'Caracteres inválidos')
const longText = z.string().trim().min(1).max(4000).refine(v => !v.includes('\0'), 'Caracteres inválidos')
const id = text(100)
const date = z.string().datetime({ offset: true }).transform(v => new Date(v))
const money = z.number().finite().min(0).max(999999999999.99).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, 'Use até duas casas decimais')
const contact = {
  nome: text(120),
  telefone: z.string().trim().min(8).max(20).regex(/^\+?[\d\s()-]+$/),
  email: z.string().trim().email().max(254).optional(),
}
export const createLeadSchema = z.object({
  ...contact, tipo: z.enum(['VENDER_CARRO', 'FINANCIAMENTO', 'INTERESSE']).default('INTERESSE'),
  origem: z.enum(ORIGENS), veiculoId: id.optional(),
  dados: z.record(z.string(), z.json()).optional(),
}).strict()
export const interestSchema = z.object({ ...contact, veiculoId: id, origem: z.enum(['SITE', 'WHATSAPP']) }).strict()
export const patchLeadSchema = z.object({
  nome: contact.nome.optional(), telefone: contact.telefone.optional(), email: contact.email.nullable(),
  etapa: z.enum(ETAPAS).optional(), responsavelId: id.nullable().optional(), veiculoId: id.nullable().optional(),
  proximaAtividadeEm: date.nullable().optional(), motivoPerda: longText.nullable().optional(),
  valorVenda: money.positive().nullable().optional(),
}).strict().refine(v => Object.keys(v).length > 0, 'Informe pelo menos um campo')
export const listSchema = z.object({
  busca: text(120).optional(), etapa: z.enum(ETAPAS).optional(), origem: z.enum(ORIGENS).optional(),
  responsavelId: id.optional(), page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict()
export const historySchema = z.object({
  tipo: z.enum(['NOTA', 'CONTATO', 'ATIVIDADE']), descricao: longText,
  proximaAtividadeEm: date.nullable().optional(),
}).strict()
export const proposalSchema = z.object({
  veiculoId: id, valor: money.positive(), entrada: money.optional(), trocaDescricao: longText.optional(),
  trocaValor: money.optional(), observacoes: longText.optional(), validadeEm: date,
}).strict()
export const proposalPatchSchema = z.object({
  status: z.enum(['ENVIADA', 'ACEITA', 'RECUSADA']), canal: z.enum(['WHATSAPP', 'EMAIL', 'MANUAL']).optional(),
}).strict().refine(v => v.status === 'ENVIADA' || !v.canal, 'Canal permitido apenas para compartilhamento')
const personalization = z.object({
  nomeExibicao: text(120).nullable().optional(), corPrimaria: z.string().regex(/^#[\da-fA-F]{6}$/).nullable().optional(),
  logoUrl: z.string().url().max(2048).refine(v => { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password }, 'Use URL HTTPS sem credenciais').nullable().optional(),
  mensagemHero: z.string().trim().min(1).max(300).refine(v => !v.includes('\0'), 'Caracteres inválidos').nullable().optional(),
}).strict()
export const configSchema = z.object({
  distribuicaoAutomatica: z.boolean(), retornoAutomaticoHoras: z.number().int().min(1).max(8760).nullable(),
  diasEstoqueAlerta: z.number().int().min(1).max(3650), diasSemContatoAlerta: z.number().int().min(1).max(365),
  personalizacao: personalization,
}).strict()
export type CreateLead = z.infer<typeof createLeadSchema>
export type PatchLead = z.infer<typeof patchLeadSchema>
export type ListQuery = z.infer<typeof listSchema>
export type HistoryInput = z.infer<typeof historySchema>
export type ProposalInput = z.infer<typeof proposalSchema>
export type ProposalPatch = z.infer<typeof proposalPatchSchema>
export type ConfigInput = z.infer<typeof configSchema>
