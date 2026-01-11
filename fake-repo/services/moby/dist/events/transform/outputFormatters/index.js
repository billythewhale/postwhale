"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToolOutput = formatToolOutput;
const toolRegistry_1 = require("../toolRegistry");
async function formatToolOutput(ctx) {
    const entry = toolRegistry_1.toolRegistry[ctx.toolName];
    return entry.outputFormatter(ctx);
}
//# sourceMappingURL=index.js.map