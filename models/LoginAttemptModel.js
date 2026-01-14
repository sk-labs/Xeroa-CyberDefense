/**
 * XEROA CYBERDEFENSE
 * @author Shakir ullah - @sk-labs
 * @description Login attempt tracking model for brute force protection
 * @version 1.0.0
 */

const mongoose = require("mongoose");

const LoginAttemptSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['ip', 'email'],
        required: true
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    blockedUntil: {
        type: Date,
        default: null
    },
    lastAttempt: {
        type: Date,
        default: Date.now
    },
    consecutiveFailures: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
LoginAttemptSchema.index({ identifier: 1, type: 1 }, { unique: true });
LoginAttemptSchema.index({ blockedUntil: 1 });
LoginAttemptSchema.index({ lastAttempt: 1 });

/**
 * Check if an identifier (IP or email) is currently blocked
 * Layer 3 & 4: IP and Account-based blocking
 * @param {String} identifier - IP address or email
 * @param {String} type - 'ip' or 'email'
 * @returns {Object|null} Block info or null if not blocked
 */
LoginAttemptSchema.statics.isBlocked = async function(identifier, type) {
    const attempt = await this.findOne({ 
        identifier, 
        type,
        blockedUntil: { $gt: new Date() }
    });
    
    if (attempt) {
        return {
            blocked: true,
            blockedUntil: attempt.blockedUntil,
            reason: `Too many failed login attempts. Access blocked until ${attempt.blockedUntil.toLocaleString()}`
        };
    }
    
    return null;
};

/**
 * Record a failed login attempt with progressive penalties
 * @param {String} identifier - IP address or email
 * @param {String} type - 'ip' or 'email'
 * @returns {Object} Blocking info
 */
LoginAttemptSchema.statics.recordFailure = async function(identifier, type) {
    let attempt = await this.findOne({ identifier, type });
    
    if (!attempt) {
        attempt = new this({ 
            identifier, 
            type,
            failedAttempts: 1,
            consecutiveFailures: 1,
            lastAttempt: new Date()
        });
    } else {
        // Reset if last attempt was over 24 hours ago
        const hoursSinceLastAttempt = (new Date() - attempt.lastAttempt) / (1000 * 60 * 60);
        if (hoursSinceLastAttempt > 24) {
            attempt.failedAttempts = 1;
            attempt.consecutiveFailures = 1;
        } else {
            attempt.failedAttempts += 1;
            attempt.consecutiveFailures += 1;
        }
        attempt.lastAttempt = new Date();
    }
    
    // Progressive blocking based on type
    // SECURITY: Both IP and email use same strict limits (3/5/8)
    // This prevents email enumeration attacks (can't try unlimited emails)
    const limits = type === 'ip' 
        ? { first: 3, second: 5, third: 8 }      // Strict: Only 3 wrong attempts total
        : { first: 3, second: 5, third: 8 };     // Same for email accounts
    
    // Progressive penalties: 15 min → 1 hour → 24 hours
    if (attempt.consecutiveFailures >= limits.third) {
        // 24 hour block after many failures
        attempt.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (attempt.consecutiveFailures >= limits.second) {
        // 1 hour block after repeated failures
        attempt.blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
    } else if (attempt.consecutiveFailures >= limits.first) {
        // 15 minute block after initial failures
        attempt.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    
    await attempt.save();
    
    return {
        failedAttempts: attempt.failedAttempts,
        consecutiveFailures: attempt.consecutiveFailures,
        blockedUntil: attempt.blockedUntil,
        remainingAttempts: limits.first - attempt.consecutiveFailures
    };
};

/**
 * Reset attempts after successful login
 * @param {String} identifier - IP address or email
 * @param {String} type - 'ip' or 'email'
 */
LoginAttemptSchema.statics.resetAttempts = async function(identifier, type) {
    await this.findOneAndUpdate(
        { identifier, type },
        { 
            consecutiveFailures: 0,
            blockedUntil: null,
            lastAttempt: new Date()
        }
    );
};

/**
 * Clean up old records (older than 30 days)
 * Run this periodically via cron job
 */
LoginAttemptSchema.statics.cleanup = async function() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({
        lastAttempt: { $lt: thirtyDaysAgo },
        blockedUntil: null
    });
    console.log(`🧹 Xeroa: Cleaned up ${result.deletedCount} old login attempt records`);
    return result.deletedCount;
};

module.exports = mongoose.model("LoginAttempt", LoginAttemptSchema);
