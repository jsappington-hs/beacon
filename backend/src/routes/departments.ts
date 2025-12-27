import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from "../types";
import { prisma } from '../lib/db';
import { beforeStateFetcher } from '../middleware/before-state-fetcher';
import { auditLogger } from '../middleware/audit-logger';

const router = Router();

// Get all departments
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        parentDepartment: {
          select: { id: true, name: true },
        },
        subDepartments: {
          select: { id: true, name: true },
        },
        users: {
          select: { id: true, name: true, email: true, title: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department hierarchy tree
router.get('/tree', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get root departments (no parent) scoped to organization
    const rootDepartments = await prisma.department.findMany({
      where: {
        parentDepartmentId: null,
        organizationId: req.user!.organizationId,
      },
      include: {
        subDepartments: {
          include: {
            subDepartments: {
              include: {
                subDepartments: true,
              },
            },
          },
        },
      },
    });

    res.json(rootDepartments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department tree' });
  }
});

// Get department by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        parentDepartment: {
          select: { id: true, name: true },
        },
        subDepartments: {
          select: { id: true, name: true },
        },
        users: {
          select: { id: true, name: true, email: true, title: true },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Verify department belongs to same organization
    if (department.organizationId !== req.user!.organizationId) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create department (HR Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  auditLogger,
  async (req: AuthRequest, res) => {
    try {
      const { name, parentDepartmentId } = req.body;

      const department = await prisma.department.create({
        data: {
          name,
          parentDepartmentId,
          organizationId: req.user!.organizationId,
        },
        include: {
          parentDepartment: {
            select: { id: true, name: true },
          },
        },
      });

      res.status(201).json(department);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create department' });
    }
  }
);

// Update department
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

      // Verify department belongs to same organization
      const existing = await prisma.department.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Department not found' });
      }

      // Prevent changing organizationId
      delete updates.organizationId;

      const department = await prisma.department.update({
        where: { id },
        data: updates,
        include: {
          parentDepartment: {
            select: { id: true, name: true },
          },
        },
      });

      res.json(department);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update department' });
    }
  }
);

// Delete department
router.delete(
  '/:id',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  beforeStateFetcher,
  auditLogger,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Check if department has users
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          users: true,
          subDepartments: true,
        },
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }

      // Verify department belongs to same organization
      if (department.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Department not found' });
      }

      if (department.users.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete department with active users. Reassign users first.',
        });
      }

      if (department.subDepartments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete department with sub-departments.',
        });
      }

      await prisma.department.delete({ where: { id } });

      res.json({ message: 'Department deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete department' });
    }
  }
);

export default router;
