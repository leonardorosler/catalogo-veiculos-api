import { Request, Response } from 'express'
import * as favoritosService from './favoritos.service'
import { z } from 'zod'
import { idSchema, parseOrRespond, sessionIdSchema } from '../../validation'

const favoriteSchema = z.object({
  sessionId: sessionIdSchema,
  veiculoId: idSchema,
}).strict()

const sessionSchema = z.object({ sessionId: sessionIdSchema }).strict()

function getQueryString(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return undefined
}

export async function favoritar(req: Request, res: Response) {
  const body = parseOrRespond(favoriteSchema, req.body, res)
  if (!body) return

  try {
    const favorito = await favoritosService.favoritar(body.sessionId, body.veiculoId, req.tenantId)
    res.status(201).json(favorito)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function desfavoritar(req: Request<{ veiculoId: string }>, res: Response) {
  const body = parseOrRespond(sessionSchema, req.body, res)
  const veiculoId = parseOrRespond(idSchema, req.params.veiculoId, res)
  if (!body || !veiculoId) return

  try {
    await favoritosService.desfavoritar(body.sessionId, veiculoId, req.tenantId)
    res.status(204).send()
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

export async function listar(req: Request, res: Response) {
  const sessionId = parseOrRespond(sessionIdSchema, getQueryString(req.query.sessionId), res)
  if (!sessionId) return

  try {
    const veiculos = await favoritosService.listar(sessionId, req.tenantId)
    res.json(veiculos)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
