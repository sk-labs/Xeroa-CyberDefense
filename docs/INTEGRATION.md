# Integration Guide - Xeroa CyberDefense

Complete step-by-step guide to integrate Xeroa CyberDefense into your Node.js application.

---

## Prerequisites

- Node.js >= 14.0.0
- Express.js >= 4.18.0
- MongoDB database (local or Atlas)
- EJS template engine (for security page)

---

## Step 1: Installation

### Option A: Copy Package to Your Project

```bash
# Copy the entire Xeroa-CyberDefense folder
cp -r /path/to/Xeroa-CyberDefense ./

# Or download as ZIP and extract
```

### Option B: NPM Install (When Published)

```bash
npm install xeroa-cyberdefense
```

---

## Step 2: Install Dependencies

```bash
cd Xeroa-CyberDefense
npm install
```

Or add to your project's package.json:

```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5",
    "mongoose": "^8.0.0"
  }
}
```

---

## Step 3: Basic Integration

### 3.1 Import and Initialize

```javascript
// app.js or server.js
const express = require('express');
const mongoose = require('mongoose');
const xeroa = require('./Xeroa-CyberDefense');

const app = express();

// Trust proxy (IMPORTANT for Heroku, Cloudflare, etc.)
app.set('trust proxy', 1);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Initialize Xeroa CyberDefense with global rate limiting
xeroa.initialize(app);

// Your other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your routes...
```

**Output:**

```bash
🛡️  Xeroa CyberDefense: 4-Layer Security System Initialized
   Layer 1: Global Rate Limiting (100 requests/900000ms)
   Layer 2: Login Rate Limiting (20 attempts/900000ms)
   Layer 3: IP-Based Blocking (Progressive penalties)
   Layer 4: Account-Based Blocking (3 failures = lock)
```

---

## Step 4: Setup Security View

### 4.1 Copy Security Alert Page

```bash
# Copy the security alert view to your views folder
cp Xeroa-CyberDefense/views/security-alert.ejs ./views/auth/auth-rate-limit.ejs
```

### 4.2 Configure EJS

```javascript
// app.js
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
```

### 4.3 Update View Path (Optional)

```javascript
xeroa.initialize(app, {
  securityViewPath: 'auth/auth-rate-limit',  // Your view path
  layout: 'layouts/layout-without-nav'       // Your layout
});
```

---

## Step 5: Protect Login Route

```javascript
const { loginLimiter, helpers } = require('./Xeroa-CyberDefense');

app.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const clientIP = helpers.getClientIP(req);
  
  // STEP 1: Check if IP is blocked
  const ipBlock = await helpers.isBlocked(clientIP, 'ip');
  if (ipBlock) {
    return res.status(429).render('auth/auth-rate-limit', {
      title: 'IP Blocked',
      layout: 'layouts/layout-without-nav',
      clientIP,
      retryAfter: ipBlock.blockedUntil - Date.now(),
      HeaderCss: '',
      FooterJs: ''
    });
  }
  
  // STEP 2: Check if account is blocked
  const emailBlock = await helpers.isBlocked(email, 'email');
  if (emailBlock) {
    return res.status(429).render('auth/auth-rate-limit', {
      title: 'Account Locked',
      layout: 'layouts/layout-without-nav',
      clientIP,
      retryAfter: emailBlock.blockedUntil - Date.now(),
      HeaderCss: '',
      FooterJs: ''
    });
  }
  
  // STEP 3: Verify credentials
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    // Record failure for both IP and email
    await helpers.recordFailure(email, 'email');
    await helpers.recordFailure(clientIP, 'ip');
    
    req.flash('error', 'Invalid email or password');
    return res.redirect('/login');
  }
  
  // STEP 4: Success! Reset attempts
  await helpers.resetAttempts(email, 'email');
  await helpers.resetAttempts(clientIP, 'ip');
  
  // Create session
  req.session.userId = user._id;
  req.session.email = user.email;
  
  res.redirect('/dashboard');
});
```

---

## Step 6: Protect Password Reset

```javascript
const { strictLimiter } = require('./Xeroa-CyberDefense');

app.post('/auth/forgot-password', strictLimiter, async (req, res) => {
  const { email } = req.body;
  
  // Your password reset logic
  // Max 5 requests per hour per IP
});

app.post('/auth/reset-password', strictLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  
  // Your password reset logic
});
```

---

## Step 7: Protect API Routes

```javascript
const { apiLimiter } = require('./Xeroa-CyberDefense');

// Apply to all API routes
app.use('/api/', apiLimiter);

// Or specific endpoints
app.get('/api/users', apiLimiter, async (req, res) => {
  // Your API logic (60 requests/minute)
});
```

---

## Step 8: Static Files Configuration

**IMPORTANT:** Static files must be served BEFORE rate limiting!

```javascript
// app.js

// ✅ CORRECT ORDER:
app.use(express.static('public'));          // Static files FIRST
xeroa.initialize(app);                      // Rate limiting AFTER

// ❌ WRONG ORDER:
xeroa.initialize(app);                      // Rate limiting blocks CSS/JS
app.use(express.static('public'));          // Static files blocked!
```

---

## Step 9: Cleanup Cron Job

Add automatic cleanup to remove old records:

```javascript
const cron = require('node-cron');
const { helpers } = require('./Xeroa-CyberDefense');

// Run cleanup daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🧹 Running Xeroa cleanup...');
  await helpers.cleanup();
});
```

---

## Step 10: Environment Variables

Add to your `.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/your-database
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Session Secret
SESSION_SECRET=your-super-secret-key-here

# Server Port
PORT=3000
```

---

## Complete Example

```javascript
/**
 * Complete Express.js App with Xeroa CyberDefense
 */

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

// Import Xeroa
const xeroa = require('./Xeroa-CyberDefense');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(flash());

// Static files BEFORE security
app.use(express.static('public'));

// Initialize Xeroa CyberDefense
xeroa.initialize(app, {
  globalLimit: 100,
  loginLimit: 20,
  securityViewPath: 'auth/auth-rate-limit'
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Routes
const { loginLimiter, strictLimiter, helpers } = xeroa;

// Login route with protection
app.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const clientIP = helpers.getClientIP(req);
  
  // Check blocks
  const ipBlock = await helpers.isBlocked(clientIP, 'ip');
  const emailBlock = await helpers.isBlocked(email, 'email');
  
  if (ipBlock || emailBlock) {
    return res.status(429).render('auth/auth-rate-limit', {
      clientIP,
      retryAfter: (ipBlock?.blockedUntil || emailBlock?.blockedUntil) - Date.now()
    });
  }
  
  // Verify user
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    await helpers.recordFailure(email, 'email');
    await helpers.recordFailure(clientIP, 'ip');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Success
  await helpers.resetAttempts(email, 'email');
  await helpers.resetAttempts(clientIP, 'ip');
  
  req.session.userId = user._id;
  res.json({ success: true });
});

// Password reset with strict limiting
app.post('/auth/forgot-password', strictLimiter, async (req, res) => {
  // Your logic here
});

// API routes with rate limiting
app.get('/api/data', xeroa.apiLimiter, async (req, res) => {
  res.json({ data: 'Protected API endpoint' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## Testing Your Integration

### Test 1: Rate Limiting

```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl http://localhost:3000/
done

# Request 101 should show security page
```

### Test 2: Login Protection

```bash
# Try wrong password 3 times
curl -X POST http://localhost:3000/auth/login \
  -d "email=test@example.com&password=wrong1"

curl -X POST http://localhost:3000/auth/login \
  -d "email=test@example.com&password=wrong2"

curl -X POST http://localhost:3000/auth/login \
  -d "email=test@example.com&password=wrong3"

# 4th attempt should be blocked
```

### Test 3: Cleanup

```javascript
// test-cleanup.js
const xeroa = require('./Xeroa-CyberDefense');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const deleted = await xeroa.helpers.cleanup();
  console.log(`Cleaned up ${deleted} old records`);
  process.exit(0);
});
```

---

## Troubleshooting

### Issue: Static files return 429

**Solution:** Move `app.use(express.static())` BEFORE `xeroa.initialize()`

### Issue: IP shows as ::1 or 127.0.0.1

**Solution:** Add `app.set('trust proxy', 1)`

### Issue: Security page not rendering

**Solution:** Check view path matches your configuration

### Issue: MongoDB not connecting

**Solution:** Verify MONGODB_URI in `.env` file

---

## Next Steps

- ✅ [Customize Configuration](CONFIG.md)
- ✅ [API Reference](API.md)
- ✅ [Advanced Features](ADVANCED.md)
- ✅ [Deployment Guide](DEPLOYMENT.md)

---

**Need help?** Open an issue on GitHub: [@sk-labs/xeroa-cyberdefense](https://github.com/sk-labs/xeroa-cyberdefense/issues)
