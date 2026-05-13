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
exports.venderCarro = venderCarro;
exports.financiamento = financiamento;
exports.listarLeads = listarLeads;
exports.marcarLido = marcarLido;
const leadsService = __importStar(require("./leads.service"));
async function venderCarro(req, res) {
    try {
        const { nome, telefone, email, ...dados } = req.body;
        if (!nome || !telefone || !dados.marca || !dados.modelo || !dados.ano || !dados.km || !dados.condicao) {
            res.status(400).json({ message: 'Preencha todos os campos obrigatórios' });
            return;
        }
        const lead = await leadsService.criarLeadVenderCarro(req.tenantId, nome, telefone, email, dados);
        res.status(201).json(lead);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function financiamento(req, res) {
    try {
        const { nome, telefone, email, ...dados } = req.body;
        if (!nome || !telefone || !dados.veiculoInteresse || !dados.valorEntrada || !dados.prazo) {
            res.status(400).json({ message: 'Preencha todos os campos obrigatórios' });
            return;
        }
        const lead = await leadsService.criarLeadFinanciamento(req.tenantId, nome, telefone, email, dados);
        res.status(201).json(lead);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function listarLeads(req, res) {
    try {
        const tipo = req.query.tipo;
        const leads = await leadsService.listarLeads(req.tenantId, tipo);
        res.json(leads);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function marcarLido(req, res) {
    try {
        const lead = await leadsService.marcarLido(req.params.id, req.tenantId);
        res.json(lead);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
