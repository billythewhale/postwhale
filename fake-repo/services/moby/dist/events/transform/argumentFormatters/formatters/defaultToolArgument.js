"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDefaultToolArgument = formatDefaultToolArgument;
function formatDefaultToolArgument(ctx) {
    return {
        toolCalled: ctx.toolName,
        arguments: ctx.arguments,
        parsedArguments: null,
    };
}
//# sourceMappingURL=defaultToolArgument.js.map