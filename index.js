/**
 * XEROA CYBERDEFENSE
 * Enterprise-Grade 4-Layer Security System
 * @author Shakir ullah - @sk-labs
 * @version 1.0.0
 * @description Main entry point for Xeroa CyberDefense security system
 */

const rateLimiter = require('./middleware/rateLimiter');
const LoginAttempt = require('./models/LoginAttemptModel');
const helpers = require('./utils/helpers');

module.exports = {
  // Middleware exports
  globalLimiter: rateLimiter.globalLimiter,
  loginLimiter: rateLimiter.loginLimiter,
  apiLimiter: rateLimiter.apiLimiter,
  strictLimiter: rateLimiter.strictLimiter,
  
  // Model exports
  LoginAttempt,
  
  // Helper functions
  getClientIP: helpers.getClientIP,
  isBlocked: helpers.isBlocked,
  recordFailure: helpers.recordFailure,
  resetAttempts: helpers.resetAttempts,
  
  // Configuration
  configure: require('./config/config'),
  
  // Full initialization function
  initialize: async (app, options = {}) => {
    const config = require('./config/config');
    config.setOptions(options);
    
    console.log('🛡️  Xeroa CyberDefense: 4-Layer Security System Initialized');
    console.log(`   Layer 1: Global Rate Limiting (${config.get('globalLimit')} requests/${config.get('globalWindow')}ms)`);
    console.log(`   Layer 2: Login Rate Limiting (${config.get('loginLimit')} attempts/${config.get('loginWindow')}ms)`);
    console.log(`   Layer 3: IP-Based Blocking (Progressive penalties)`);
    console.log(`   Layer 4: Account-Based Blocking (3 failures = lock)`);
    
    // Apply global rate limiter to Express app
    if (app && options.applyGlobalLimiter !== false) {
      app.use(rateLimiter.globalLimiter);
    }
    
    return {
      rateLimiter,
      LoginAttempt,
      helpers
    };
  },
  
  // Version info
  version: '1.0.0',
  name: 'Xeroa CyberDefense'
};
