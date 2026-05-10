"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoritar = favoritar;
exports.desfavoritar = desfavoritar;
exports.listar = listar;
const prisma_1 = require("../../lib/prisma");
async function favoritar(sessionId, veiculoId) {
    return prisma_1.prisma.favorito.upsert({
        where: { sessionId_veiculoId: { sessionId, veiculoId } },
        update: {},
        create: { sessionId, veiculoId }
    });
}
async function desfavoritar(sessionId, veiculoId) {
    const favorito = await prisma_1.prisma.favorito.findUnique({
        where: { sessionId_veiculoId: { sessionId, veiculoId } }
    });
    if (!favorito)
        throw new Error('Favorito não encontrado');
    return prisma_1.prisma.favorito.delete({
        where: { sessionId_veiculoId: { sessionId, veiculoId } }
    });
}
async function listar(sessionId) {
    const favoritos = await prisma_1.prisma.favorito.findMany({
        where: { sessionId },
        include: {
            veiculo: {
                include: {
                    fotos: { where: { capa: true }, take: 1 }
                }
            }
        }
    });
    return favoritos.map((favorito) => favorito.veiculo);
}
