export const RECURSOS = [
  'SITE_CATALOGO',
  'WHATSAPP_ANUNCIOS',
  'GESTAO_ESTOQUE',
  'LEADS',
  'FUNIL_ATENDIMENTO',
  'PROPOSTAS',
  'AVALIACAO_TROCA',
  'DISTRIBUICAO_LEADS',
  'GESTAO_VENDEDORES',
  'RELATORIOS_CONVERSAO',
  'PERSONALIZACAO_AVANCADA',
  'AUTOMACOES_COMERCIAIS',
] as const

export type RecursoPlano = typeof RECURSOS[number]
export type PlanoNome = 'BASICO' | 'PROFISSIONAL' | 'PREMIUM'

type Limite = number | null

type ConfiguracaoPlano = {
  nome: string
  limites: {
    veiculos: Limite
    usuarios: Limite
  }
  recursos: readonly RecursoPlano[]
}

const BASICOS: RecursoPlano[] = ['SITE_CATALOGO', 'WHATSAPP_ANUNCIOS', 'GESTAO_ESTOQUE']
const PROFISSIONAIS: RecursoPlano[] = [
  ...BASICOS,
  'LEADS',
  'FUNIL_ATENDIMENTO',
  'PROPOSTAS',
  'AVALIACAO_TROCA',
]

export const PLANOS: Record<PlanoNome, ConfiguracaoPlano> = {
  BASICO: {
    nome: 'Básico',
    limites: { veiculos: 20, usuarios: 1 },
    recursos: BASICOS,
  },
  PROFISSIONAL: {
    nome: 'Profissional',
    limites: { veiculos: 80, usuarios: 3 },
    recursos: PROFISSIONAIS,
  },
  PREMIUM: {
    nome: 'Premium',
    limites: { veiculos: null, usuarios: null },
    recursos: [
      ...PROFISSIONAIS,
      'DISTRIBUICAO_LEADS',
      'GESTAO_VENDEDORES',
      'RELATORIOS_CONVERSAO',
      'PERSONALIZACAO_AVANCADA',
      'AUTOMACOES_COMERCIAIS',
    ],
  },
}

export const RECURSOS_IMPLEMENTADOS: readonly RecursoPlano[] = [
  'SITE_CATALOGO',
  'WHATSAPP_ANUNCIOS',
  'GESTAO_ESTOQUE',
  'LEADS',
  'FUNIL_ATENDIMENTO',
  'PROPOSTAS',
  'AVALIACAO_TROCA',
  'DISTRIBUICAO_LEADS',
  'GESTAO_VENDEDORES',
  'RELATORIOS_CONVERSAO',
  'PERSONALIZACAO_AVANCADA',
  'AUTOMACOES_COMERCIAIS',
]

export function getPlano(plano: string) {
  return PLANOS[plano as PlanoNome] ?? PLANOS.BASICO
}

export function planoIncluiRecurso(plano: string, recurso: RecursoPlano) {
  return getPlano(plano).recursos.includes(recurso)
}

export function recursoEstaImplementado(recurso: RecursoPlano) {
  return RECURSOS_IMPLEMENTADOS.includes(recurso)
}
