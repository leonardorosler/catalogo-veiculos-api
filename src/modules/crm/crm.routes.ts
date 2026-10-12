import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { tenantMiddleware } from '../../middlewares/tenant'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { requirePlanFeature } from '../../middlewares/plano'
import { CrmError } from './crm.domain'
import * as schemas from './crm.schemas'
import * as service from './crm.service'
import { proposalDocument } from './crm.document'

export const context = (req: Request): service.Context => ({ tenantId: req.tenantId, userId: req.userId, role: req.role, plano: req.tenantPlano })
export function respondError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) { res.status(400).json({ message: 'Dados inválidos', errors: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }); return }
  if (error instanceof CrmError) { res.status(error.status).json({ code: error.code, message: error.message }); return }
  console.error('Falha na operação comercial')
  res.status(500).json({ message: 'Não foi possível concluir a operação comercial' })
}
export const handler = (run: (req: Request, res: Response) => Promise<unknown>): RequestHandler => async (req, res) => {
  try { await run(req, res) } catch (error) { respondError(error, res) }
}
// Resolve current DB membership/role instead of relying on stale role claims.
export async function crmActor(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = await prisma.usuario.findFirst({ where: { id: req.userId, tenantId: req.tenantId, ativo: true }, select: { role: true } })
    if (!actor) { res.status(401).json({ message: 'Usuário não encontrado nesta revenda' }); return }
    req.role = actor.role
    next()
  } catch { res.status(503).json({ message: 'Serviço temporariamente indisponível' }) }
}
const router = Router()
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next() })
router.use(tenantMiddleware, authMiddleware, crmActor, requireRole('ADMIN', 'VENDEDOR'), requirePlanFeature('FUNIL_ATENDIMENTO'))
router.get('/leads', handler(async (req, res) => res.json(await service.listLeads(context(req), schemas.listSchema.parse(req.query)))))
router.post('/leads', handler(async (req, res) => {
  const lead = await service.createLead(req.tenantId, schemas.createLeadSchema.parse(req.body), context(req))
  res.status(201).json(service.serializeLead(lead, req.role, true))
}))
router.get('/leads/:id', handler(async (req, res) => res.json(await service.getLead(context(req), String(req.params.id)))))
router.patch('/leads/:id', handler(async (req, res) => res.json(await service.patchLead(context(req), String(req.params.id), schemas.patchLeadSchema.parse(req.body)))))
router.post('/leads/:id/historico', handler(async (req, res) => res.status(201).json(await service.addHistory(context(req), String(req.params.id), schemas.historySchema.parse(req.body)))))
router.get('/usuarios', handler(async (req, res) => res.json(await service.listUsers(context(req)))))
router.get('/veiculos', handler(async (req, res) => res.json(await service.listVehicles(context(req)))))
router.post('/leads/:id/propostas', requirePlanFeature('PROPOSTAS'), handler(async (req, res) => res.status(201).json(await service.createProposal(context(req), String(req.params.id), schemas.proposalSchema.parse(req.body)))))
router.patch('/propostas/:id', requirePlanFeature('PROPOSTAS'), handler(async (req, res) => res.json(await service.patchProposal(context(req), String(req.params.id), schemas.proposalPatchSchema.parse(req.body)))))
router.get('/propostas/:id/documento', requirePlanFeature('PROPOSTAS'), handler(async (req, res) => {
  const proposal = await service.getProposal(context(req), String(req.params.id))
  res.setHeader('Content-Disposition', `attachment; filename="proposta-${proposal.numero}.html"`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'")
  res.type('html').send(proposalDocument(proposal))
}))
router.get('/relatorios', requirePlanFeature('RELATORIOS_CONVERSAO'), handler(async (req, res) => {
  const query = z.object({ inicio: z.string(), fim: z.string() }).strict().parse(req.query)
  res.json(await service.reports(context(req), query.inicio, query.fim))
}))
router.get('/alertas', requirePlanFeature('AUTOMACOES_COMERCIAIS'), handler(async (req, res) => res.json(await service.alerts(context(req)))))
router.get('/configuracao', requireRole('ADMIN'), requirePlanFeature('AUTOMACOES_COMERCIAIS'), handler(async (req, res) => res.json(await service.getConfig(context(req)))))
router.put('/configuracao', requireRole('ADMIN'), requirePlanFeature('AUTOMACOES_COMERCIAIS'), handler(async (req, res) => res.json(await service.putConfig(context(req), schemas.configSchema.parse(req.body)))))
export const publicConfigHandler = handler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json(await service.publicConfig(req.tenantId, req.tenantPlano))
})
export default router
