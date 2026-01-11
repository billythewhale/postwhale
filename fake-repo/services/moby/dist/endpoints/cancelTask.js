"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTaskEndpoint = cancelTaskEndpoint;
const callServiceEndpoint_1 = require("@tw/utils/module/callServiceEndpoint");
const logger_1 = require("@tw/utils/module/logger");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
async function cancelTaskEndpoint(data) {
    const { user, shopId, taskId, mode = 'after_turn' } = data;
    const userId = user?.user_id;
    if (!userId) {
        throw new endpoint_1.UnauthorizedErrorResponse('user token is missing');
    }
    if (!shopId) {
        throw new endpoint_1.UnauthorizedErrorResponse('shopId header is missing');
    }
    if (!taskId) {
        throw new endpoint_1.BadRequestErrorResponse('taskId is required');
    }
    try {
        const { data: aiMobyResponse } = await (0, callServiceEndpoint_1.callServiceEndpoint)('ai-moby', `tasks/cancel/${taskId}`, undefined, { method: 'POST', params: { mode } });
        const response = {
            taskId: aiMobyResponse.task_id,
            status: aiMobyResponse.status,
            wasCancelled: aiMobyResponse.status === 'cancelled',
        };
        return new endpoint_1.SuccessResponse(response);
    }
    catch (err) {
        logger_1.logger.error({ err, taskId, shopId }, 'Cancel task endpoint error');
        if (err.response?.status === 404) {
            throw new endpoint_1.BadRequestErrorResponse('Task not found or expired');
        }
        throw new endpoint_1.ServerErrorResponse('Failed to cancel task');
    }
}
//# sourceMappingURL=cancelTask.js.map