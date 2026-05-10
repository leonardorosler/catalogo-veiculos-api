"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Combustivel = exports.Cambio = exports.PrismaClient = void 0;
var client_1 = require("../../node_modules/.prisma/client/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
var enums_1 = require("../../node_modules/.prisma/client/enums");
Object.defineProperty(exports, "Cambio", { enumerable: true, get: function () { return enums_1.Cambio; } });
Object.defineProperty(exports, "Combustivel", { enumerable: true, get: function () { return enums_1.Combustivel; } });
