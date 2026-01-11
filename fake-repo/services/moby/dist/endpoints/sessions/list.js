"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSessions = listSessions;
const logger_1 = require("@tw/utils/module/logger");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const db_1 = require("../../db");
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
async function listSessions(data) {
    const { shopId, page, limit } = data;
    logger_1.logger.debug({ shopId, page, limit }, 'Sessions history request');
    if (!shopId) {
        logger_1.logger.warn({ shopId }, 'Missing shop ID');
        throw new endpoint_1.BadRequestErrorResponse('Shop ID is required');
    }
    const parsedPage = page ? parseInt(page, 10) : DEFAULT_PAGE;
    const parsedLimit = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
    const validatedPage = validateInt(parsedPage, DEFAULT_PAGE);
    const validatedLimit = validateInt(parsedLimit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    try {
        const [sessions, totalCount] = await Promise.all([
            (0, db_1.getSessionsByShopIdPaginated)(shopId, validatedPage, validatedLimit),
            (0, db_1.getSessionsCountByShopId)(shopId),
        ]);
        const totalPages = Math.ceil(totalCount / validatedLimit);
        const pagination = {
            page: validatedPage,
            limit: validatedLimit,
            total: totalCount,
            totalPages: totalPages,
            hasNextPage: validatedPage < totalPages,
            hasPreviousPage: validatedPage > 1,
        };
        const response = {
            conversations: sessions,
            pagination,
        };
        logger_1.logger.debug({
            shopId,
            page: validatedPage,
            limit: validatedLimit,
            sessionCount: sessions.length,
            totalCount,
        }, 'Sessions history retrieved successfully');
        return new endpoint_1.SuccessResponse(response);
    }
    catch (error) {
        if (error instanceof endpoint_1.ErrorResponse) {
            throw error;
        }
        logger_1.logger.error({ error, shopId, page, limit }, 'Failed to get sessions history');
        throw new endpoint_1.ServerErrorResponse('Failed to retrieve sessions history');
    }
}
const validateInt = (value, defaultValue, min = 1, max = Infinity) => Math.min(max, Math.max(min, Math.floor(value) || defaultValue));
//# sourceMappingURL=list.js.map