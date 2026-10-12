import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import { getJwtSecret } from './auth.session'

export class CredenciaisInvalidasError extends Error {
  constructor() {
    super('Credenciais inválidas')
    this.name = 'CredenciaisInvalidasError'
  }
}

export async function login(email: string, senha: string, tenantId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario || !usuario.ativo || usuario.tenantId !== tenantId) throw new CredenciaisInvalidasError()

  const senhaValida = await bcrypt.compare(senha, usuario.senha)
  if (!senhaValida) throw new CredenciaisInvalidasError()

  const token = jwt.sign(
    { userId: usuario.id, tenantId: usuario.tenantId, role: usuario.role },
    getJwtSecret(),
    { expiresIn: '8h', algorithm: 'HS256' }
  )

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
  }
}
