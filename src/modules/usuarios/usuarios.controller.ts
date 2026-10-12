import { Request, Response, NextFunction } from 'express'
import { LimitePlanoError } from '../../errors/planos'
import { parseOrRespond } from '../../validation'
import { usuarioSchema, usuarioAtivoSchema } from './usuarios.schemas'
import * as usuariosService from './usuarios.service'
import { UsuarioPolicyError } from './usuarios.policies'

type IdParams = { id: string }

export async function listar(req: Request, res: Response) {
  res.json(await usuariosService.listar(req.tenantId))
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  const body = parseOrRespond(usuarioSchema, req.body, res)
  if (!body) return

  try {
    res.status(201).json(await usuariosService.criar(body, req.tenantId, req.tenantPlano))
  } catch (error) {
    if (error instanceof LimitePlanoError) {
      res.status(error.status).json({
        code: error.code,
        message: error.message,
        plano: error.plano,
        limite: error.limite,
      })
      return
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ code: 'P2002', message: 'Já existe um usuário com este email' })
      return
    }
    next(error)
  }
}

export async function remover(req: Request<IdParams>, res: Response, next: NextFunction) {
  try {
    await usuariosService.remover(req.params.id, req.tenantId, req.userId)
    res.status(204).send()
  } catch (error) {
    if (error instanceof UsuarioPolicyError) {
      res.status(400).json({ message: error.message })
      return
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
      res.status(409).json({ code: 'COMMERCIAL_HISTORY', message: 'Este usuário possui vínculos no histórico comercial e não pode ser excluído. Desative a conta para revogar o acesso preservando os registros.' })
      return
    }
    next(error)
  }
}

export async function alterarAtivo(req: Request<IdParams>, res: Response, next: NextFunction) {
  const body = parseOrRespond(usuarioAtivoSchema, req.body, res)
  if (!body) return
  try { res.json(await usuariosService.alterarAtivo(req.params.id, req.tenantId, req.userId, body.ativo)) }
  catch (error) {
    if (error instanceof UsuarioPolicyError) { res.status(400).json({ message: error.message }); return }
    next(error)
  }
}
