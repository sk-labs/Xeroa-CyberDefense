# Changelog - Xeroa CyberDefense

All notable changes to this project will be documented in this file.

---

## [1.2.0] - 2026-01-14

### 🔒 Security Enhancements

#### **CRITICAL: Email Enumeration Attack Prevention**

**Fixed:** Attackers could discover valid email addresses by testing different emails

**Before (Vulnerable):**

```bash
Try admin@example.com (wrong) → Counter for admin@example.com: 1/3
Try fake@example.com (wrong) → Counter for fake@example.com: 1/3  
Try random@example.com (wrong) → Counter for random@example.com: 1/3

Result: Attacker gets 3 attempts PER EMAIL = Unlimited! ❌
```

**After (Secure):**

```
Try admin@example.com (wrong) → IP Counter: 1/3 → "2 attempts remaining"
Try fake@example.com (wrong) → IP Counter: 2/3 → "1 attempt remaining"
Try random@example.com (wrong) → IP Counter: 3/3 → BLOCKED!

Result: Only 3 total login attempts from that IP! ✅
```

### Changed

- **IP Blocking Thresholds:** Changed from 10/20/30 to **3/5/8** (same as email)
  - **Primary Defense:** IP-based blocking prevents unlimited email attempts
  - **Secondary Defense:** Email-based blocking protects specific accounts
  - Both work together to prevent enumeration and brute force

- **Warning Messages:** Now show IP-based remaining attempts instead of email-based
  - Prevents attackers from distinguishing between valid/invalid emails
  - All wrong login attempts show identical behavior
  - No information leakage about account existence

### Added

- **Security Best Practices** section in README
- **Email Enumeration Prevention** guide in INTEGRATION.md
- **Progressive Blocking Thresholds** table in documentation

### Documentation

- Updated README with security examples
- Enhanced INTEGRATION.md with proper implementation pattern
- Added comments explaining email enumeration attack vector

---

## [1.1.0] - 2026-01-13

### Added

- Initial release of Xeroa CyberDefense
- 4-Layer security architecture
- Progressive blocking (15min → 1hr → 24hr)
- IP and account-based tracking
- Professional cybersecurity-themed alert page
- Automatic authentication bypass for logged-in users
- MongoDB persistence
- Express middleware integration
- Comprehensive documentation

### Features

- Global rate limiter (300 requests/15min)
- Login rate limiter (20 attempts/15min)
- API rate limiter (60 requests/min)
- Strict limiter for sensitive operations (5/hour)
- EJS security alert view
- Proxy-aware IP detection
- Auto-cleanup of old records
- Test suite and utilities

---

## Version Numbering

- **Major (X.0.0):** Breaking changes
- **Minor (0.X.0):** New features, security enhancements
- **Patch (0.0.X):** Bug fixes, documentation updates

---

## Upgrade Guide

### From 1.1.0 to 1.2.0

**Breaking Changes:** None - fully backward compatible

**Recommended Changes:**

Update your login controller to use IP-based warnings:

```javascript
// Old approach (vulnerable to enumeration)
const emailResult = await xeroa.recordFailure(email, 'email');
if (emailResult.remainingAttempts <= 2) {
  // Shows warnings only for existing emails
}

// New approach (secure)
const ipResult = await xeroa.recordFailure(clientIP, 'ip');
const emailResult = await xeroa.recordFailure(email, 'email'); // Still track both
if (ipResult.remainingAttempts <= 2) {
  // Shows warnings for ALL attempts regardless of email
}
```

**What happens if you don't update:**

- Your app still works fine
- IP blocking thresholds are stricter (better security)
- But warnings might still be email-based (minor vulnerability)

**Migration steps:**

1. Update Xeroa CyberDefense package files
2. Change warning logic to use `ipResult` instead of `emailResult`
3. Test with 3 wrong login attempts
4. Verify you see countdown/security page after 3rd attempt

---

**Questions?** [Open an issue](https://github.com/sk-labs/xeroa-cyberdefense/issues)
