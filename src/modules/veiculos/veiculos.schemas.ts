import { z } from 'zod'

const currentYear = new Date().getFullYear()

export const vehicleSchema = z.object({
  marca: z.string().trim().min(1).max(80),
  modelo: z.string().trim().min(1).max(120),
  ano: z.number().int().min(1886).max(currentYear + 1),
  preco: z.number().finite().nonnegative().max(100_000_000),
  km: z.number().int().nonnegative().max(10_000_000),
  combustivel: z.enum(['GASOLINA', 'ETANOL', 'FLEX', 'DIESEL', 'ELETRICO', 'HIBRIDO']),
  cambio: z.enum(['MANUAL', 'AUTOMATICO', 'CVT']),
  cor: z.string().trim().min(1).max(50),
  descricao: z.string().trim().max(5000).optional(),
}).strict()

export const vehicleUpdateSchema = vehicleSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'Informe ao menos um campo para atualizar' }
)

export type VehicleInput = z.infer<typeof vehicleSchema>
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>
