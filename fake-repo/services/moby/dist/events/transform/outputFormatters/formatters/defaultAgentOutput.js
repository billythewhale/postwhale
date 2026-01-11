"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDefaultAgentOutput = formatDefaultAgentOutput;
function formatDefaultAgentOutput(ctx) {
    try {
        const parsed = JSON.parse(ctx.output);
        return {
            rawOutput: ctx.output,
            parsedOutput: {
                status: parsed.status ?? null,
                summary: parsed.summary ?? null,
                clarifications: parsed.clarifications ?? null,
                refuse_reason: parsed.refuse_reason ?? null,
                error_details: parsed.error_details ?? null,
            },
        };
    }
    catch {
        return {
            rawOutput: ctx.output,
            parsedOutput: null,
        };
    }
}
//# sourceMappingURL=defaultAgentOutput.js.map