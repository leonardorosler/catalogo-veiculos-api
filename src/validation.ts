import type { Response } from 'express'
import { z } from 'zod'

export function parseOrRespond<T>(schema: z.ZodType<T>, value: unknown, res: Response): T | undefined {
  const result = schema.safeParse(value)
  if (result.success) return result.data

  res.status(400).json({
    message: 'Dados inválidos',
    errors: result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  })
  return undefined
}

export const idSchema = z.string().trim().min(1).max(64)
export const sessionIdSchema = z.string().uuid()
