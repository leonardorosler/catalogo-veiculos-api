"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.buscarPorId = buscarPorId;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
exports.marcarDestaque = marcarDestaque;
exports.marcarVendido = marcarVendido;
exports.listarDestaques = listarDestaques;
const veiculosService = __importStar(require("./veiculos.service"));
function getQueryString(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value))
        return typeof value[0] === 'string' ? value[0] : undefined;
    return undefined;
}
async function listar(req, res) {
    try {
        const { marca, modelo, ano, preco_min, preco_max, combustivel, cambio } = req.query;
        const veiculos = await veiculosService.listar(req.tenantId, {
            marca: getQueryString(marca),
            modelo: getQueryString(modelo),
            ano: ano ? Number(getQueryString(ano)) : undefined,
            preco_min: preco_min ? Number(getQueryString(preco_min)) : undefined,
            preco_max: preco_max ? Number(getQueryString(preco_max)) : undefined,
            combustivel: getQueryString(combustivel),
            cambio: getQueryString(cambio),
        });
        res.json(veiculos);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function buscarPorId(req, res) {
    try {
        const veiculo = await veiculosService.buscarPorId(req.params.id, req.tenantId);
        res.json(veiculo);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
async function criar(req, res) {
    try {
        const veiculo = await veiculosService.criar(req.body, req.tenantId);
        res.status(201).json(veiculo);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function atualizar(req, res) {
    try {
        const veiculo = await veiculosService.atualizar(req.params.id, req.body, req.tenantId);
        res.json(veiculo);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function deletar(req, res) {
    try {
        await veiculosService.deletar(req.params.id, req.tenantId);
        res.status(204).send();
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
async function marcarDestaque(req, res) {
    try {
        const veiculo = await veiculosService.marcarDestaque(req.params.id, req.tenantId);
        res.json(veiculo);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
async function marcarVendido(req, res) {
    try {
        const veiculo = await veiculosService.marcarVendido(req.params.id, req.tenantId);
        res.json(veiculo);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
async function listarDestaques(req, res) {
    try {
        const veiculos = await veiculosService.listarDestaques(req.tenantId);
        res.json(veiculos);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
