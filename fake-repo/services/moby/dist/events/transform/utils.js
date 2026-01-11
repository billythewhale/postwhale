"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_AGENT_SET = void 0;
exports.isAllowedAgent = isAllowedAgent;
exports.isToolName = isToolName;
exports.isAllowedName = isAllowedName;
const toolRegistry_1 = require("./toolRegistry");
const ALLOWED_AGENTS = [
    'Moby',
    'CodeExecutorAgent',
    'ComputerUseAgent',
    'master_moby_agent',
];
exports.ALLOWED_AGENT_SET = new Set(ALLOWED_AGENTS);
function isAllowedAgent(name) {
    return exports.ALLOWED_AGENT_SET.has(name);
}
function isToolName(name) {
    return toolRegistry_1.TOOL_NAME_SET.has(name);
}
function isAllowedName(name) {
    return toolRegistry_1.ALLOWED_NAME_SET.has(name);
}
//# sourceMappingURL=utils.js.map