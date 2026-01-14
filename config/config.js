/**
 * XEROA CYBERDEFENSE
 * @author Shakir ullah - @sk-labs
 * @description Configuration management for security system
 * @version 1.0.0
 */

const defaultConfig = {
    // Global rate limiting (Layer 1)
    globalWindow: 15 * 60 * 1000, // 15 minutes
    globalLimit: 300, // requests per window (increased for normal browsing with auth bypass)
    
    // Login rate limiting (Layer 2)
    loginWindow: 15 * 60 * 1000, // 15 minutes
    loginLimit: 20, // attempts per window
    
    // API rate limiting
    apiWindow: 1 * 60 * 1000, // 1 minute
    apiLimit: 60, // requests per window
    
    // Strict rate limiting (sensitive operations)
    strictWindow: 60 * 60 * 1000, // 1 hour
    strictLimit: 5, // requests per window
    
    // Progressive blocking (Layer 3 & 4)
    ipLimits: {
        first: 10,  // First block threshold
        second: 20, // Second block threshold
        third: 30   // Permanent block threshold
    },
    emailLimits: {
        first: 3,   // First block threshold
        second: 5,  // Second block threshold
        third: 8    // Permanent block threshold
    },
    
    // Block durations (in milliseconds)
    blockDurations: {
        first: 15 * 60 * 1000,      // 15 minutes
        second: 60 * 60 * 1000,     // 1 hour
        third: 24 * 60 * 60 * 1000  // 24 hours
    },
    
    // View configuration
    securityViewPath: 'auth/auth-rate-limit',
    layout: 'layouts/layout-without-nav',
    
    // Cleanup settings
    cleanupDays: 30, // Days to keep old records
    
    // Logging
    enableLogging: true,
    logPrefix: 'Xeroa',
    
    // Authentication bypass (IMPORTANT for production apps)
    // Authenticated users are not rate limited globally
    // This allows staff to work without restrictions
    skipAuthenticatedUsers: true,
    
    // Session field to check for authentication
    // Supports multiple common session patterns
    sessionFields: ['userid', 'userId', 'user']
};

let currentConfig = { ...defaultConfig };

module.exports = {
    /**
     * Get a configuration value
     * @param {String} key - Config key
     * @returns {*} Config value
     */
    get: (key) => {
        return currentConfig[key];
    },
    
    /**
     * Set configuration options
     * @param {Object} options - Configuration options to override
     */
    setOptions: (options) => {
        currentConfig = { ...currentConfig, ...options };
    },
    
    /**
     * Reset to default configuration
     */
    reset: () => {
        currentConfig = { ...defaultConfig };
    },
    
    /**
     * Get all configuration
     * @returns {Object} Full configuration
     */
    getAll: () => {
        return { ...currentConfig };
    },
    
    /**
     * Default configuration
     */
    defaults: defaultConfig
};
