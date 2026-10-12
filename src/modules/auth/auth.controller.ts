import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from './auth.service'
import { parseOrRespond } from '../../validation'

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  senha: z.string().min(8).max(128),
}).strict()

export async function login(req: Request, res: Response, next: NextFunction) {
  const body = parseOrRespond(loginSchema, req.body, res)
  if (!body) return

  try {
    const resultado = await authService.login(body.email, body.senha, req.tenantId)
    res.json(resultado)
  } catch (error) {
    if (error instanceof authService.CredenciaisInvalidasError) {
      res.status(401).json({ message: 'Credenciais inválidas' })
      return
    }
    next(error)
  }
}

export function me(req: Request, res: Response) {
  res.json({ usuario: req.authUsuario })
}
