import { Resend } from 'resend'
import { prisma } from '../../lib/prisma'
import type { Prisma } from '../../lib/prisma-client'

type TipoLead = 'VENDER_CARRO' | 'FINANCIAMENTO'

const resend = new Resend(process.env.RESEND_API_KEY)

interface DadosVenderCarro {
  marca: string
  modelo: string
  ano: string
  km: string
  condicao: string
  observacoes?: string
}

interface DadosFinanciamento {
  cpf?: string
  veiculoInteresse: string
  valorEntrada: string
  prazo: string
  rendaMensal?: string
}

function toJsonDadosVenderCarro(dados: DadosVenderCarro): Prisma.InputJsonObject {
  return {
    marca: dados.marca,
    modelo: dados.modelo,
    ano: dados.ano,
    km: dados.km,
    condicao: dados.condicao,
    observacoes: dados.observacoes,
  }
}

function toJsonDadosFinanciamento(dados: DadosFinanciamento): Prisma.InputJsonObject {
  return {
    cpf: dados.cpf,
    veiculoInteresse: dados.veiculoInteresse,
    valorEntrada: dados.valorEntrada,
    prazo: dados.prazo,
    rendaMensal: dados.rendaMensal,
  }
}

export async function criarLeadVenderCarro(
  tenantId: string,
  nome: string,
  telefone: string,
  email: string | undefined,
  dados: DadosVenderCarro
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant não encontrado')

  const lead = await prisma.lead.create({
    data: {
      tipo: 'VENDER_CARRO' as const,
      nome,
      telefone,
      email,
      dados: toJsonDadosVenderCarro(dados),
      tenantId,
    }
  })

  await resend.emails.send({
    from: 'leads@seudominio.com',
    to: tenant.emailContato ?? process.env.EMAIL_FALLBACK ?? '',
    subject: `[Vender Carro] ${nome} - ${dados.marca} ${dados.modelo} ${dados.ano}`,
    html: `
      <h2>Novo lead: Vender Carro</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Telefone:</strong> ${telefone}</p>
      ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
      <hr/>
      <p><strong>Veículo:</strong> ${dados.marca} ${dados.modelo} ${dados.ano}</p>
      <p><strong>KM:</strong> ${dados.km}</p>
      <p><strong>Condição:</strong> ${dados.condicao}</p>
      ${dados.observacoes ? `<p><strong>Observações:</strong> ${dados.observacoes}</p>` : ''}
    `
  })

  return lead
}

export async function criarLeadFinanciamento(
  tenantId: string,
  nome: string,
  telefone: string,
  email: string | undefined,
  dados: DadosFinanciamento
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant não encontrado')

  const lead = await prisma.lead.create({
    data: {
      tipo: 'FINANCIAMENTO' as const,
      nome,
      telefone,
      email,
      dados: toJsonDadosFinanciamento(dados),
      tenantId,
    }
  })

  await resend.emails.send({
    from: 'leads@seudominio.com',
    to: tenant.emailContato ?? process.env.EMAIL_FALLBACK ?? '',
    subject: `[Financiamento] ${nome} - ${dados.veiculoInteresse}`,
    html: `
      <h2>Novo lead: Financiamento</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Telefone:</strong> ${telefone}</p>
      ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
      ${dados.cpf ? `<p><strong>CPF:</strong> ${dados.cpf}</p>` : ''}
      <hr/>
      <p><strong>Veículo de interesse:</strong> ${dados.veiculoInteresse}</p>
      <p><strong>Entrada:</strong> R$ ${dados.valorEntrada}</p>
      <p><strong>Prazo:</strong> ${dados.prazo} meses</p>
      ${dados.rendaMensal ? `<p><strong>Renda mensal:</strong> R$ ${dados.rendaMensal}</p>` : ''}
    `
  })

  return lead
}

export async function listarLeads(tenantId: string, tipo?: TipoLead) {
  return prisma.lead.findMany({
    where: { tenantId, ...(tipo && { tipo }) },
    orderBy: { criadoEm: 'desc' }
  })
}

export async function marcarLido(id: string, tenantId: string) {
  const lead = await prisma.lead.findFirst({ where: { id, tenantId } })
  if (!lead) throw new Error('Lead não encontrado')
  return prisma.lead.update({ where: { id }, data: { lido: !lead.lido } })
}
