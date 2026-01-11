"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePythonRepr = parsePythonRepr;
exports.parseGcsUrl = parseGcsUrl;
exports.generateSignedUrl = generateSignedUrl;
exports.generateSignedUrlsForFiles = generateSignedUrlsForFiles;
const gcs_1 = require("@tw/utils/module/gcs");
const logger_1 = require("@tw/utils/module/logger");
const secrets_1 = require("@tw/utils/module/secrets");
function parsePythonRepr(output) {
    const result = {};
    const regex = /(\w+)='([^']*)'/g;
    let match;
    while ((match = regex.exec(output)) !== null) {
        result[match[1]] = match[2];
    }
    return result;
}
function parseGcsUrl(gcsUrl) {
    const match = gcsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
        logger_1.logger.warn({ gcsUrl }, 'Invalid GCS URL format');
        return null;
    }
    return {
        bucketName: match[1],
        basePath: match[2],
    };
}
async function generateSignedUrl(params) {
    const { bucketName, fileName, msForExpiration = 7200000 } = params; // 2 hours
    const storage = (0, gcs_1.getStorageClient)({
        forceCloud: true,
        storageOptions: {
            credentials: {
                private_key: (0, secrets_1.getSecret)('SERVICE_ACCOUNT_PRIVATE_KEY'),
                client_email: (0, secrets_1.getSecret)('SERVICE_ACCOUNT_EMAIL'),
            },
        },
    });
    const [url] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + msForExpiration,
    });
    return url;
}
async function generateSignedUrlsForFiles(workingDir, filePaths) {
    const gcsPath = parseGcsUrl(workingDir);
    if (!gcsPath) {
        return [];
    }
    const results = [];
    for (const filePath of filePaths) {
        try {
            const fullPath = `${gcsPath.basePath}/${filePath}`;
            const signedUrl = await generateSignedUrl({
                bucketName: gcsPath.bucketName,
                fileName: fullPath,
            });
            results.push({ filename: filePath, signedUrl });
        }
        catch (error) {
            logger_1.logger.error({ error, filePath, workingDir }, 'Failed to generate signed URL');
        }
    }
    return results;
}
//# sourceMappingURL=utils.js.map