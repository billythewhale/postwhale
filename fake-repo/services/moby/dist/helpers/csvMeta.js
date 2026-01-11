"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCsvMetaFilePath = buildCsvMetaFilePath;
exports.extractCsvMetaInfo = extractCsvMetaInfo;
const node_path_1 = __importDefault(require("node:path"));
function buildCsvMetaFilePath(csvFilePath) {
    const posixPath = node_path_1.default.posix;
    const dir = posixPath.dirname(csvFilePath);
    const base = posixPath.basename(csvFilePath, posixPath.extname(csvFilePath));
    const metaName = `${base}.meta.json`;
    return dir === '.' ? metaName : posixPath.join(dir, metaName);
}
function coerceFiniteNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function extractCsvMetaInfo(meta) {
    if (!meta || typeof meta !== 'object') {
        return { totalRows: null, sql: null };
    }
    const rowCount = coerceFiniteNumber(meta.row_count);
    const sqlValue = meta.sql;
    const sql = typeof sqlValue === 'string' && sqlValue.trim() ? sqlValue : null;
    return {
        totalRows: rowCount,
        sql,
    };
}
//# sourceMappingURL=csvMeta.js.map