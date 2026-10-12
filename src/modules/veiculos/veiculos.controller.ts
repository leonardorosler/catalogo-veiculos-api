import { Request, Response } from 'express'
import type { CambioType, CombustivelType } from '../../lib/prisma-client'
import * as veiculosService from './veiculos.service'
import { parseOrRespond } from '../../validation'
import { vehicleSchema, vehicleUpdateSchema } from './veiculos.schemas'

type IdParams = {
  id: string
}

function getQueryString(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return undefined
}

export async function listar(req: Request, res: Response) {
  try {
    const { marca, modelo, ano, preco_min, preco_max, combustivel, cambio, categoria } = req.query
    const veiculos = await veiculosService.listar(req.tenantId, {
      marca: getQueryString(marca),
      modelo: getQueryString(modelo),
      ano: ano ? Number(getQueryString(ano)) : undefined,
      preco_min: preco_min ? Number(getQueryString(preco_min)) : undefined,
      preco_max: preco_max ? Number(getQueryString(preco_max)) : undefined,
      combustivel: getQueryString(combustivel) as CombustivelType | undefined,
      cambio: getQueryString(cambio) as CambioType | undefined,
      categoria: getQueryString(categoria),
    })
    res.json(veiculos)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function buscarPorId(req: Request<IdParams>, res: Response) {
  try {
    const veiculo = await veiculosService.buscarPorId(req.params.id, req.tenantId)
    res.json(veiculo)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

export async function criar(req: Request, res: Response) {
  const body = parseOrRespond(vehicleSchema, req.body, res)
  if (!body) return

  try {
    const veiculo = await veiculosService.criar(body, req.tenantId, req.tenantPlano)
    res.status(201).json(veiculo)
  } catch (error: any) {
    res.status(error.status ?? 400).json({
      message: error.message,
      ...(error.code && { code: error.code, plano: error.plano, limite: error.limite }),
    })
  }
}

export async function atualizar(req: Request<IdParams>, res: Response) {
  const body = parseOrRespond(vehicleUpdateSchema, req.body, res)
  if (!body) return

  try {
    const veiculo = await veiculosService.atualizar(req.params.id, body, req.tenantId)
    res.json(veiculo)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function deletar(req: Request<IdParams>, res: Response) {
  try {
    await veiculosService.deletar(req.params.id, req.tenantId)
    res.status(204).send()
  } catch (error: any) {
    if (error.code === 'P2003') {
      res.status(409).json({ code: 'COMMERCIAL_HISTORY', message: 'Este veículo está vinculado ao histórico comercial e não pode ser excluído. Mantenha o registro e use o status vendido para retirá-lo da vitrine.' })
      return
    }
    res.status(404).json({ message: error.message })
  }
}

export async function marcarDestaque(req: Request<IdParams>, res: Response) {
  try {
    const veiculo = await veiculosService.marcarDestaque(req.params.id, req.tenantId)
    res.json(veiculo)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

export async function marcarVendido(req: Request<IdParams>, res: Response) {
  try {
    const veiculo = await veiculosService.marcarVendido(req.params.id, req.tenantId, req.tenantPlano)
    res.json(veiculo)
  } catch (error: any) {
    res.status(error.status ?? 404).json({
      message: error.message,
      ...(error.code && { code: error.code, plano: error.plano, limite: error.limite }),
    })
  }
}

export async function listarDestaques(req: Request, res: Response) {
  try {
    const veiculos = await veiculosService.listarDestaques(req.tenantId)
    res.json(veiculos)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
