"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCodeExecutorArguments = void 0;
const formatCodeExecutorArguments = (ctx) => {
    let parsedArguments = { task: '', file_paths: [] };
    try {
        const parsed = JSON.parse(ctx.arguments);
        parsedArguments = {
            task: parsed.task ?? '',
            file_paths: parsed.file_paths ?? [],
        };
    }
    catch {
        // Keep default empty values if parsing fails
    }
    return {
        toolCalled: 'code_executor',
        arguments: ctx.arguments,
        parsedArguments,
    };
};
exports.formatCodeExecutorArguments = formatCodeExecutorArguments;
//# sourceMappingURL=codeExecutor.js.map