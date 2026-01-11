"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToolArguments = formatToolArguments;
const toolRegistry_1 = require("../toolRegistry");
function formatToolArguments(ctx) {
    const entry = toolRegistry_1.toolRegistry[ctx.toolName];
    return entry.argumentFormatter(ctx);
}
//# sourceMappingURL=index.js.map