import { Request, Response } from 'express'
import * as adminService from './admin.service'

export async function dashboard(req: Request, res: Response) {
  try {
    const dados = await adminService.dashboard(req.tenantId)
    res.json(dados)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function estoque(req: Request, res: Response) {
  try {
    const veiculos = await adminService.estoque(req.tenantId)
    res.json(veiculos)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}