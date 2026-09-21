import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max).refine(
  value => !/[\r\n\0]/.test(value),
  'Caracteres inválidos'
)
const optionalText = (max: number) => z.string().trim().max(max).optional()
const optionalEmail = z.union([z.string().trim().email().max(254), z.literal('')])
  .optional()
  .transform(value => value || undefined)

const contactFields = {
  nome: text(120),
  telefone: z.string().trim().min(8).max(20).refine(value => /^\+?[\d\s()-]+$/.test(value), 'Telefone inválido'),
  email: optionalEmail,
}

export const sellCarLeadSchema = z.object({
  ...contactFields,
  marca: text(80),
  modelo: text(120),
  ano: z.string().trim().regex(/^\d{4}$/, 'Ano inválido'),
  km: z.string().trim().regex(/^\d{1,8}$/, 'Quilometragem inválida'),
  condicao: z.enum(['Excelente', 'Bom', 'Regular']),
  observacoes: optionalText(2000),
}).strict()

export const financeLeadSchema = z.object({
  ...contactFields,
  cpf: z.string().trim().max(14).optional(),
  veiculoInteresse: text(160),
  valorEntrada: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Valor de entrada inválido'),
  prazo: z.enum(['12', '24', '36', '48', '60']),
  rendaMensal: z.union([z.string().trim().regex(/^\d+(\.\d{1,2})?$/), z.literal('')]).optional(),
}).strict()

export type SellCarLeadInput = z.infer<typeof sellCarLeadSchema>
export type FinanceLeadInput = z.infer<typeof financeLeadSchema>
