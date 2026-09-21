import 'dotenv/config'
import app from './app'

const PORT = process.env.PORT || 3000

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres')
}

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
  throw new Error('CORS_ORIGINS é obrigatório em produção')
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
