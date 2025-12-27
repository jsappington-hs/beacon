import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole, GoalStatus, GoalVisibility } from "../types";
import { prisma } from '../lib/db';

const router = Router();

// Get goals for current user
router.get('/my-goals', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const goals = await prisma.goal.findMany({
      where: {
        ownerId: userId,
        organizationId: req.user!.organizationId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        parentGoal: {
          select: { id: true, title: true, ownerId: true },
        },
        childGoals: {
          select: { id: true, title: true, ownerId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Get goals for a specific user
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Check visibility permissions
    const goals = await prisma.goal.findMany({
      where: {
        ownerId: userId,
        OR: [
          { ownerId: currentUserId }, // Own goals
          { visibility: GoalVisibility.COMPANY }, // Company-wide goals
          {
            // Team goals - need to check if user is on same team
            visibility: GoalVisibility.TEAM,
            owner: {
              OR: [
                { managerId: currentUserId }, // Direct reports
                { id: currentUserId }, // Self
              ],
            },
          },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        parentGoal: {
          select: { id: true, title: true, ownerId: true },
        },
        childGoals: {
          select: { id: true, title: true, ownerId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user goals' });
  }
});

// Get all company-wide goals
router.get('/company', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: {
        visibility: GoalVisibility.COMPANY,
        organizationId: req.user!.organizationId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, title: true } },
        childGoals: {
          select: { id: true, title: true, ownerId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company goals' });
  }
});

// Get goal by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, title: true } },
        parentGoal: {
          select: { id: true, title: true, ownerId: true },
        },
        childGoals: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Check visibility permissions
    const hasAccess =
      goal.ownerId === userId ||
      goal.visibility === GoalVisibility.COMPANY ||
      req.user!.role === UserRole.HR_ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

// Create goal
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      targetValue,
      currentValue,
      unit,
      dueDate,
      status,
      visibility,
      parentGoalId,
    } = req.body;
    const ownerId = req.body.ownerId || req.user!.id;

    // Only HR/Admins can create goals for others
    if (ownerId !== req.user!.id) {
      if (
        req.user!.role !== UserRole.HR_ADMIN &&
        req.user!.role !== UserRole.SUPER_ADMIN
      ) {
        return res.status(403).json({ error: 'Cannot create goals for other users' });
      }
    }

    const goal = await prisma.goal.create({
      data: {
        ownerId,
        title,
        description,
        targetValue,
        currentValue: currentValue || 0,
        unit,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || GoalStatus.DRAFT,
        visibility: visibility || GoalVisibility.PRIVATE,
        parentGoalId,
        organizationId: req.user!.organizationId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        parentGoal: {
          select: { id: true, title: true },
        },
      },
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update goal
router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Verify goal belongs to same organization
    if (goal.organizationId !== req.user!.organizationId) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Prevent changing organizationId
    delete updates.organizationId;

    // Only owner or HR/Admin can update
    if (
      goal.ownerId !== userId &&
      req.user!.role !== UserRole.HR_ADMIN &&
      req.user!.role !== UserRole.SUPER_ADMIN
    ) {
      return res.status(403).json({ error: 'Cannot update this goal' });
    }

    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

    const updated = await prisma.goal.update({
      where: { id },
      data: updates,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        parentGoal: {
          select: { id: true, title: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Update goal progress
router.patch('/:id/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { currentValue } = req.body;
    const userId = req.user!.id;

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.ownerId !== userId) {
      return res.status(403).json({ error: 'Can only update your own goal progress' });
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: { currentValue },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
});

// Delete goal
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Only owner or HR/Admin can delete
    if (
      goal.ownerId !== userId &&
      req.user!.role !== UserRole.HR_ADMIN &&
      req.user!.role !== UserRole.SUPER_ADMIN
    ) {
      return res.status(403).json({ error: 'Cannot delete this goal' });
    }

    await prisma.goal.delete({ where: { id } });

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Get goal alignment tree (OKR cascading)
router.get('/:id/tree', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Recursive function to build goal tree
    const buildGoalTree = async (goalId: string): Promise<any> => {
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          childGoals: true,
        },
      });

      if (!goal) return null;

      const children = await Promise.all(
        goal.childGoals.map((child) => buildGoalTree(child.id))
      );

      return {
        ...goal,
        childGoals: children.filter(Boolean),
      };
    };

    const tree = await buildGoalTree(id);

    if (!tree) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goal tree' });
  }
});

export default router;
