import { Request, Response } from 'express'
import type { CambioType, CombustivelType } from '../../lib/prisma-client'
import * as veiculosService from './veiculos.service'

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
    const { marca, modelo, ano, preco_min, preco_max, combustivel, cambio } = req.query
    const veiculos = await veiculosService.listar(req.tenantId, {
      marca: getQueryString(marca),
      modelo: getQueryString(modelo),
      ano: ano ? Number(getQueryString(ano)) : undefined,
      preco_min: preco_min ? Number(getQueryString(preco_min)) : undefined,
      preco_max: preco_max ? Number(getQueryString(preco_max)) : undefined,
      combustivel: getQueryString(combustivel) as CombustivelType | undefined,
      cambio: getQueryString(cambio) as CambioType | undefined,
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
  try {
    const veiculo = await veiculosService.criar(req.body, req.tenantId)
    res.status(201).json(veiculo)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function atualizar(req: Request<IdParams>, res: Response) {
  try {
    const veiculo = await veiculosService.atualizar(req.params.id, req.body, req.tenantId)
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
    const veiculo = await veiculosService.marcarVendido(req.params.id, req.tenantId)
    res.json(veiculo)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
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
