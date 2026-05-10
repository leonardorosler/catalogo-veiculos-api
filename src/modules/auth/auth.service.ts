import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

export async function register(nome: string, email: string, senha: string, tenantId: string) {
  const existe = await prisma.usuario.findUnique({ where: { email } })

  if (existe) throw new Error('Email já cadastrado')

  const hash = await bcrypt.hash(senha, 10)

  const usuario = await prisma.usuario.create({
    data: { nome, email, senha: hash, tenantId },
    select: { id: true, nome: true, email: true, role: true }
  })

  return usuario
}

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario) throw new Error('Credenciais inválidas')

  const senhaValida = await bcrypt.compare(senha, usuario.senha)

  if (!senhaValida) throw new Error('Credenciais inválidas')

  const token = jwt.sign(
    { userId: usuario.id, tenantId: usuario.tenantId, role: usuario.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  )

  return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role } }
}