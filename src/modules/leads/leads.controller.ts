import { Request, Response } from 'express'
import * as leadsService from './leads.service'
import { parseOrRespond } from '../../validation'
import { financeLeadSchema, sellCarLeadSchema } from './leads.schemas'

type TipoLead = 'VENDER_CARRO' | 'FINANCIAMENTO'
type IdParams = { id: string }

export async function venderCarro(req: Request, res: Response) {
  const body = parseOrRespond(sellCarLeadSchema, req.body, res)
  if (!body) return

  try {
    const { nome, telefone, email, ...dados } = body
    const lead = await leadsService.criarLeadVenderCarro(req.tenantId, nome, telefone, email, dados)
    res.status(201).json(lead)
  } catch {
    res.status(500).json({ message: 'Não foi possível registrar a solicitação' })
  }
}

export async function financiamento(req: Request, res: Response) {
  const body = parseOrRespond(financeLeadSchema, req.body, res)
  if (!body) return

  try {
    const { nome, telefone, email, cpf: _cpf, ...dados } = body
    const lead = await leadsService.criarLeadFinanciamento(req.tenantId, nome, telefone, email, dados)
    res.status(201).json(lead)
  } catch {
    res.status(500).json({ message: 'Não foi possível registrar a solicitação' })
  }
}

export async function listarLeads(req: Request, res: Response) {
  try {
    const tipo = req.query.tipo as TipoLead | undefined
    if (tipo && !['VENDER_CARRO', 'FINANCIAMENTO'].includes(tipo)) {
      res.status(400).json({ message: 'Tipo de lead inválido' })
      return
    }
    res.json(await leadsService.listarLeads(req.tenantId, tipo))
  } catch {
    res.status(500).json({ message: 'Não foi possível listar os leads' })
  }
}

export async function marcarLido(req: Request<IdParams>, res: Response) {
  try {
    res.json(await leadsService.marcarLido(req.params.id, req.tenantId))
  } catch {
    res.status(404).json({ message: 'Lead não encontrado' })
  }
}
