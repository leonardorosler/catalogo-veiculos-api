import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '../../generated/prisma/client'
import { proposalDocument } from './crm.document'

test('documento completo imprimível escapa dados de tenant, cliente, veículo, troca e observações', () => {
  const now = new Date('2026-10-09T12:00Z')
  const html = proposalDocument({
    id: 'p', tenantId: 't', leadId: 'l', veiculoId: 'v', numero: 1, status: 'RASCUNHO',
    valor: new Prisma.Decimal('85000.50'), entrada: null, trocaValor: null,
    trocaDescricao: '<b>Troca</b>', observacoes: '<script>alert("x")</script>',
    validadeEm: now, criadoEm: now, atualizadoEm: now, canal: null, compartilhadaEm: null, envioEmailStatus: null,
    veiculo: { id: 'v', marca: 'Marca & Cia', modelo: '<Modelo>', ano: 2020, preco: 85000 },
    lead: { nome: '<img src=x onerror=alert(1)>', email: 'cliente@example.com' },
    tenant: { nome: '<Loja>', whatsapp: '11999999999' },
  })
  assert.ok(html.startsWith('<!doctype html>'))
  assert.ok(html.includes('lang="pt-BR"'))
  assert.ok(html.includes('@media print'))
  assert.ok(html.includes('@page{size:A4'))
  assert.ok(html.includes('&lt;Loja&gt;'))
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(html.includes('Marca &amp; Cia &lt;Modelo&gt;'))
  assert.ok(html.includes('&lt;b&gt;Troca&lt;/b&gt;'))
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('85.000,50'))
})
