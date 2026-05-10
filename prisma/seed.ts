import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      nome: 'RD Veículos',
      slug: 'rd-veiculos',
      whatsapp: '5553999999999',
    }
  })

  const hash = await bcrypt.hash('123456', 10)

  await prisma.usuario.create({
    data: {
      nome: 'Admin',
      email: 'admin@rd.com',
      senha: hash,
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