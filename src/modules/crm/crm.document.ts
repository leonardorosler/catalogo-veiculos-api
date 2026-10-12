import { escapeHtml } from './crm.domain'
import type { getProposal } from './crm.service'

export function proposalDocument(proposal: Awaited<ReturnType<typeof getProposal>>) {
  const e = escapeHtml
  const brl = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))
  const date = (value: Date) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(value)
  const row = (label: string, value: unknown) => `<tr><th>${e(label)}</th><td>${e(value)}</td></tr>`
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proposta ${e(proposal.numero)} — ${e(proposal.tenant.nome)}</title>
<style>body{font:16px/1.6 Arial,sans-serif;color:#17202a;max-width:800px;margin:40px auto;padding:24px}h1{font-size:28px}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #ddd}th{width:32%}p{white-space:pre-wrap;overflow-wrap:anywhere}.muted{font-size:13px;color:#555}footer{margin-top:40px;border-top:1px solid #ddd;padding-top:16px}@page{size:A4;margin:18mm}@media print{body{margin:0;padding:0;max-width:none}tr{break-inside:avoid}}</style></head>
<body><header><h1>${e(proposal.tenant.nome)}</h1><p>Proposta comercial #${e(proposal.numero)}</p></header>
<table><tbody>${row('Cliente', proposal.lead.nome)}${row('Veículo', `${proposal.veiculo.marca} ${proposal.veiculo.modelo} ${proposal.veiculo.ano}`)}${row('Valor da proposta', brl(proposal.valor))}${row('Entrada', brl(proposal.entrada))}${row('Veículo de troca', proposal.trocaDescricao ?? 'Não informado')}${row('Valor da troca', brl(proposal.trocaValor))}${row('Validade (UTC)', date(proposal.validadeEm))}${row('Emitida em (UTC)', date(proposal.criadoEm))}${row('Status', proposal.status)}</tbody></table>
${proposal.observacoes ? `<h2>Observações</h2><p>${e(proposal.observacoes)}</p>` : ''}
<footer><p class="muted">Documento comercial para impressão. Compartilhamento registrado não representa confirmação de entrega. A aceitação depende da validade e disponibilidade do veículo.</p>${proposal.tenant.whatsapp ? `<p>Contato: ${e(proposal.tenant.whatsapp)}</p>` : ''}</footer></body></html>`
}
