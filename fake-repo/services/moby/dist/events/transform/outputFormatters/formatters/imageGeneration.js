"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatVideoGeneration = exports.formatImageGeneration = void 0;
const formatImageGeneration = (ctx) => {
    return {
        rawOutput: ctx.output,
        parsedOutput: {
            inputUrls: ctx.typedOutput.input_urls ?? [],
            outputUrls: ctx.typedOutput.output_urls ?? [],
            error: ctx.typedOutput.error || null,
        },
    };
};
exports.formatImageGeneration = formatImageGeneration;
const formatVideoGeneration = (ctx) => {
    return {
        rawOutput: ctx.output,
        parsedOutput: {
            inputUrls: ctx.typedOutput.input_urls ?? [],
            outputUrls: ctx.typedOutput.output_urls ?? [],
            error: ctx.typedOutput.error || null,
        },
    };
};
exports.formatVideoGeneration = formatVideoGeneration;
//# sourceMappingURL=imageGeneration.js.map