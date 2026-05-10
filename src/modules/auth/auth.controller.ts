import { Request, Response } from 'express'
import * as authService from './auth.service'

export async function register(req: Request, res: Response) {
  try {
    const { nome, email, senha } = req.body
    const usuario = await authService.register(nome, email, senha, req.tenantId)
    res.status(201).json(usuario)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, senha } = req.body
    const resultado = await authService.login(email, senha)
    res.json(resultado)
  } catch (error: any) {
    res.status(401).json({ message: error.message })
  }
}