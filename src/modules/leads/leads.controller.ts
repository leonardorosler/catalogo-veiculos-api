import { Request, Response } from 'express'
import * as leadsService from './leads.service'
import { parseOrRespond } from '../../validation'
import { financeLeadSchema, sellCarLeadSchema } from './leads.schemas'
import { context, respondError } from '../crm/crm.routes'
import { interestSchema } from '../crm/crm.schemas'
import { createLead, serializeLead } from '../crm/crm.service'

type TipoLead = 'VENDER_CARRO' | 'FINANCIAMENTO' | 'INTERESSE'
type IdParams = { id: string }

export async function venderCarro(req: Request, res: Response) {
  const body = parseOrRespond(sellCarLeadSchema, req.body, res)
  if (!body) return

  try {
    const { nome, telefone, email, ...dados } = body
    const lead = await leadsService.criarLeadVenderCarro(req.tenantId, nome, telefone, email, dados)
    res.status(201).json(lead)
  } catch (error) {
    respondError(error, res)
  }
}

export async function financiamento(req: Request, res: Response) {
  const body = parseOrRespond(financeLeadSchema, req.body, res)
  if (!body) return

  try {
    const { nome, telefone, email, cpf: _cpf, ...dados } = body
    const lead = await leadsService.criarLeadFinanciamento(req.tenantId, nome, telefone, email, dados)
    res.status(201).json(lead)
  } catch (error) {
    respondError(error, res)
  }
}

export async function listarLeads(req: Request, res: Response) {
  try {
    const tipo = req.query.tipo as TipoLead | undefined
    if (tipo && !['VENDER_CARRO', 'FINANCIAMENTO', 'INTERESSE'].includes(tipo)) {
      res.status(400).json({ message: 'Tipo de lead inválido' })
      return
    }
    res.json(await leadsService.listarLeads(context(req), tipo))
  } catch (error) {
    respondError(error, res)
  }
}

export async function marcarLido(req: Request<IdParams>, res: Response) {
  try {
    res.json(await leadsService.marcarLido(req.params.id, context(req)))
  } catch (error) {
    respondError(error, res)
  }
}

export async function interesse(req: Request, res: Response) {
  try {
    const input = interestSchema.parse(req.body)
    const lead = await createLead(req.tenantId, { ...input, tipo: 'INTERESSE' })
    res.status(201).json(serializeLead(lead, 'PUBLIC'))
  } catch (error) { respondError(error, res) }
}
