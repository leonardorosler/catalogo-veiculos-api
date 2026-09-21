ALTER TABLE "Usuario" ALTER COLUMN "role" SET DEFAULT 'VENDEDOR';

-- CPF is not needed for the initial contact workflow and must not remain in lead JSON.
UPDATE "Lead"
SET "dados" = "dados" - 'cpf'
WHERE "tipo" = 'FINANCIAMENTO' AND "dados" ? 'cpf';
