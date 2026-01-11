"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._test = void 0;
const runtime_1 = require("@tw/utils/module/runtime");
(0, runtime_1.initRuntime)();
const express_1 = require("@tw/utils/module/express");
const logger_1 = require("@tw/utils/module/logger");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const db_1 = require("./db");
const streamValidation_1 = require("./middlewares/streamValidation");
const chat_1 = require("./endpoints/chat");
const cancelTask_1 = require("./endpoints/cancelTask");
const sessions_1 = require("./endpoints/sessions");
const stream_1 = require("./endpoints/stream");
const filePreview_1 = require("./endpoints/filePreview");
const initializeFirebaseApp_1 = require("@tw/utils/module/initializeFirebaseApp");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
function getApp() {
    const { app, router } = (0, express_1.getExpressApp)({ autoOpenApi: true });
    router.use('/sessions', (0, sessions_1.getSessionsRouter)());
    router.post('/chat', (0, endpoint_1.debugLogsWithDataMw)('debug'), (0, express_1.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(chat_1.chatEndpoint));
    router.post('/tasks/cancel/:taskId', (0, express_1.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(cancelTask_1.cancelTaskEndpoint));
    router.get('/stream/:taskId', (0, express_1.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
            deployment: 'moby-stream',
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), streamValidation_1.validateStreamRequestMiddleware, (0, endpoint_1.sseEndpoint)(stream_1.streamEndpoint));
    router.get('/files/preview', (0, express_1.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(filePreview_1.filePreviewEndpoint));
    app.use(router);
    return app;
}
async function connectToPostgres() {
    logger_1.logger.debug('Initializing PostgreSQL database connection');
    try {
        await (0, db_1.initializeAiConversationsDB)();
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to initialize PostgreSQL database');
        throw err;
    }
}
async function startServer() {
    const app = getApp();
    await connectToPostgres();
    app.listen();
}
if (require.main === module) {
    (0, initializeFirebaseApp_1.initializeFirebaseApp)(firebase_admin_1.default);
    startServer();
}
exports._test = { getApp };
//# sourceMappingURL=app.js.map