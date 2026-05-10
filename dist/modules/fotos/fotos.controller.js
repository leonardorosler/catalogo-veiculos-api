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
exports.upload = upload;
exports.deletar = deletar;
const fotosService = __importStar(require("./fotos.service"));
async function upload(req, res) {
    try {
        const arquivo = req.file;
        if (!arquivo) {
            res.status(400).json({ message: 'Nenhum arquivo enviado' });
            return;
        }
        const capa = req.body.capa === 'true';
        const foto = await fotosService.upload(req.params.id, req.tenantId, arquivo, capa);
        res.status(201).json(foto);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
async function deletar(req, res) {
    try {
        await fotosService.deletar(req.params.id, req.tenantId);
        res.status(204).send();
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}
