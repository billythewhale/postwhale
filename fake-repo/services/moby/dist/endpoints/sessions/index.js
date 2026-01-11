"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionsRouter = getSessionsRouter;
const express_1 = require("express");
const express_2 = require("@tw/utils/module/express");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const getSession_1 = require("./getSession");
const list_1 = require("./list");
const branch_1 = require("./branch");
function getSessionsRouter() {
    const router = (0, express_1.Router)();
    router.use((0, endpoint_1.debugLogsWithDataMw)('debug'));
    router.get('/get', (0, express_2.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(getSession_1.getSession));
    router.get('/list', (0, express_2.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(list_1.listSessions));
    router.get('/branch', (0, express_2.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(branch_1.getBranch));
    return router;
}
//# sourceMappingURL=index.js.map