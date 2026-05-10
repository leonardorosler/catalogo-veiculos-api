"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../lib/prisma");
async function register(nome, email, senha, tenantId) {
    const existe = await prisma_1.prisma.usuario.findUnique({ where: { email } });
    if (existe)
        throw new Error('Email já cadastrado');
    const hash = await bcryptjs_1.default.hash(senha, 10);
    const usuario = await prisma_1.prisma.usuario.create({
        data: { nome, email, senha: hash, tenantId },
        select: { id: true, nome: true, email: true, role: true }
    });
    return usuario;
}
async function login(email, senha) {
    const usuario = await prisma_1.prisma.usuario.findUnique({ where: { email } });
    if (!usuario)
        throw new Error('Credenciais inválidas');
    const senhaValida = await bcryptjs_1.default.compare(senha, usuario.senha);
    if (!senhaValida)
        throw new Error('Credenciais inválidas');
    const token = jsonwebtoken_1.default.sign({ userId: usuario.id, tenantId: usuario.tenantId, role: usuario.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role } };
}
