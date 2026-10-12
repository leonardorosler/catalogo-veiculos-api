import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const adminEmail = process.env.SEED_ADMIN_EMAIL

  if (!adminPassword || adminPassword.length < 12 || !adminEmail) {
    throw new Error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (mínimo de 12 caracteres)')
  }

  const tenant = await prisma.tenant.create({
    data: {
      nome: 'RD Veículos',
      slug: 'rd-veiculos',
      whatsapp: '5553999999999',
      plano: 'PREMIUM',
    }
  })

  const hash = await bcrypt.hash(adminPassword, 12)

  await prisma.usuario.create({
    data: {
      nome: 'Admin',
      email: adminEmail.trim().toLowerCase(),
      senha: hash,
      role: 'ADMIN',
      tenantId: tenant.id,
    }
  })

  await prisma.veiculo.createMany({
    data: [
      {
        marca: 'Volkswagen',
        modelo: 'Gol',
        ano: 2020,
        preco: 45000,
        km: 50000,
        combustivel: 'FLEX',
        cambio: 'MANUAL',
        cor: 'Branco',
        descricao: 'Carro em ótimo estado',
        destaque: true,
        tenantId: tenant.id,
      },
      {
        marca: 'Chevrolet',
        modelo: 'Onix',
        ano: 2021,
        preco: 62000,
        km: 30000,
        combustivel: 'FLEX',
        cambio: 'AUTOMATICO',
        cor: 'Prata',
        descricao: 'Único dono',
        tenantId: tenant.id,
      },
      {
        marca: 'Fiat',
        modelo: 'Pulse',
        ano: 2022,
        preco: 89000,
        km: 15000,
        combustivel: 'FLEX',
        cambio: 'CVT',
        cor: 'Vermelho',
        descricao: 'Revisões em dia',
        destaque: true,
        tenantId: tenant.id,
      },
    ]
  })

  console.log('Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
