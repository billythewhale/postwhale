"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camelizeObj = camelizeObj;
exports.snakifyObj = snakifyObj;
const string_1 = require("@tw/utils/module/string");
function camelizeObj(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
        return obj;
    }
    const newObj = {};
    for (const key in obj) {
        const newKey = typeof key === 'string' ? (0, string_1.camel)(key) : key;
        const value = obj[key];
        newObj[newKey] = camelizeObj(value);
    }
    return newObj;
}
function snakifyObj(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
        return obj;
    }
    const newObj = {};
    for (const key in obj) {
        const newKey = typeof key === 'string'
            ? key
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
                .toLowerCase()
                .replace(/^_/, '')
            : key;
        const value = obj[key];
        newObj[newKey] = snakifyObj(value);
    }
    return newObj;
}
//# sourceMappingURL=util.js.map