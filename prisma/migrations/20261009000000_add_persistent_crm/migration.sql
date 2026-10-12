-- Additive migration. Existing leads remain SITE/NOVO and unassigned.
ALTER TYPE "TipoLead" ADD VALUE IF NOT EXISTS 'INTERESSE';
CREATE TYPE "EtapaLead" AS ENUM ('NOVO', 'CONTATO', 'QUALIFICADO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO');
CREATE TYPE "OrigemLead" AS ENUM ('SITE', 'WHATSAPP', 'INDICACAO', 'OUTRO');
CREATE TYPE "StatusProposta" AS ENUM ('RASCUNHO', 'ENVIADA', 'ACEITA', 'RECUSADA');
ALTER TABLE "Veiculo" ADD COLUMN "categoria" TEXT, ADD COLUMN "opcionais" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Lead"
  ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "etapa" "EtapaLead" NOT NULL DEFAULT 'NOVO',
  ADD COLUMN "origem" "OrigemLead" NOT NULL DEFAULT 'SITE',
  ADD COLUMN "responsavelId" TEXT,
  ADD COLUMN "veiculoId" TEXT,
  ADD COLUMN "ultimoContatoEm" TIMESTAMP(3),
  ADD COLUMN "proximaAtividadeEm" TIMESTAMP(3),
  ADD COLUMN "motivoPerda" TEXT,
  ADD COLUMN "valorVenda" DECIMAL(14,2),
  ADD COLUMN "fechadoEm" TIMESTAMP(3);
CREATE UNIQUE INDEX "Usuario_id_tenantId_key" ON "Usuario"("id", "tenantId");
CREATE UNIQUE INDEX "Veiculo_id_tenantId_key" ON "Veiculo"("id", "tenantId");
CREATE UNIQUE INDEX "Lead_id_tenantId_key" ON "Lead"("id", "tenantId");
CREATE INDEX "Lead_tenantId_responsavelId_etapa_idx" ON "Lead"("tenantId", "responsavelId", "etapa");
CREATE INDEX "Lead_tenantId_criadoEm_idx" ON "Lead"("tenantId", "criadoEm");
CREATE INDEX "Lead_tenantId_proximaAtividadeEm_idx" ON "Lead"("tenantId", "proximaAtividadeEm");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_responsavelId_tenantId_fkey" FOREIGN KEY ("responsavelId", "tenantId") REFERENCES "Usuario"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_veiculoId_tenantId_fkey" FOREIGN KEY ("veiculoId", "tenantId") REFERENCES "Veiculo"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "HistoricoLead" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "leadId" TEXT NOT NULL,
  "autorId" TEXT, "tipo" TEXT NOT NULL, "descricao" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HistoricoLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HistoricoLead_leadId_tenantId_fkey" FOREIGN KEY ("leadId", "tenantId") REFERENCES "Lead"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HistoricoLead_autorId_tenantId_fkey" FOREIGN KEY ("autorId", "tenantId") REFERENCES "Usuario"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "HistoricoLead_tenantId_leadId_criadoEm_idx" ON "HistoricoLead"("tenantId", "leadId", "criadoEm");
CREATE TABLE "Proposta" (
  "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "leadId" TEXT NOT NULL, "veiculoId" TEXT NOT NULL,
  "numero" INTEGER NOT NULL, "status" "StatusProposta" NOT NULL DEFAULT 'RASCUNHO',
  "valor" DECIMAL(14,2) NOT NULL, "entrada" DECIMAL(14,2), "trocaDescricao" TEXT,
  "trocaValor" DECIMAL(14,2), "observacoes" TEXT, "validadeEm" TIMESTAMP(3) NOT NULL,
  "canal" TEXT, "compartilhadaEm" TIMESTAMP(3), "envioEmailStatus" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Proposta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Proposta_leadId_tenantId_fkey" FOREIGN KEY ("leadId", "tenantId") REFERENCES "Lead"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Proposta_veiculoId_tenantId_fkey" FOREIGN KEY ("veiculoId", "tenantId") REFERENCES "Veiculo"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Proposta_valores_check" CHECK ("valor" > 0 AND COALESCE("entrada", 0) >= 0 AND COALESCE("trocaValor", 0) >= 0 AND COALESCE("entrada", 0) + COALESCE("trocaValor", 0) <= "valor")
);
CREATE UNIQUE INDEX "Proposta_tenantId_numero_key" ON "Proposta"("tenantId", "numero");
CREATE INDEX "Proposta_tenantId_leadId_idx" ON "Proposta"("tenantId", "leadId");
CREATE TABLE "ConfiguracaoComercial" (
  "tenantId" TEXT PRIMARY KEY, "distribuicaoAutomatica" BOOLEAN NOT NULL DEFAULT false,
  "retornoAutomaticoHoras" INTEGER DEFAULT 24, "diasEstoqueAlerta" INTEGER NOT NULL DEFAULT 60,
  "diasSemContatoAlerta" INTEGER NOT NULL DEFAULT 2, "nomeExibicao" TEXT, "corPrimaria" TEXT,
  "logoUrl" TEXT, "mensagemHero" TEXT, "sequenciaProposta" INTEGER NOT NULL DEFAULT 0,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracaoComercial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_fechamento_check" CHECK (
  ("etapa" <> 'GANHO' OR ("veiculoId" IS NOT NULL AND "valorVenda" IS NOT NULL AND "valorVenda" > 0 AND "fechadoEm" IS NOT NULL))
  AND ("valorVenda" IS NULL OR "valorVenda" > 0)
);
-- Additional invariant: a vehicle can belong to only one won opportunity per tenant.
CREATE UNIQUE INDEX "Lead_veiculo_ganho_key" ON "Lead"("tenantId", "veiculoId") WHERE "etapa" = 'GANHO';
