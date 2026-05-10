import { Request, Response } from 'express'
import * as favoritosService from './favoritos.service'

function getQueryString(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return undefined
}

export async function favoritar(req: Request, res: Response) {
  try {
    const { sessionId, veiculoId } = req.body
    if (!sessionId || !veiculoId) {
      res.status(400).json({ message: 'sessionId e veiculoId são obrigatórios' })
      return
    }

    const favorito = await favoritosService.favoritar(sessionId, veiculoId)
    res.status(201).json(favorito)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function desfavoritar(req: Request<{ veiculoId: string }>, res: Response) {
  try {
    const { sessionId } = req.body
    if (!sessionId) {
      res.status(400).json({ message: 'sessionId é obrigatório' })
      return
    }

    await favoritosService.desfavoritar(sessionId, req.params.veiculoId)
    res.status(204).send()
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

export async function listar(req: Request, res: Response) {
  try {
    const sessionId = getQueryString(req.query.sessionId)
    if (!sessionId) {
      res.status(400).json({ message: 'sessionId é obrigatório' })
      return
    }

    const veiculos = await favoritosService.listar(sessionId)
    res.json(veiculos)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
