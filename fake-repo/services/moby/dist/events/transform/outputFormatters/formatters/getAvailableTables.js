"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatGetAvailableTables = void 0;
function getTableDocUrl(tableName) {
    const urlKey = tableName.replace(/_tvf$/, '_table');
    const docSlug = urlKey.split('_').join('-');
    return `https://triplewhale.readme.io/docs/${docSlug}`;
}
function formatTableName(tableName) {
    return tableName
        .replace(/_table$/, '')
        .replace(/_tvf$/, '')
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
function formatTables(tableNames) {
    return tableNames.map((name) => ({
        name,
        displayName: formatTableName(name),
        docUrl: getTableDocUrl(name),
    }));
}
const formatGetAvailableTables = (ctx) => {
    const hasError = !!ctx.typedOutput.error;
    return {
        rawOutput: ctx.output,
        parsedOutput: {
            tables: hasError ? [] : formatTables(Object.keys(ctx.typedOutput.tables)),
            status: hasError ? 'error' : 'success',
        },
    };
};
exports.formatGetAvailableTables = formatGetAvailableTables;
//# sourceMappingURL=getAvailableTables.js.map