import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

export async function login(email: string, senha: string, tenantId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario || usuario.tenantId !== tenantId) throw new Error('Credenciais inválidas')

  const senhaValida = await bcrypt.compare(senha, usuario.senha)
  if (!senhaValida) throw new Error('Credenciais inválidas')

  const token = jwt.sign(
    { userId: usuario.id, tenantId: usuario.tenantId, role: usuario.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h', algorithm: 'HS256' }
  )

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
  }
}
