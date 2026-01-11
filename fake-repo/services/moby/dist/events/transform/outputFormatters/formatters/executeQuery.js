"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatExecuteQuery = void 0;
const formatExecuteQuery = (ctx) => {
    const { typedOutput } = ctx;
    // Handle missing typedOutput - assume raw output is an error message
    if (!typedOutput) {
        return {
            rawOutput: ctx.output,
            parsedOutput: {
                message: '',
                filenames: null,
                data: [],
                bq: 0,
                dataColumns: { x: [], y: [] },
                parameters: [],
                totalRows: null,
                error: ctx.output || 'Unknown error',
            },
        };
    }
    const dataSnippet = typedOutput.data_snippet;
    // Transform columns/rows to data format: { name: string; value: string[] }[]
    const data = [];
    if (dataSnippet?.columns && dataSnippet?.rows) {
        for (let colIndex = 0; colIndex < dataSnippet.columns.length; colIndex++) {
            const columnName = dataSnippet.columns[colIndex];
            const columnValues = dataSnippet.rows.map((row) => row[colIndex] ?? '');
            data.push({ name: columnName, value: columnValues });
        }
    }
    const dataColumns = {
        x: dataSnippet?.columns ?? [],
        y: [],
    };
    return {
        rawOutput: ctx.output,
        parsedOutput: {
            message: typedOutput.message,
            filenames: typedOutput.file_paths ?? null,
            data,
            bq: 0,
            dataColumns,
            parameters: [],
            totalRows: dataSnippet?.total_rows ?? null,
            error: typedOutput.error ?? null,
        },
    };
};
exports.formatExecuteQuery = formatExecuteQuery;
//# sourceMappingURL=executeQuery.js.map