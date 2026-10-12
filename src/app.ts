import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './modules/auth/auth.routes'
import veiculosRoutes from './modules/veiculos/veiculos.routes'
import fotosRoutes from './modules/fotos/fotos.routes'
import favoritosRoutes from './modules/favoritos/favoritos.routes'
import adminRoutes from './modules/admin/admin.routes'
import leadsRoutes from './modules/leads/leads.routes'
import planosRoutes from './modules/planos/planos.routes'
import usuariosRoutes from './modules/usuarios/usuarios.routes'
import { apiLimiter } from './middlewares/rate-limit'
import crmRoutes, { publicConfigHandler } from './modules/crm/crm.routes'
import { tenantMiddleware } from './middlewares/tenant'

const app = express()

const defaultOrigins = process.env.NODE_ENV === 'production'
  ? ''
  : 'http://localhost:5173,http://localhost:4173'
const allowedOrigins = (process.env.CORS_ORIGINS ?? defaultOrigins)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origem não permitida'))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400,
}))
app.use(apiLimiter)
app.use(express.json({ limit: '100kb' }))

app.use('/auth', authRoutes)
app.use('/veiculos', veiculosRoutes)
app.use('/', fotosRoutes)
app.use('/favoritos', favoritosRoutes)
app.use('/admin', adminRoutes)
app.use('/leads', leadsRoutes)
app.use('/plano', planosRoutes)
app.use('/admin/usuarios', usuariosRoutes)
app.use('/crm', crmRoutes)
app.get('/configuracao-publica', tenantMiddleware, publicConfigHandler)

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error && error.name === 'MulterError') {
    const message = (error as Error & { code?: string }).code === 'LIMIT_FILE_SIZE'
      ? 'A imagem deve ter no máximo 5 MB'
      : 'Upload inválido'
    res.status(400).json({ message })
    return
  }

  if (error instanceof Error && error.message === 'Origem não permitida') {
    res.status(403).json({ message: error.message })
    return
  }

  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status?: number }).status
    if (status === 400 || status === 413) {
      res.status(status).json({
        message: status === 413 ? 'Corpo da requisição muito grande' : 'JSON inválido',
      })
      return
    }
  }

  console.error('Erro não tratado na requisição')
  res.status(500).json({ message: 'Erro interno do servidor' })
})

export default app
