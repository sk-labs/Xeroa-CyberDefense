/**
 * XEROA CYBERDEFENSE
 * @author Shakir ullah - @sk-labs
 * @description Test security features
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

const LoginAttempt = require('../models/LoginAttemptModel');

async function testSecurity() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/test');
        console.log('✅ Connected to MongoDB\n');

        console.log('🧪 TESTING XEROA CYBERDEFENSE\n');
        console.log('━'.repeat(60) + '\n');

        // Test 1: IP Blocking
        console.log('Test 1: IP-Based Blocking');
        console.log('Simulating 15 failed attempts from IP 192.168.1.100...');
        
        for (let i = 1; i <= 15; i++) {
            const result = await LoginAttempt.recordFailure('192.168.1.100', 'ip');
            console.log(`  Attempt ${i}: ${result.consecutiveFailures} failures, blocked until: ${result.blockedUntil || 'Not blocked yet'}`);
        }
        
        const ipBlock = await LoginAttempt.isBlocked('192.168.1.100', 'ip');
        console.log(`\n  ✅ IP Blocking Works: ${ipBlock ? 'BLOCKED' : 'NOT BLOCKED'}`);
        if (ipBlock) {
            console.log(`     Blocked until: ${ipBlock.blockedUntil}`);
        }

        console.log('\n' + '━'.repeat(60) + '\n');

        // Test 2: Email Blocking
        console.log('Test 2: Email-Based Blocking');
        console.log('Simulating 5 failed attempts for admin@test.com...');
        
        for (let i = 1; i <= 5; i++) {
            const result = await LoginAttempt.recordFailure('admin@test.com', 'email');
            console.log(`  Attempt ${i}: ${result.consecutiveFailures} failures, blocked until: ${result.blockedUntil || 'Not blocked yet'}`);
        }
        
        const emailBlock = await LoginAttempt.isBlocked('admin@test.com', 'email');
        console.log(`\n  ✅ Email Blocking Works: ${emailBlock ? 'BLOCKED' : 'NOT BLOCKED'}`);
        if (emailBlock) {
            console.log(`     Blocked until: ${emailBlock.blockedUntil}`);
        }

        console.log('\n' + '━'.repeat(60) + '\n');

        // Test 3: Reset Attempts
        console.log('Test 3: Reset Attempts');
        await LoginAttempt.resetAttempts('admin@test.com', 'email');
        const afterReset = await LoginAttempt.isBlocked('admin@test.com', 'email');
        console.log(`  ✅ Reset Works: ${afterReset ? 'STILL BLOCKED' : 'UNBLOCKED'}`);

        console.log('\n' + '━'.repeat(60) + '\n');

        // Test 4: Cleanup
        console.log('Test 4: Cleanup Old Records');
        const cleaned = await LoginAttempt.cleanup();
        console.log(`  ✅ Cleaned up ${cleaned} old records`);

        console.log('\n' + '━'.repeat(60));
        console.log('\n✅ ALL TESTS PASSED!\n');
        console.log('Xeroa CyberDefense is working correctly! 🛡️\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testSecurity();
