import express from 'express'
import cors from 'cors'
import authRoutes from './modules/auth/auth.routes'
import veiculosRoutes from './modules/veiculos/veiculos.routes'
import fotosRoutes from './modules/fotos/fotos.routes'
import favoritosRoutes from './modules/favoritos/favoritos.routes'
import adminRoutes from './modules/admin/admin.routes'
import leadsRoutes from './modules/leads/leads.routes'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/veiculos', veiculosRoutes)
app.use('/', fotosRoutes)
app.use('/favoritos', favoritosRoutes)
app.use('/admin', adminRoutes)
app.use('/leads', leadsRoutes)

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

export default app