"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResolveDateRange = void 0;
const formatResolveDateRange = (ctx) => {
    // Handle missing typedOutput (e.g., from history path when parsing fails)
    if (!ctx.typedOutput) {
        return {
            rawOutput: ctx.output,
            parsedOutput: {
                startDate: '',
                endDate: '',
            },
        };
    }
    return {
        rawOutput: ctx.output,
        parsedOutput: {
            startDate: ctx.typedOutput.start_date ?? '',
            endDate: ctx.typedOutput.end_date ?? '',
        },
    };
};
exports.formatResolveDateRange = formatResolveDateRange;
//# sourceMappingURL=resolveDateRange.js.map