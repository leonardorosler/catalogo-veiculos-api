import { Resend } from 'resend'
import { prisma } from '../../lib/prisma'
import type { Prisma } from '../../lib/prisma-client'
import type { FinanceLeadInput, SellCarLeadInput } from './leads.schemas'

type TipoLead = 'VENDER_CARRO' | 'FINANCIAMENTO'
type SellCarData = Omit<SellCarLeadInput, 'nome' | 'telefone' | 'email'>
type FinanceData = Omit<FinanceLeadInput, 'nome' | 'telefone' | 'email' | 'cpf'>

const resend = new Resend(process.env.RESEND_API_KEY)

function toSellCarJson(dados: SellCarData): Prisma.InputJsonObject {
  return {
    marca: dados.marca,
    modelo: dados.modelo,
    ano: dados.ano,
    km: dados.km,
    condicao: dados.condicao,
    ...(dados.observacoes && { observacoes: dados.observacoes }),
  }
}

function toFinanceJson(dados: FinanceData): Prisma.InputJsonObject {
  return {
    veiculoInteresse: dados.veiculoInteresse,
    valorEntrada: dados.valorEntrada,
    prazo: dados.prazo,
    ...(dados.rendaMensal && { rendaMensal: dados.rendaMensal }),
  }
}

async function sendLeadEmail(to: string | null, subject: string, text: string) {
  const from = process.env.EMAIL_FROM
  if (!to || !from || !process.env.RESEND_API_KEY) return

  try {
    const result = await resend.emails.send({ from, to, subject, text })
    if (result.error) console.error('Falha ao enviar notificação de lead')
  } catch {
    console.error('Falha ao enviar notificação de lead')
  }
}

export async function criarLeadVenderCarro(
  tenantId: string,
  nome: string,
  telefone: string,
  email: string | undefined,
  dados: SellCarData
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant não encontrado')

  const lead = await prisma.lead.create({
    data: {
      tipo: 'VENDER_CARRO',
      nome,
      telefone,
      email,
      dados: toSellCarJson(dados),
      tenantId,
    }
  })

  void sendLeadEmail(
    tenant.emailContato ?? process.env.EMAIL_FALLBACK ?? null,
    `[Vender Carro] ${nome} - ${dados.marca} ${dados.modelo} ${dados.ano}`,
    [
      'Novo lead: Vender Carro',
      `Nome: ${nome}`,
      `Telefone: ${telefone}`,
      ...(email ? [`Email: ${email}`] : []),
      `Veículo: ${dados.marca} ${dados.modelo} ${dados.ano}`,
      `KM: ${dados.km}`,
      `Condição: ${dados.condicao}`,
      ...(dados.observacoes ? [`Observações: ${dados.observacoes}`] : []),
    ].join('\n')
  )

  return lead
}

export async function criarLeadFinanciamento(
  tenantId: string,
  nome: string,
  telefone: string,
  email: string | undefined,
  dados: FinanceData
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant não encontrado')

  const lead = await prisma.lead.create({
    data: {
      tipo: 'FINANCIAMENTO',
      nome,
      telefone,
      email,
      dados: toFinanceJson(dados),
      tenantId,
    }
  })

  void sendLeadEmail(
    tenant.emailContato ?? process.env.EMAIL_FALLBACK ?? null,
    `[Financiamento] ${nome} - ${dados.veiculoInteresse}`,
    [
      'Novo lead: Financiamento',
      `Nome: ${nome}`,
      `Telefone: ${telefone}`,
      ...(email ? [`Email: ${email}`] : []),
      `Veículo de interesse: ${dados.veiculoInteresse}`,
      `Entrada: R$ ${dados.valorEntrada}`,
      `Prazo: ${dados.prazo} meses`,
      ...(dados.rendaMensal ? [`Renda mensal: R$ ${dados.rendaMensal}`] : []),
    ].join('\n')
  )

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
