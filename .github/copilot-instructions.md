# Copilot Instructions: Xeroa CyberDefense

Guidance for AI coding agents working with this Node.js security package. Use this to integrate Xeroa CyberDefense into any Express app or maintain the package itself.

## Quick Integration Guide (For Existing/New Apps)

### Installation
```javascript
// Option 1: Copy package to project
// cp -r /path/to/Xeroa-CyberDefense ./your-project/

// Option 2: From GitHub (when published)
// npm install git+https://github.com/sk-labs/xeroa-cyberdefense.git

// Option 3: From NPM (when published)
// npm install xeroa-cyberdefense
```

### Basic Setup (Minimum Required)
```javascript
const express = require('express');
const xeroa = require('./Xeroa-CyberDefense'); // or 'xeroa-cyberdefense'

const app = express();

// CRITICAL: Trust proxy before initializing (for correct IP detection)
app.set('trust proxy', 1);

// CRITICAL: Serve static files BEFORE security (otherwise CSS/JS get rate-limited)
app.use(express.static('public'));

// Initialize Xeroa - applies global rate limiter automatically
xeroa.initialize(app, {
  securityViewPath: 'auth/auth-rate-limit', // path to your security view
  skipAuthenticatedUsers: true // bypass limits for logged-in users
});

// Your routes below...
```

### Login Route Integration (Complete Pattern)
```javascript
app.post('/auth/login', xeroa.loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const clientIP = xeroa.getClientIP(req);
  
  // Step 1: Check if IP is blocked
  const ipBlock = await xeroa.isBlocked(clientIP, 'ip');
  if (ipBlock) {
    return res.status(429).render('auth/auth-rate-limit', {
      clientIP, retryAfter: ipBlock.blockedUntil - Date.now()
    });
  }
  
  // Step 2: Check if account is blocked
  const emailBlock = await xeroa.isBlocked(email, 'email');
  if (emailBlock) {
    return res.status(429).render('auth/auth-rate-limit', {
      clientIP, retryAfter: emailBlock.blockedUntil - Date.now()
    });
  }
  
  // Step 3: Verify credentials
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    // Record failure for both IP and email
    await xeroa.recordFailure(email, 'email');
    await xeroa.recordFailure(clientIP, 'ip');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Step 4: Success! Reset attempts and create session
  await xeroa.resetAttempts(email, 'email');
  await xeroa.resetAttempts(clientIP, 'ip');
  
  req.session.userid = user._id; // Any of: userid, userId, user
  res.json({ success: true });
});
```

### Protecting Other Routes
```javascript
// Protect password reset with strict limiter (5 requests/hour)
app.post('/auth/forgot-password', xeroa.strictLimiter, async (req, res) => {
  // Your password reset logic
});

// Protect API routes (60 requests/minute)
app.use('/api/', xeroa.apiLimiter);

// Protect specific admin routes
app.post('/admin/action', xeroa.strictLimiter, async (req, res) => {
  // Your admin logic
});
```

### Custom Configuration
```javascript
xeroa.initialize(app, {
  globalLimit: 300,           // requests per window
  globalWindow: 15 * 60 * 1000, // 15 minutes
  loginLimit: 20,             // login attempts per window
  skipAuthenticatedUsers: true, // bypass for logged-in users
  sessionFields: ['userid', 'userId', 'user'], // session fields to check
  securityViewPath: 'auth/auth-rate-limit', // your view path
  layout: 'layouts/layout-without-nav', // your layout
  applyGlobalLimiter: true    // set false to skip auto-apply
});
```

### View Setup (Required)
Copy `views/security-alert.ejs` to your project's views folder or create your own. The view receives:
- `clientIP` - string with blocked IP
- `retryAfter` - milliseconds until unblock

### Environment Variables (Required for Tests)
```env
DATABASE_URL=mongodb://localhost:27017/your-db
# or
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```

## Architecture Overview (Package Internals)
- Entry point: index.js exports middleware (`globalLimiter`, `loginLimiter`, `apiLimiter`, `strictLimiter`), `LoginAttempt` model, helpers, and `initialize(app, options)` to apply the global limiter.
- Middleware: middleware/rateLimiter.js implements 4 limiters via `express-rate-limit` and decides between JSON (API) or EJS view responses. Uses config/config.js for timing, limits, and view paths.
- Persistence: models/LoginAttemptModel.js defines the Mongoose schema and progressive penalties with statics `isBlocked()`, `recordFailure()`, `resetAttempts()`, `cleanup()`.
- Helpers: utils/helpers.js wraps model calls and provides `getClientIP()` for proxy-aware IP detection.
- Config: config/config.js provides defaults (rate windows/limits, session fields, view path, layout) and `setOptions()` overrides used by middleware and `initialize()`.
- View: views/security-alert.ejs renders the security page; expects `clientIP` and `retryAfter` locals.

## Key Conventions & Patterns
- Trust proxy: set `app.set('trust proxy', 1)` so `getClientIP()` resolves correctly behind CDNs/LBs.
- Static-first: serve static assets before `initialize()` to ensure bypass (global limiter skips common asset paths).
- Auth bypass: global limiter skips sessions with any of `req.session.userid`, `req.session.userId`, `req.session.user`. Configure alternatives via `options.sessionFields`.
- API response detection: middleware sends JSON when path starts with `/api/`, `req.xhr` is true, or `Accept` includes `application/json`.
- Security view defaults: `securityViewPath: 'auth/auth-rate-limit'`, `layout: 'layouts/layout-without-nav'` (override in `initialize(options)`).
- Progressive penalties: model thresholds are hardcoded (`ip: 10/20/30`, `email: 3/5/8`) with 15m/1h/24h blocks. Changing `config.ipLimits/emailLimits` does not change model behavior.
- Post-login hygiene: on successful auth, call `helpers.resetAttempts(email, 'email')` and `helpers.resetAttempts(ip, 'ip')` to clear counters.
- Sensitive routes: protect password reset/changes with `strictLimiter` (5/hour by default).

## Developer Workflows
- Tests: `npm test` runs tests/test-security.js (reads `DATABASE_URL` or defaults to `mongodb://localhost:27017/test`; loads `../config.env` if present).
- Reset state: `node tests/reset-blocks.js` to clear all login attempt records.
- Integration references: See docs/INTEGRATION.md for end-to-end Express wiring and examples.

## Common Integration Scenarios

### Scenario 1: Express App with EJS Views
```javascript
const xeroa = require('./Xeroa-CyberDefense');
app.set('trust proxy', 1);
app.use(express.static('public')); // Before xeroa
xeroa.initialize(app);
// Copy views/security-alert.ejs to your views folder
```

### Scenario 2: Express API (JSON responses only)
```javascript
const xeroa = require('./Xeroa-CyberDefense');
app.set('trust proxy', 1);
app.use('/api/', xeroa.apiLimiter); // Returns JSON automatically
```

### Scenario 3: Existing App with Custom Session Fields
```javascript
xeroa.initialize(app, {
  sessionFields: ['user_id', 'customAuth'], // Check these fields
  skipAuthenticatedUsers: true
});
```

### Scenario 4: High-Traffic App (Relaxed Limits)
```javascript
xeroa.initialize(app, {
  globalLimit: 500,           // More requests allowed
  loginLimit: 30,             // More login attempts
  skipAuthenticatedUsers: true // Essential for staff
});
```

### Scenario 5: Manual Limiter Application (No Global Limiter)
```javascript
xeroa.initialize(app, { applyGlobalLimiter: false });
// Then apply limiters selectively:
app.post('/auth/login', xeroa.loginLimiter, ...);
app.use('/api/', xeroa.apiLimiter);
```

## Nuances & Gotchas
- `initialize(app, options)` applies the global limiter automatically unless `applyGlobalLimiter: false`.
- Model vs config: rate windows/limits in config drive middleware only; model blocking thresholds/durations are embedded in the schema statics.
- Environment: tests require a reachable MongoDB; ensure `.env` (or `config.env`) provides `DATABASE_URL`/`MONGODB_URI`.

## Commands
- Run tests: `npm test`
- Reset blocks: `node tests/reset-blocks.js`
- Daily cleanup (recommended): schedule `helpers.cleanup()` via cron.

If any part of this guide feels unclear (e.g., auth bypass fields, view path/layout expectations, or model/config interplay), tell me what you’re integrating and I’ll refine these instructions for your setup.