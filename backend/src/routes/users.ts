import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from "../types";
import { prisma } from '../lib/db';
import { beforeStateFetcher } from '../middleware/before-state-fetcher';
import { auditLogger } from '../middleware/audit-logger';

const router = Router();

// Get all users (Managers and above can view)
router.get(
  '/',
  authenticateToken,
  requireRole([UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { organizationId: req.user!.organizationId },
        include: {
          department: true,
          manager: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

// Get user by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Users can view their own profile or their direct reports
    // HR/Admins can view anyone in their org
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        manager: true,
        directReports: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify user belongs to same organization
    if (user.organizationId !== req.user!.organizationId) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get org chart
router.get('/org/chart', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get all users with their reporting relationships (scoped to organization)
    const users = await prisma.user.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        directReports: {
          select: { id: true, name: true, title: true },
        },
        manager: {
          select: { id: true, name: true, title: true },
        },
        department: true,
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch org chart' });
  }
});

// Get user's direct reports
router.get('/:id/reports', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const reports = await prisma.user.findMany({
      where: {
        managerId: id,
        organizationId: req.user!.organizationId,
      },
      include: {
        department: true,
      },
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create user (HR Admin/Super Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  auditLogger,
  async (req: AuthRequest, res) => {
    try {
      const { email, name, title, role, managerId, departmentId, hireDate } = req.body;

      const user = await prisma.user.create({
        data: {
          email,
          name,
          title,
          role: role || UserRole.EMPLOYEE,
          managerId,
          departmentId,
          hireDate: hireDate ? new Date(hireDate) : null,
          organizationId: req.user!.organizationId,
        },
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Update user
router.patch(
  '/:id',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  beforeStateFetcher,
  auditLogger,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verify user belongs to same organization
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser || existingUser.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent changing organizationId
      delete updates.organizationId;

      const user = await prisma.user.update({
        where: { id },
        data: updates,
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

export default router;
