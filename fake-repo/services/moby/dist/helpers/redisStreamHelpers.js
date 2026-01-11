"use strict";
/**
 * Redis Stream Helper Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRedisStreamId = formatRedisStreamId;
/**
 * Formats and validates a Redis Stream ID
 * Expected format: timestamp-sequence (e.g., 1762182163284-0)
 *
 * @param input - The input string to format
 * @returns Formatted Redis Stream ID
 * @throws Error if the input is invalid
 */
function formatRedisStreamId(input) {
    if (!input || input.trim() === '') {
        return '0-0';
    }
    const trimmedInput = input.trim();
    const fullFormatRegex = /^(\d{13})-(\d+)$/;
    const fullMatch = trimmedInput.match(fullFormatRegex);
    if (fullMatch) {
        return trimmedInput;
    }
    if (trimmedInput.includes('-')) {
        const parts = trimmedInput.split('-');
        if (parts.length !== 2) {
            throw new Error(`Invalid Redis Stream ID format: ${input}. Expected format: timestamp-sequence`);
        }
        const [timestamp, sequence] = parts;
        if (!/^\d+$/.test(timestamp) || !/^\d+$/.test(sequence)) {
            throw new Error(`Invalid Redis Stream ID format: ${input}. Both parts must be numeric`);
        }
        if (timestamp.length > 13) {
            throw new Error(`Invalid Redis Stream ID format: ${input}. Timestamp cannot exceed 13 digits`);
        }
        const paddedTimestamp = timestamp.padEnd(13, '0');
        return `${paddedTimestamp}-${sequence}`;
    }
    if (!/^\d+$/.test(trimmedInput)) {
        throw new Error(`Invalid Redis Stream ID format: ${input}. Expected numeric timestamp`);
    }
    if (trimmedInput.length > 13) {
        throw new Error(`Invalid Redis Stream ID format: ${input}. Timestamp cannot exceed 13 digits`);
    }
    const paddedTimestamp = trimmedInput.padEnd(13, '0');
    return `${paddedTimestamp}-0`;
}
//# sourceMappingURL=redisStreamHelpers.js.map