import { Request, Response } from 'express'
import * as leadsService from './leads.service'
type TipoLead = 'VENDER_CARRO' | 'FINANCIAMENTO'
type IdParams = {
  id: string
}

export async function venderCarro(req: Request, res: Response) {
  try {
    const { nome, telefone, email, ...dados } = req.body
    if (!nome || !telefone || !dados.marca || !dados.modelo || !dados.ano || !dados.km || !dados.condicao) {
      res.status(400).json({ message: 'Preencha todos os campos obrigatórios' })
      return
    }
    const lead = await leadsService.criarLeadVenderCarro(req.tenantId, nome, telefone, email, dados)
    res.status(201).json(lead)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function financiamento(req: Request, res: Response) {
  try {
    const { nome, telefone, email, ...dados } = req.body
    if (!nome || !telefone || !dados.veiculoInteresse || !dados.valorEntrada || !dados.prazo) {
      res.status(400).json({ message: 'Preencha todos os campos obrigatórios' })
      return
    }
    const lead = await leadsService.criarLeadFinanciamento(req.tenantId, nome, telefone, email, dados)
    res.status(201).json(lead)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function listarLeads(req: Request, res: Response) {
  try {
    const tipo = req.query.tipo as TipoLead | undefined
    const leads = await leadsService.listarLeads(req.tenantId, tipo)
    res.json(leads)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function marcarLido(req: Request<IdParams>, res: Response) {
  try {
    const lead = await leadsService.marcarLido(req.params.id, req.tenantId)
    res.json(lead)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}
