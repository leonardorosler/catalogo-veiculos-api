"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarLeadVenderCarro = criarLeadVenderCarro;
exports.criarLeadFinanciamento = criarLeadFinanciamento;
exports.listarLeads = listarLeads;
exports.marcarLido = marcarLido;
const resend_1 = require("resend");
const prisma_1 = require("../../lib/prisma");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
function toJsonDadosVenderCarro(dados) {
    return {
        marca: dados.marca,
        modelo: dados.modelo,
        ano: dados.ano,
        km: dados.km,
        condicao: dados.condicao,
        observacoes: dados.observacoes,
    };
}
function toJsonDadosFinanciamento(dados) {
    return {
        cpf: dados.cpf,
        veiculoInteresse: dados.veiculoInteresse,
        valorEntrada: dados.valorEntrada,
        prazo: dados.prazo,
        rendaMensal: dados.rendaMensal,
    };
}
async function criarLeadVenderCarro(tenantId, nome, telefone, email, dados) {
    const tenant = await prisma_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant)
        throw new Error('Tenant não encontrado');
    const lead = await prisma_1.prisma.lead.create({
        data: {
            tipo: 'VENDER_CARRO',
            nome,
            telefone,
            email,
            dados: toJsonDadosVenderCarro(dados),
            tenantId,
        }
    });
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
    });
    return lead;
}
async function criarLeadFinanciamento(tenantId, nome, telefone, email, dados) {
    const tenant = await prisma_1.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant)
        throw new Error('Tenant não encontrado');
    const lead = await prisma_1.prisma.lead.create({
        data: {
            tipo: 'FINANCIAMENTO',
            nome,
            telefone,
            email,
            dados: toJsonDadosFinanciamento(dados),
            tenantId,
        }
    });
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
    });
    return lead;
}
async function listarLeads(tenantId, tipo) {
    return prisma_1.prisma.lead.findMany({
        where: { tenantId, ...(tipo && { tipo }) },
        orderBy: { criadoEm: 'desc' }
    });
}
async function marcarLido(id, tenantId) {
    const lead = await prisma_1.prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead)
        throw new Error('Lead não encontrado');
    return prisma_1.prisma.lead.update({ where: { id }, data: { lido: !lead.lido } });
}
