import assert from 'node:assert/strict'
import test from 'node:test'
import { getPlano, planoIncluiRecurso, recursoEstaImplementado } from './planos'

test('aplica os limites comerciais de cada plano', () => {
  assert.deepEqual(getPlano('BASICO').limites, { veiculos: 20, usuarios: 1 })
  assert.deepEqual(getPlano('PROFISSIONAL').limites, { veiculos: 80, usuarios: 3 })
  assert.deepEqual(getPlano('PREMIUM').limites, { veiculos: null, usuarios: null })
})

test('libera leads apenas a partir do plano Profissional', () => {
  assert.equal(planoIncluiRecurso('BASICO', 'LEADS'), false)
  assert.equal(planoIncluiRecurso('PROFISSIONAL', 'LEADS'), true)
  assert.equal(planoIncluiRecurso('PREMIUM', 'LEADS'), true)
})

test('distingue direito comercial de recurso realmente implementado', () => {
  assert.equal(planoIncluiRecurso('PROFISSIONAL', 'FUNIL_ATENDIMENTO'), true)
  assert.equal(recursoEstaImplementado('FUNIL_ATENDIMENTO'), true)
  assert.equal(recursoEstaImplementado('LEADS'), true)
  assert.equal(planoIncluiRecurso('PROFISSIONAL', 'AUTOMACOES_COMERCIAIS'), false)
  assert.equal(recursoEstaImplementado('AUTOMACOES_COMERCIAIS'), true)
})

test('usa o Basico como fallback para plano desconhecido', () => {
  assert.equal(getPlano('DESCONHECIDO'), getPlano('BASICO'))
})
