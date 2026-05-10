"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.buscarPorId = buscarPorId;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
exports.marcarDestaque = marcarDestaque;
exports.marcarVendido = marcarVendido;
exports.listarDestaques = listarDestaques;
const prisma_1 = require("../../lib/prisma");
async function listar(tenantId, filtros) {
    return prisma_1.prisma.veiculo.findMany({
        where: {
            tenantId,
            vendido: false,
            ...(filtros.marca && { marca: { contains: filtros.marca, mode: 'insensitive' } }),
            ...(filtros.modelo && { modelo: { contains: filtros.modelo, mode: 'insensitive' } }),
            ...(filtros.ano && { ano: filtros.ano }),
            ...(filtros.combustivel && { combustivel: filtros.combustivel }),
            ...(filtros.cambio && { cambio: filtros.cambio }),
            ...((filtros.preco_min || filtros.preco_max) && {
                preco: {
                    ...(filtros.preco_min && { gte: filtros.preco_min }),
                    ...(filtros.preco_max && { lte: filtros.preco_max }),
                }
            }),
        },
        include: {
            fotos: { where: { capa: true }, take: 1 }
        },
        orderBy: { criadoEm: 'desc' }
    });
}
async function buscarPorId(id, tenantId) {
    const veiculo = await prisma_1.prisma.veiculo.findFirst({
        where: { id, tenantId },
        include: { fotos: { orderBy: { ordem: 'asc' } } }
    });
    if (!veiculo)
        throw new Error('Veículo não encontrado');
    return veiculo;
}
async function criar(dados, tenantId) {
    return prisma_1.prisma.veiculo.create({
        data: { ...dados, tenantId }
    });
}
async function atualizar(id, dados, tenantId) {
    const existe = await prisma_1.prisma.veiculo.findFirst({ where: { id, tenantId } });
    if (!existe)
        throw new Error('Veículo não encontrado');
    return prisma_1.prisma.veiculo.update({
        where: { id },
        data: dados
    });
}
async function deletar(id, tenantId) {
    const existe = await prisma_1.prisma.veiculo.findFirst({ where: { id, tenantId } });
    if (!existe)
        throw new Error('Veículo não encontrado');
    return prisma_1.prisma.veiculo.delete({ where: { id } });
}
async function marcarDestaque(id, tenantId) {
    const veiculo = await prisma_1.prisma.veiculo.findFirst({ where: { id, tenantId } });
    if (!veiculo)
        throw new Error('Veículo não encontrado');
    return prisma_1.prisma.veiculo.update({
        where: { id },
        data: { destaque: !veiculo.destaque }
    });
}
async function marcarVendido(id, tenantId) {
    const veiculo = await prisma_1.prisma.veiculo.findFirst({ where: { id, tenantId } });
    if (!veiculo)
        throw new Error('Veículo não encontrado');
    return prisma_1.prisma.veiculo.update({
        where: { id },
        data: { vendido: !veiculo.vendido }
    });
}
async function listarDestaques(tenantId) {
    return prisma_1.prisma.veiculo.findMany({
        where: { tenantId, destaque: true, vendido: false },
        include: { fotos: { where: { capa: true }, take: 1 } },
        take: 6
    });
}
