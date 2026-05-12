import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { prisma } from '../src/lib/prisma'

type CreateTenantInput = {
  nome: string
  slug: string
  whatsapp?: string
  adminNome: string
  adminEmail: string
  adminSenha: string
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]

    if (!current.startsWith('--')) {
      continue
    }

    const key = current.slice(2)
    const value = argv[index + 1]

    if (!value || value.startsWith('--')) {
      args[key] = 'true'
      continue
    }

    args[key] = value
    index += 1
  }

  return args
}

function printHelp() {
  console.log(`
Uso:
  npm run create:tenant -- --nome "Loja Exemplo" --slug loja-exemplo --admin-nome "Admin" --admin-email admin@loja.com --admin-senha "senha123"

Opcoes:
  --nome           Nome da garagem
  --slug           Slug unico da garagem
  --whatsapp       WhatsApp da garagem
  --admin-nome     Nome do usuario administrador
  --admin-email    Email do usuario administrador
  --admin-senha    Senha do usuario administrador

Se algum campo nao for informado, o script vai perguntar no terminal.
  `)
}

async function askRequired(question: string, fallback?: string) {
  if (fallback?.trim()) {
    return fallback.trim()
  }

  const rl = createInterface({ input, output })

  try {
    while (true) {
      const answer = (await rl.question(question)).trim()

      if (answer) {
        return answer
      }

      console.log('Esse campo e obrigatorio.')
    }
  } finally {
    rl.close()
  }
}

async function askOptional(question: string, fallback?: string) {
  if (fallback?.trim()) {
    return fallback.trim()
  }

  const rl = createInterface({ input, output })

  try {
    const answer = (await rl.question(question)).trim()
    return answer || undefined
  } finally {
    rl.close()
  }
}

async function collectInput(): Promise<CreateTenantInput> {
  const args = parseArgs(process.argv.slice(2))

  if (args.help === 'true') {
    printHelp()
    process.exit(0)
  }

  return {
    nome: await askRequired('Nome da garagem: ', args.nome),
    slug: await askRequired('Slug da garagem: ', args.slug),
    whatsapp: await askOptional('WhatsApp da garagem (opcional): ', args.whatsapp),
    adminNome: await askRequired('Nome do admin: ', args['admin-nome']),
    adminEmail: await askRequired('Email do admin: ', args['admin-email']),
    adminSenha: await askRequired('Senha do admin: ', args['admin-senha']),
  }
}

async function ensureUniqueData(slug: string, adminEmail: string) {
  const [tenant, usuario] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug } }),
    prisma.usuario.findUnique({ where: { email: adminEmail } }),
  ])

  if (tenant) {
    throw new Error(`Ja existe uma garagem com o slug "${slug}".`)
  }

  if (usuario) {
    throw new Error(`Ja existe um usuario com o email "${adminEmail}".`)
  }
}

async function main() {
  const data = await collectInput()

  await ensureUniqueData(data.slug, data.adminEmail)

  const senhaHash = await bcrypt.hash(data.adminSenha, 10)

  const result = await prisma.$transaction(async tx => {
    const tenant = await tx.tenant.create({
      data: {
        nome: data.nome,
        slug: data.slug,
        whatsapp: data.whatsapp,
      },
    })

    const usuario = await tx.usuario.create({
      data: {
        nome: data.adminNome,
        email: data.adminEmail,
        senha: senhaHash,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
      },
    })

    return { tenant, usuario }
  })

  console.log('\nGaragem criada com sucesso:')
  console.log(`Tenant ID: ${result.tenant.id}`)
  console.log(`Nome: ${result.tenant.nome}`)
  console.log(`Slug: ${result.tenant.slug}`)
  console.log(`Admin: ${result.usuario.nome} <${result.usuario.email}>`)
}

main()
  .catch(error => {
    console.error('\nErro ao criar garagem/admin:')
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
