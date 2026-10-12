import { z } from 'zod'

export const usuarioSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  senha: z.string().min(8).max(128),
  role: z.enum(['ADMIN', 'VENDEDOR']).default('VENDEDOR'),
}).strict()

export type UsuarioInput = z.infer<typeof usuarioSchema>
export const usuarioAtivoSchema = z.object({ ativo: z.boolean() }).strict()
