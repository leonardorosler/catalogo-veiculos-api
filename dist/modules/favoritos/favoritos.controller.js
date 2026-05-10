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
exports.favoritar = favoritar;
exports.desfavoritar = desfavoritar;
exports.listar = listar;
const favoritosService = __importStar(require("./favoritos.service"));
function getQueryString(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value))
        return typeof value[0] === 'string' ? value[0] : undefined;
    return undefined;
}
async function favoritar(req, res) {
    try {
        const { sessionId, veiculoId } = req.body;
        if (!sessionId || !veiculoId) {
            res.status(400).json({ message: 'sessionId e veiculoId são obrigatórios' });
            return;
        }
        const favorito = await favoritosService.favoritar(sessionId, veiculoId);
        res.status(201).json(favorito);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function desfavoritar(req, res) {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({ message: 'sessionId é obrigatório' });
            return;
        }
        await favoritosService.desfavoritar(sessionId, req.params.veiculoId);
        res.status(204).send();
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
async function listar(req, res) {
    try {
        const sessionId = getQueryString(req.query.sessionId);
        if (!sessionId) {
            res.status(400).json({ message: 'sessionId é obrigatório' });
            return;
        }
        const veiculos = await favoritosService.listar(sessionId);
        res.json(veiculos);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
