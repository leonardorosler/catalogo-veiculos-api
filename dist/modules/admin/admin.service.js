"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = dashboard;
exports.estoque = estoque;
const prisma_1 = require("../../lib/prisma");
async function dashboard(tenantId) {
    const [total, ativos, vendidos, destaques] = await Promise.all([
        prisma_1.prisma.veiculo.count({ where: { tenantId } }),
        prisma_1.prisma.veiculo.count({ where: { tenantId, vendido: false } }),
        prisma_1.prisma.veiculo.count({ where: { tenantId, vendido: true } }),
        prisma_1.prisma.veiculo.count({ where: { tenantId, destaque: true, vendido: false } }),
    ]);
    return { total, ativos, vendidos, destaques };
}
async function estoque(tenantId) {
    return prisma_1.prisma.veiculo.findMany({
        where: { tenantId },
        include: {
            fotos: { where: { capa: true }, take: 1 },
            _count: { select: { fotos: true } }
        },
        orderBy: { criadoEm: 'desc' }
    });
}
