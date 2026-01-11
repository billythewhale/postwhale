"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMobySessionFilesBucketName = getMobySessionFilesBucketName;
exports.getEffectiveWorkingDir = getEffectiveWorkingDir;
const constants_1 = require("@tw/constants");
const MOBY_BUCKET_STAGING = 'ai-moby-triple-whale-staging';
const MOBY_BUCKET_PROD = 'ai-moby-shofifi';
function getMobySessionFilesBucketName() {
    return constants_1.isStaging ? MOBY_BUCKET_STAGING : MOBY_BUCKET_PROD;
}
function getEffectiveWorkingDir(params) {
    const { workingDir, shopId, sessionId } = params;
    if (workingDir) {
        return workingDir;
    }
    if (!shopId || !sessionId || sessionId === 'new') {
        return undefined;
    }
    return `gs://${getMobySessionFilesBucketName()}/session_files/${shopId}/${sessionId}`;
}
//# sourceMappingURL=workingDir.js.map