"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filePreviewEndpoint = filePreviewEndpoint;
const node_path_1 = __importDefault(require("node:path"));
const gcs_1 = require("@tw/utils/module/gcs");
const logger_1 = require("@tw/utils/module/logger");
const secrets_1 = require("@tw/utils/module/secrets");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const utils_1 = require("../events/transform/outputFormatters/utils");
const csvChunk_1 = require("../helpers/csvChunk");
const csvMeta_1 = require("../helpers/csvMeta");
const DEFAULT_START = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const IMAGE_EXTENSIONS = new Set([
    'apng',
    'avif',
    'bmp',
    'gif',
    'heic',
    'heif',
    'jpeg',
    'jpg',
    'png',
    'svg',
    'tif',
    'tiff',
    'webp',
]);
const VIDEO_EXTENSIONS = new Set(['avi', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'webm']);
const WEBPAGE_EXTENSIONS = new Set(['html']);
function normalizeExtension(filePath, fileExtension) {
    const rawExt = (fileExtension || node_path_1.default.extname(filePath)).toLowerCase();
    return rawExt.startsWith('.') ? rawExt.slice(1) : rawExt;
}
function validatePositiveInt(value, defaultValue, max = Infinity) {
    if (!Number.isFinite(value))
        return defaultValue;
    return Math.min(max, Math.max(1, Math.floor(value)));
}
function sanitizeRelativeGcsPath(filePath) {
    const trimmed = filePath.trim();
    if (!trimmed) {
        throw new endpoint_1.BadRequestErrorResponse('filePath is required');
    }
    if (trimmed.includes('\0') || /[\r\n]/.test(trimmed)) {
        throw new endpoint_1.BadRequestErrorResponse('filePath contains invalid characters');
    }
    if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
        throw new endpoint_1.BadRequestErrorResponse('filePath must be relative to workingDir');
    }
    const parts = trimmed.split('/').filter(Boolean);
    if (parts.some((p) => p === '..')) {
        throw new endpoint_1.BadRequestErrorResponse('filePath must not contain ".." segments');
    }
    return parts.join('/');
}
let cachedStorage = null;
function getAuthedStorageClient() {
    cachedStorage ??= (0, gcs_1.getStorageClient)({
        forceCloud: true,
        storageOptions: {
            credentials: {
                private_key: (0, secrets_1.getSecret)('SERVICE_ACCOUNT_PRIVATE_KEY'),
                client_email: (0, secrets_1.getSecret)('SERVICE_ACCOUNT_EMAIL'),
            },
        },
    });
    return cachedStorage;
}
async function getSignedUrlForMediaFile(params) {
    const { bucketName, basePath, safeFilePath, mediaKind } = params;
    const normalizedWorkingDir = `gs://${bucketName}/${basePath}`;
    const signedFiles = await (0, utils_1.generateSignedUrlsForFiles)(normalizedWorkingDir, [safeFilePath]);
    const signedUrl = signedFiles[0]?.signedUrl;
    if (!signedUrl) {
        throw new endpoint_1.ServerErrorResponse('Failed to generate signed URL for file');
    }
    return { kind: mediaKind, signedUrl };
}
async function streamCSVFile(params) {
    const { storage, bucketName, basePath, fullPath, safeFilePath, start, limit, workingDir, filePath, } = params;
    const parsedStart = validatePositiveInt(start ? parseInt(start, 10) : DEFAULT_START, DEFAULT_START);
    const parsedLimit = validatePositiveInt(limit ? parseInt(limit, 10) : DEFAULT_LIMIT, DEFAULT_LIMIT, MAX_LIMIT);
    const file = storage.bucket(bucketName).file(fullPath);
    const stream = file.createReadStream();
    const [chunkResult, metaResult] = await Promise.allSettled([
        (0, csvChunk_1.readCsvChunkFromStream)(stream, {
            start: parsedStart,
            limit: parsedLimit,
        }),
        tryLoadCsvMeta(storage, {
            bucketName,
            basePath,
            csvRelativePath: safeFilePath,
        }),
    ]);
    if (chunkResult.status === 'rejected') {
        throw chunkResult.reason;
    }
    const metaInfo = metaResult.status === 'fulfilled' ? metaResult.value : { totalRows: null, sql: null };
    if (metaResult.status === 'rejected') {
        logger_1.logger.warn({ error: metaResult.reason, workingDir, filePath }, 'Failed to load CSV meta info (ignored)');
    }
    const { content, returned } = chunkResult.value;
    return {
        kind: 'csv',
        content: (0, csvChunk_1.csvContentToTableData)(content),
        start: parsedStart,
        limit: parsedLimit,
        returned,
        totalRows: metaInfo.totalRows,
        sql: metaInfo.sql,
    };
}
async function filePreviewEndpoint(data) {
    const { workingDir, filePath, fileExtension, start, limit } = data;
    if (!workingDir) {
        throw new endpoint_1.BadRequestErrorResponse('workingDir is required');
    }
    if (!filePath) {
        throw new endpoint_1.BadRequestErrorResponse('filePath is required');
    }
    const gcsPath = (0, utils_1.parseGcsUrl)(workingDir);
    if (!gcsPath) {
        throw new endpoint_1.BadRequestErrorResponse('workingDir must be a valid gs:// URL', { workingDir });
    }
    const safeFilePath = sanitizeRelativeGcsPath(filePath);
    const basePath = gcsPath.basePath.replace(/\/+$/, '');
    const fullPath = `${basePath}/${safeFilePath}`;
    const ext = normalizeExtension(safeFilePath, fileExtension);
    let mediaKind = null;
    if (IMAGE_EXTENSIONS.has(ext)) {
        mediaKind = 'image';
    }
    else if (VIDEO_EXTENSIONS.has(ext)) {
        mediaKind = 'video';
    }
    else if (WEBPAGE_EXTENSIONS.has(ext)) {
        mediaKind = 'webpage';
    }
    try {
        const storage = getAuthedStorageClient();
        const file = storage.bucket(gcsPath.bucketName).file(fullPath);
        const [exists] = await file.exists();
        if (!exists) {
            throw new endpoint_1.NotFoundErrorResponse('File not found', { workingDir, filePath });
        }
        if (mediaKind) {
            const response = await getSignedUrlForMediaFile({
                bucketName: gcsPath.bucketName,
                basePath,
                safeFilePath,
                mediaKind,
            });
            return new endpoint_1.SuccessResponse(response);
        }
        if (ext !== 'csv') {
            const downloaded = await file.download();
            const buffer = Array.isArray(downloaded) ? downloaded[0] : downloaded;
            return new endpoint_1.SuccessResponse({ kind: 'file', content: buffer.toString('utf8') });
        }
        const response = await streamCSVFile({
            storage,
            bucketName: gcsPath.bucketName,
            basePath,
            fullPath,
            safeFilePath,
            start,
            limit,
            workingDir,
            filePath,
        });
        return new endpoint_1.SuccessResponse(response);
    }
    catch (error) {
        if (error instanceof endpoint_1.ErrorResponse) {
            throw error;
        }
        logger_1.logger.error({ error, workingDir, filePath, start, limit }, 'Failed to read file preview from GCS');
        throw new endpoint_1.ServerErrorResponse('Failed to read file preview');
    }
}
async function tryLoadCsvMeta(storage, params) {
    const { bucketName, basePath, csvRelativePath } = params;
    const metaRelativePath = (0, csvMeta_1.buildCsvMetaFilePath)(csvRelativePath);
    const metaFullPath = `${basePath}/${metaRelativePath}`;
    try {
        const metaFile = storage.bucket(bucketName).file(metaFullPath);
        const downloaded = await metaFile.download();
        const buffer = Array.isArray(downloaded) ? downloaded[0] : downloaded;
        const parsed = JSON.parse(buffer.toString('utf8'));
        return (0, csvMeta_1.extractCsvMetaInfo)(parsed);
    }
    catch (error) {
        const code = error?.code;
        if (code === 404) {
            return { totalRows: null, sql: null };
        }
        logger_1.logger.warn({ error, bucketName, metaFullPath }, 'Failed to read CSV meta file (ignored)');
        return { totalRows: null, sql: null };
    }
}
//# sourceMappingURL=filePreview.js.map