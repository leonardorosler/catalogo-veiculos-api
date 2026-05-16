import { Request, Response } from 'express'
import * as fotosService from './fotos.service'

type IdParams = {
  id: string
}

export async function upload(req: Request<IdParams>, res: Response) {
  try {
    const arquivo = req.file
    if (!arquivo) {
      res.status(400).json({ message: 'Nenhum arquivo enviado' })
      return
    }

    const capa = req.body.capa === 'true'
    const foto = await fotosService.upload(req.params.id, req.tenantId, arquivo, capa)
    res.status(201).json(foto)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function deletar(req: Request<IdParams>, res: Response) {
  try {
    await fotosService.deletar(req.params.id, req.tenantId)
    res.status(204).send()
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}
//definicao de capa pelo amdmin
export async function definirCapa(req: Request<IdParams>, res: Response) {
  try {
    const foto = await fotosService.definirCapa(req.params.id, req.tenantId)
    res.json(foto)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}
