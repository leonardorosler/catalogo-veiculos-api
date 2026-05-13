"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const veiculos_routes_1 = __importDefault(require("./modules/veiculos/veiculos.routes"));
const fotos_routes_1 = __importDefault(require("./modules/fotos/fotos.routes"));
const favoritos_routes_1 = __importDefault(require("./modules/favoritos/favoritos.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const leads_routes_1 = __importDefault(require("./modules/leads/leads.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', auth_routes_1.default);
app.use('/veiculos', veiculos_routes_1.default);
app.use('/', fotos_routes_1.default);
app.use('/favoritos', favoritos_routes_1.default);
app.use('/admin', admin_routes_1.default);
app.use('/leads', leads_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ ok: true });
});
exports.default = app;
