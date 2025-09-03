// Load environment variables from .env file
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import database and services
const { initializeDatabase, getQuery, runQuery } = require('./database/db');

// Import encryption services
const { initializeEncryption, encryptedCitizenService, encryptedServiceRequestService } = require('./database/encryptedDb');
const citizenRoutes = require('./routes/citizens');
const serviceRequestRoutes = require('./routes/service-requests');
const serviceTypeRoutes = require('./routes/service-types');
const agencyRoutes = require('./routes/agencies');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:80'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging
app.use(morgan('combined', {
  skip: (req, res) => req.path === '/api/health'
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Simple authentication - in production, use proper password hashing
    const user = await getQuery('SELECT * FROM users WHERE username = ? AND password = ? AND isActive = 1', [username, password]);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login
    await runQuery('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Return user info (excluding password)
    const { password: _, ...userInfo } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userInfo
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Citizen Services Management System API',
    version: '1.0.0',
    description: 'Government Citizen Services Management System with 3-Tier Architecture',
    endpoints: {
      auth: '/api/auth - Authentication (login/logout)',
      citizens: '/api/citizens - Citizen management and registration',
      'service-requests': '/api/service-requests - Service applications and permits',
      'service-types': '/api/service-types - Available government services',
      agencies: '/api/agencies - Government departments and agencies',
      dashboard: '/api/dashboard - System statistics and analytics',
      health: '/api/health - System health check'
    },
    features: [
      '3-Tier Government Architecture',
      'SQLite Database with Audit Trail',
      'RESTful API Design',
      'Enterprise Security',
      'Performance Monitoring',
      'Citizen Privacy Protection'
    ],
    services: [
      'Building Permits',
      'Business Licenses',
      'Special Event Permits',
      'Property Tax Services',
      'Public Works Requests'
    ]
  });
});

// API routes
app.use('/api/citizens', citizenRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Response time logging
app.use((req, res, next) => {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (duration > 1000) { // Log slow requests
      console.log(`🐌 Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'API endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/api/citizens',
      '/api/service-requests',
      '/api/service-types',
      '/api/agencies',
      '/api/dashboard',
      '/api/health'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({
    error: true,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('Server reference created for shutdown');
  });
  
  server.close(() => {
    console.log('📊 HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.log('⏰ Forcing shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception thrown:', err);
  process.exit(1);
});

// Initialize and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Citizen Services Management System Backend...');
    console.log('🏗️  Initializing Government 3-Tier Architecture...');
    
    // Initialize SQLite database (Tier 3)
    console.log('💾 Tier 3: Initializing SQLite database...');
    await initializeDatabase();
    console.log('✅ Database layer ready');

    // Initialize Fortanix DSM encryption if configured
    if (process.env.FORTANIX_DSM_ENDPOINT && process.env.FORTANIX_API_KEY && process.env.FORTANIX_KEY_ID) {
      try {
        console.log('🔐 Initializing Fortanix DSM encryption...');
        await initializeEncryption();
        console.log('✅ Application-level encryption ready');
        console.log('🛡️  All citizen PII data will be encrypted with Fortanix DSM');
      } catch (error) {
        console.log('⚠️  Fortanix DSM initialization failed - running without encryption');
        console.log('   Error:', error.message);
      }
    } else {
      console.log('⚠️  Fortanix DSM not configured - running without encryption');
      console.log('   Set FORTANIX_DSM_ENDPOINT, FORTANIX_API_KEY, and FORTANIX_KEY_ID to enable encryption');
    }
    
    // Start HTTP server (Tier 2)
    console.log('🌐 Tier 2: Starting Express API server...');
    app.listen(PORT, '0.0.0.0', () => {
      console.log('✅ API server ready');
      console.log('🎯 Citizen Services Management System Backend ready!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 API Server: http://localhost:${PORT}`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api`);
      console.log(`🛡️  Security: Helmet, CORS, Rate Limiting enabled`);
      console.log(`💾 Database: SQLite with citizen services data`);
      console.log(`🏛️  Services: Permits, Licenses, Applications`);
      console.log(`🏗️  Architecture: Clean 3-Tier separation`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ Ready for government demo!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start Citizen Services Management System:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Start the server
startServer();