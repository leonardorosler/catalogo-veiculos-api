import assert from 'node:assert/strict'
import test from 'node:test'
import { CrmError, escapeHtml, reportRange, sanitizeDados, validateLeadChange, validateProposalTransition, validateProposalValues } from './crm.domain'
import { configSchema, createLeadSchema, interestSchema, patchLeadSchema, proposalSchema } from './crm.schemas'

const lead = { etapa: 'NOVO' as const, veiculoId: null, valorVenda: null, motivoPerda: null }
const rejects = (code: number) => (error: unknown) => error instanceof CrmError && error.status === code
test('ganho exige veículo e venda positiva; perda exige motivo e encerramento é terminal', () => {
  assert.throws(() => validateLeadChange(lead, { etapa: 'GANHO' }), rejects(400))
  assert.throws(() => validateLeadChange(lead, { etapa: 'GANHO', veiculoId: 'v', valorVenda: 0 }), rejects(400))
  assert.equal(validateLeadChange(lead, { etapa: 'GANHO', veiculoId: 'v', valorVenda: 12000 }).etapa, 'GANHO')
  assert.throws(() => validateLeadChange(lead, { etapa: 'PERDIDO', motivoPerda: ' ' }), rejects(400))
  assert.throws(() => validateLeadChange({ ...lead, etapa: 'GANHO' }, { etapa: 'NOVO' }), rejects(409))
})
test('proposta valida entrada/troca, descrição e validade; não aceita expirada', () => {
  const now = new Date('2026-10-09T12:00:00Z'), future = new Date('2026-10-10T12:00:00Z')
  validateProposalValues({ valor: 100, entrada: 50.1, trocaValor: 49.9, trocaDescricao: 'Carro', validadeEm: future }, now)
  assert.throws(() => validateProposalValues({ valor: 100, entrada: 70, trocaValor: 31, trocaDescricao: 'Carro', validadeEm: future }, now), rejects(400))
  assert.throws(() => validateProposalValues({ valor: 100, trocaValor: 1, validadeEm: future }, now), rejects(400))
  assert.throws(() => validateProposalTransition('ENVIADA', 'ACEITA', now, now), rejects(409))
  assert.throws(() => validateProposalTransition('ACEITA', 'RECUSADA', future, now), rejects(409))
  assert.throws(() => validateProposalTransition('ENVIADA', 'ENVIADA', future, now), rejects(409))
})
test('datas de relatório são UTC, inclusivas e estritamente calendáricas', () => {
  const range = reportRange('2024-02-29', '2024-03-01')
  assert.equal(range.start.toISOString(), '2024-02-29T00:00:00.000Z')
  assert.equal(range.endExclusive.toISOString(), '2024-03-02T00:00:00.000Z')
  for (const [start, end] of [['2026-02-29', '2026-03-01'], ['2026-10-10', '2026-10-09'], ['2024-01-01', '2026-01-01'], ['09/10/2026', '2026-10-09']]) {
    assert.throws(() => reportRange(start!, end!), rejects(400))
  }
})
test('esquemas recusam precisão indevida, ISO inválido, URL insegura e injeção de campos', () => {
  const proposal = { veiculoId: 'v', valor: 123.45, validadeEm: '2027-01-01T10:00:00-03:00' }
  assert.equal(proposalSchema.safeParse(proposal).success, true)
  assert.equal(proposalSchema.safeParse({ ...proposal, valor: 10.00001 }).success, false)
  assert.equal(patchLeadSchema.safeParse({ proximaAtividadeEm: null }).success, true)
  assert.equal(patchLeadSchema.safeParse({ proximaAtividadeEm: 'amanhã' }).success, false)
  assert.equal(patchLeadSchema.safeParse({ tenantId: 'outro' }).success, false)
  assert.equal(interestSchema.safeParse({ nome: 'João', telefone: '11999999999', veiculoId: 'v', origem: 'INDICACAO' }).success, false)
  const cfg = { distribuicaoAutomatica: false, retornoAutomaticoHoras: null, diasEstoqueAlerta: 60, diasSemContatoAlerta: 2, personalizacao: { logoUrl: 'http://example.com/logo.png' } }
  assert.equal(configSchema.safeParse(cfg).success, false)
  assert.equal(configSchema.safeParse({ ...cfg, personalizacao: { logoUrl: 'https://example.com/logo.png' } }).success, true)
})
test('remove CPF recursivamente e impede JSON financeiro genérico para vendedor', () => {
  const dados = { cpf: '123', nested: [{ CPF: '456', nome: 'Teste' }], rendaMensal: '10000' }
  assert.deepEqual(sanitizeDados(dados, 'ADMIN', 'FINANCIAMENTO'), { nested: [{ nome: 'Teste' }], rendaMensal: '10000' })
  assert.deepEqual(sanitizeDados(dados, 'VENDEDOR', 'FINANCIAMENTO'), {})
  assert.deepEqual(sanitizeDados(dados, 'VENDEDOR', 'INTERESSE'), {})
  assert.deepEqual(sanitizeDados({ marca: 'Fiat', rendaMensal: '10000', cpf: '123' }, 'VENDEDOR', 'VENDER_CARRO'), { marca: 'Fiat' })
  assert.equal(escapeHtml('<script>"x" & \'y\'</script>'), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;')
})

test('contato sem email usa ausência no cadastro e null para limpar na edição', () => {
  const contato = { nome: 'Cliente', telefone: '11999999999', origem: 'OUTRO' }
  assert.equal(createLeadSchema.safeParse(contato).success, true)
  assert.equal(createLeadSchema.safeParse({ ...contato, email: '' }).success, false)
  assert.deepEqual(patchLeadSchema.parse({ email: null }), { email: null })
  assert.equal(patchLeadSchema.safeParse({ email: 'invalido' }).success, false)
})

test('mensagem de abertura preserva múltiplas linhas e rejeita NUL e excesso de tamanho', () => {
  const config = { distribuicaoAutomatica: false, retornoAutomaticoHoras: 24, diasEstoqueAlerta: 60, diasSemContatoAlerta: 2 }
  const mensagemHero = 'Primeira linha\nSegunda linha'
  assert.equal(configSchema.parse({ ...config, personalizacao: { mensagemHero } }).personalizacao.mensagemHero, mensagemHero)
  for (const mensagemHero of ['a'.repeat(301), 'texto\0inválido']) {
    assert.equal(configSchema.safeParse({ ...config, personalizacao: { mensagemHero } }).success, false)
  }
})
