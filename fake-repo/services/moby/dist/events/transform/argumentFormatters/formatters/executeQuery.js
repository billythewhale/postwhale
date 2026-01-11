"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatExecuteQueryArguments = void 0;
const formatExecuteQueryArguments = (ctx) => {
    let parsedArguments = { query: '', file_path: '' };
    try {
        const parsed = JSON.parse(ctx.arguments);
        const inputData = parsed.input_data ?? {};
        parsedArguments = {
            query: inputData.query ?? '',
            file_path: inputData.file_path ?? '',
        };
    }
    catch {
        // Keep default empty values if parsing fails
    }
    return {
        toolCalled: 'execute_query',
        arguments: ctx.arguments,
        parsedArguments,
    };
};
exports.formatExecuteQueryArguments = formatExecuteQueryArguments;
//# sourceMappingURL=executeQuery.js.map