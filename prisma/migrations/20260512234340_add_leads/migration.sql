-- CreateEnum
CREATE TYPE "TipoLead" AS ENUM ('VENDER_CARRO', 'FINANCIAMENTO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLead" NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "dados" JSONB NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
