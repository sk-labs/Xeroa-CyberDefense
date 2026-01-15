/**
 * XEROA CYBERDEFENSE
 * @author Shakir ullah - @sk-labs
 * @description Rate limiting and brute force protection middleware
 * @version 1.0.0
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * Helper function to get client IP address
 * Handles proxy scenarios (Heroku, Cloudflare, Nginx, etc.)
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
};

/**
 * Global rate limiter for all requests
 * Protects against DDoS attacks
 * Layer 1: General protection
 */
const globalLimiter = rateLimit({
    windowMs: config.get('globalWindow'),
    max: config.get('globalLimit'),
    message: '⚠️ Too many requests from this IP. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    
    // Skip rate limiting for:
    // 1. Authenticated users (logged in staff) - They need unlimited requests for work
    // 2. Static assets (CSS, JS, images, fonts)
    skip: (req) => {
        // Skip for authenticated users - Check multiple session field patterns
        if (req.session && (req.session.userid || req.session.userId || req.session.user)) {
            return true; // Authenticated users bypass global limiter completely
        }
        
        // Skip for static assets (CSS, JS, images, fonts, etc.)
        if (req.path.startsWith('/assets/') || 
            req.path.startsWith('/public/') ||
            req.path.startsWith('/static/') ||
            req.path.startsWith('/dist/') ||
            req.path.endsWith('.css') ||
            req.path.endsWith('.js') ||
            req.path.endsWith('.png') ||
            req.path.endsWith('.jpg') ||
            req.path.endsWith('.jpeg') ||
            req.path.endsWith('.gif') ||
            req.path.endsWith('.svg') ||
            req.path.endsWith('.ico') ||
            req.path.endsWith('.woff') ||
            req.path.endsWith('.woff2') ||
            req.path.endsWith('.ttf') ||
            req.path.endsWith('.eot')) {
            return true;
        }
        
        return false; // Apply rate limit to unauthenticated requests
    },
    
    handler: (req, res) => {
        const clientIP = getClientIP(req);
        console.log(`🚨 Xeroa: Global rate limit exceeded for IP: ${clientIP}`);
        
        // Check if it's an API request (return JSON for API)
        if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'You have exceeded the rate limit. Please try again later.',
                retryAfter: req.rateLimit.resetTime,
                security: 'Xeroa CyberDefense'
            });
        }
        
        // Render professional security page for web requests
        const securityViewPath = config.get('securityViewPath') || 'auth/auth-rate-limit';
        res.status(429).render(securityViewPath, {
            title: 'Rate Limit Exceeded',
            layout: config.get('layout') || 'layouts/layout-without-nav',
            clientIP: clientIP,
            retryAfter: req.rateLimit.resetTime - Date.now(),
            HeaderCss: '',
            FooterJs: ''
        });
    }
});

/**
 * Stricter rate limiter for login attempts
 * Prevents brute force attacks on authentication
 * Layer 2: Login protection
 */
const loginLimiter = rateLimit({
    windowMs: config.get('loginWindow'),
    max: config.get('loginLimit'),
    skipSuccessfulRequests: false,
    message: '⚠️ Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const clientIP = getClientIP(req);
        console.log(`🚨 Xeroa: Login rate limit exceeded for IP: ${clientIP}`);
        
        const securityViewPath = config.get('securityViewPath') || 'auth/auth-rate-limit';
        res.status(429).render(securityViewPath, {
            title: 'Too Many Login Attempts',
            layout: config.get('layout') || 'layouts/layout-without-nav',
            clientIP: clientIP,
            retryAfter: req.rateLimit.resetTime - Date.now(),
            HeaderCss: '',
            FooterJs: ''
        });
    }
});

/**
 * API endpoint rate limiter
 * More lenient for API calls but still protected
 */
const apiLimiter = rateLimit({
    windowMs: config.get('apiWindow'),
    max: config.get('apiLimit'),
    message: '⚠️ Too many API requests. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'API rate limit exceeded',
            message: 'Too many API requests. Please slow down.',
            retryAfter: req.rateLimit.resetTime,
            security: 'Xeroa CyberDefense'
        });
    }
});

/**
 * Strict limiter for sensitive operations
 * Password resets, profile updates, etc.
 */
const strictLimiter = rateLimit({
    windowMs: config.get('strictWindow'),
    max: config.get('strictLimit'),
    message: '⚠️ Too many sensitive operations. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const clientIP = getClientIP(req);
        console.log(`🚨 Xeroa: Strict rate limit exceeded for IP: ${clientIP} on ${req.path}`);
        
        // Check if it's a password reset or sensitive operation
        if (req.path.includes('forgotpassword') || req.path.includes('resetpassword') || req.path.includes('changepassword')) {
            const securityViewPath = config.get('securityViewPath') || 'auth/auth-rate-limit';
            return res.status(429).render(securityViewPath, {
                title: 'Too Many Attempts',
                layout: config.get('layout') || 'layouts/layout-without-nav',
                clientIP: clientIP,
                retryAfter: req.rateLimit.resetTime - Date.now(),
                HeaderCss: '',
                FooterJs: ''
            });
        }
        
        // For other sensitive operations, use flash or redirect
        if (req.flash) {
            req.flash('error', 'Too many attempts. Please wait before trying again.');
            return res.redirect('back');
        }
        
        res.status(429).json({
            error: 'Too many attempts',
            message: 'Please wait before trying again.',
            retryAfter: req.rateLimit.resetTime,
            security: 'Xeroa CyberDefense'
        });
    }
});

module.exports = {
    globalLimiter,
    loginLimiter,
    apiLimiter,
    strictLimiter,
    getClientIP
};
