"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ALLOWED_NAME_SET = exports.TOOL_NAME_SET = void 0;
const outputFormatters = __importStar(require("./outputFormatters/formatters"));
const argumentFormatters = __importStar(require("./argumentFormatters/formatters"));
const toolRegistry = {
    resolve_date_range: {
        outputFormatter: outputFormatters.formatResolveDateRange,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    query_table_schema_info: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    similarity_search: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    gsutil: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    execute_query: {
        outputFormatter: outputFormatters.formatExecuteQuery,
        argumentFormatter: argumentFormatters.formatExecuteQueryArguments,
    },
    validate_question: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    code_executor: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    computer_use: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    creative_tool: {
        outputFormatter: outputFormatters.formatCreativeTool,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    vision: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    execute_forecast: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    prepare_data: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    save_inline_timeseries: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    manage_audiences: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    manage_creative: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    manage_optimization: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    manage_promotions: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    manage_structure: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    get_metrics: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    web_search: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    memory: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    get_metric_details: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    summary_page: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    file_manager: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    search_verified_sql_examples: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    get_knowledge_base_sources: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    get_knowledge_base_details: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    code_interpreter: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    query_knowledge_base: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
    prepare_timeseries: {
        outputFormatter: outputFormatters.formatDefaultToolOutput,
        argumentFormatter: argumentFormatters.formatDefaultToolArgument,
    },
};
exports.toolRegistry = toolRegistry;
const TOOL_NAMES = Object.keys(toolRegistry);
exports.TOOL_NAME_SET = new Set(TOOL_NAMES);
exports.ALLOWED_NAME_SET = exports.TOOL_NAME_SET;
//# sourceMappingURL=toolRegistry.js.map