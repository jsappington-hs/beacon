import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
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

dotenv.config();

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

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

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await autoSeedIfEmpty();
});

export default app;
