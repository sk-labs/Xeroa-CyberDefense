/**
 * XEROA CYBERDEFENSE
 * @author Shakir ullah - @sk-labs
 * @description Reset all blocks for testing
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

const LoginAttempt = require('../models/LoginAttemptModel');

async function resetBlocks() {
    try {
        await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/test');
        console.log('✅ Connected to MongoDB\n');

        // Show current blocks
        const currentBlocks = await LoginAttempt.find({ blockedUntil: { $gt: new Date() } });
        console.log(`📊 Current Active Blocks: ${currentBlocks.length}`);
        
        if (currentBlocks.length > 0) {
            console.log('\n🔒 Blocked Identifiers:');
            currentBlocks.forEach(block => {
                console.log(`   ${block.type === 'ip' ? '🌐 IP' : '📧 Email'}: ${block.identifier}`);
                console.log(`      Blocked until: ${block.blockedUntil}`);
                console.log(`      Failed attempts: ${block.failedAttempts}\n`);
            });
        }

        // Delete all blocks
        const result = await LoginAttempt.deleteMany({});
        console.log(`\n🧹 Deleted ${result.deletedCount} login attempt records`);
        console.log('\n✅ All blocks have been reset!\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetBlocks();
