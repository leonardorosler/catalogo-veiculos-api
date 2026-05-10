"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
const prisma_1 = require("../lib/prisma");
//recebe, busca, valida e adiciona req.tenantID
async function tenantMiddleware(req, res, next) {
    const slug = req.headers['x-tenant-id'];
    if (!slug) {
        res.status(400).json({ message: 'Header x-tenant-id é obrigatório' });
        return;
    }
    const tenant = await prisma_1.prisma.tenant.findUnique({
        where: { slug }
    });
    if (!tenant || !tenant.ativo) {
        res.status(404).json({ message: 'Revenda não encontrada' });
        return;
    }
    req.tenantId = tenant.id;
    next();
}
//depois disso rotas usam tenantID
