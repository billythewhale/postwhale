"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStreamRequestMiddleware = validateStreamRequestMiddleware;
const redisStreamHelpers_1 = require("../helpers/redisStreamHelpers");
const logger_1 = require("@tw/utils/module/logger");
/**
 * Express middleware to validate stream request parameters
 * Returns 400 Bad Request if lastId format is invalid
 * Formats the lastId in place for the endpoint to use
 */
function validateStreamRequestMiddleware(req, res, next) {
    try {
        const taskId = req.params.taskId;
        const lastId = req.query.lastId;
        if (lastId) {
            const formattedLastId = (0, redisStreamHelpers_1.formatRedisStreamId)(lastId);
            req.query.lastId = formattedLastId;
            logger_1.logger.debug({
                taskId,
                rawLastId: lastId,
                formattedLastId,
            }, 'Validated and formatted Redis Stream ID');
        }
        next();
    }
    catch (error) {
        logger_1.logger.error({
            error: error.message,
            query: req.query,
            taskId: req.params.taskId,
        }, 'Invalid stream request');
        res.status(400).json({ error: error.message });
    }
}
//# sourceMappingURL=streamValidation.js.map