"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCreativeTool = void 0;
const utils_1 = require("../utils");
const formatCreativeTool = async (ctx) => {
    // Handle missing typedOutput - assume raw output is an error message
    if (!ctx.typedOutput) {
        return {
            rawOutput: ctx.output,
            parsedOutput: {
                inputUrls: [],
                outputUrls: [],
                output: [],
                summary_result: '',
                error: ctx.output || 'Unknown error',
            },
        };
    }
    const outputUrls = ctx.typedOutput.output_files ?? [];
    const output = await (0, utils_1.generateSignedUrlsForFiles)(ctx.streamConfig.workingDir, outputUrls);
    // input_files contains objects with { path, mime } - extract the path URLs
    const inputFiles = ctx.typedOutput.input_files ?? [];
    const inputUrls = inputFiles
        .map((file) => file?.path)
        .filter((url) => !!url);
    return {
        rawOutput: ctx.output,
        parsedOutput: {
            inputUrls,
            outputUrls,
            output,
            summary_result: ctx.typedOutput.summary_result,
            error: ctx.typedOutput.error || null,
        },
    };
};
exports.formatCreativeTool = formatCreativeTool;
//# sourceMappingURL=creativeGeneration.js.map