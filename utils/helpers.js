/**
 * XEROA CYBERDEFENSE
 * @author Shakir ullah - @sk-labs
 * @description Helper utilities for security operations
 * @version 1.0.0
 */

const LoginAttempt = require('../models/LoginAttemptModel');

/**
 * Get client IP address from request
 * Handles proxies, load balancers, CDNs
 * @param {Object} req - Express request object
 * @returns {String} Client IP address
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
};

/**
 * Check if identifier is blocked
 * @param {String} identifier - IP or email
 * @param {String} type - 'ip' or 'email'
 * @returns {Object|null} Block info or null
 */
const isBlocked = async (identifier, type) => {
    return await LoginAttempt.isBlocked(identifier, type);
};

/**
 * Record a failed login attempt
 * @param {String} identifier - IP or email
 * @param {String} type - 'ip' or 'email'
 * @returns {Object} Block status
 */
const recordFailure = async (identifier, type) => {
    return await LoginAttempt.recordFailure(identifier, type);
};

/**
 * Reset login attempts for identifier
 * @param {String} identifier - IP or email
 * @param {String} type - 'ip' or 'email'
 */
const resetAttempts = async (identifier, type) => {
    await LoginAttempt.resetAttempts(identifier, type);
};

/**
 * Cleanup old login attempt records
 * Run this periodically (daily recommended)
 */
const cleanup = async () => {
    return await LoginAttempt.cleanup();
};

module.exports = {
    getClientIP,
    isBlocked,
    recordFailure,
    resetAttempts,
    cleanup
};
