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
exports.getDashboardsRouter = getDashboardsRouter;
const path = __importStar(require("path"));
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const express_1 = require("@tw/utils/module/express");
const gcs = __importStar(require("@tw/utils/module/gcs"));
const express_2 = require("express");
// TODO: FIX BEFORE DEPLOYING!!!!!!!!
const AI_MOBY_BUCKET = 'ai-moby-shofifi';
const SESSION_FILES_DIR = 'session_files';
function getDashboardsRouter() {
    const router = (0, express_2.Router)();
    // Get the files for a dashboard from GCS
    router.get('/files', (0, express_1.apiConfig)({
        openApi: {
            interfaces: ['client'],
            security: { firebase: [] },
        },
        auth: {
            serviceId: 'shopify',
            accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
        },
    }), (0, endpoint_1.createEndpoint)(getDashboardFiles));
    return router;
}
async function getDashboardFiles({ sessionId, object, shopId, }) {
    const client = gcs.getStorageClient({ forceCloud: true });
    if (!object.endsWith('.zip')) {
        throw new Error('Only .zip files are supported');
    }
    const objectUrl = path.join(SESSION_FILES_DIR, shopId, sessionId, object);
    const stream = client.bucket(AI_MOBY_BUCKET).file(objectUrl).createReadStream();
    return new endpoint_1.SuccessResponse(stream);
}
//# sourceMappingURL=dashboards.js.map