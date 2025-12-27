import * as Sentry from '@sentry/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables first
dotenv.config();

// Initialize Sentry for error tracking (if DSN is configured)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  console.log('Sentry error tracking initialized');
}

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import reviewRoutes from './routes/reviews';
import goalRoutes from './routes/goals';
import goalTemplateRoutes from './routes/goal-templates';
import oneOnOneRoutes from './routes/one-on-ones';
import developmentPlanRoutes from './routes/development-plans';
import managerRoutes from './routes/manager';
import googleCalendarRoutes from './routes/google-calendar';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';
import onboardingRoutes from './routes/onboarding';
import { authenticateToken } from './middleware/auth';
import { PrismaClient } from '@prisma/client';

// Validate required environment variables at startup
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`CRITICAL: ${envVar} environment variable is required but not set`);
  }
}

// Validate FRONTEND_URL format if set
if (process.env.FRONTEND_URL && !/^https?:\/\/.+/.test(process.env.FRONTEND_URL)) {
  throw new Error('CRITICAL: FRONTEND_URL must be a valid URL starting with http:// or https://');
}

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Handled by nginx for frontend
  crossOriginEmbedderPolicy: false, // Allow embedding for API
}));

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser with size limit to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded files (with authentication)
app.use('/uploads', authenticateToken, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Beacon API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/goal-templates', goalTemplateRoutes);
app.use('/api/one-on-ones', oneOnOneRoutes);
app.use('/api/development-plans', developmentPlanRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/calendar', googleCalendarRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Auto-seed database on first startup (for production deployments)
async function autoSeedIfEmpty() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('📊 Database is empty, seeding with initial data...');
      await execAsync('npx ts-node prisma/seed.ts');
      console.log('✅ Database seeded successfully!');
    } else {
      console.log(`✅ Database already has ${userCount} users, skipping seed`);
    }
  } catch (error) {
    console.error('⚠️ Error checking/seeding database:', error);
  }
}

// Global error handler - must be after all routes
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  console.error('Unhandled error:', err);

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({ error: message });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await autoSeedIfEmpty();
});

export default app;
