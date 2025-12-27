import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { prisma } from '../lib/db';

const router = Router();

// Get all goal templates (managers and above)
router.get(
  '/',
  authenticateToken,
  requireRole([UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { category } = req.query;

      const templates = await prisma.goalTemplate.findMany({
        where: {
          isActive: true,
          organizationId: req.user!.organizationId,
          ...(category && { category: category as string }),
        },
        orderBy: {
          category: 'asc',
        },
      });

      res.json(templates);
    } catch (error) {
      console.error('Error fetching goal templates:', error);
      res.status(500).json({ error: 'Failed to fetch goal templates' });
    }
  }
);

// Get template by ID
router.get(
  '/:id',
  authenticateToken,
  requireRole([UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const template = await prisma.goalTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Verify template belongs to user's organization
      if (template.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching goal template:', error);
      res.status(500).json({ error: 'Failed to fetch goal template' });
    }
  }
);

// Create goal template (HR/Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { title, description, category, targetValue, unit, suggestedDuration, visibility } = req.body;

      if (!title || !description || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
      }

      const template = await prisma.goalTemplate.create({
        data: {
          title,
          description,
          category,
          targetValue,
          unit,
          suggestedDuration,
          visibility: visibility || 'TEAM',
          isActive: true,
          organizationId: req.user!.organizationId,
        },
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating goal template:', error);
      res.status(500).json({ error: 'Failed to create goal template' });
    }
  }
);

// Update goal template (HR/Admin only)
router.patch(
  '/:id',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verify template exists and belongs to user's organization
      const existing = await prisma.goalTemplate.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Prevent changing organizationId
      delete updates.organizationId;

      const template = await prisma.goalTemplate.update({
        where: { id },
        data: updates,
      });

      res.json(template);
    } catch (error) {
      console.error('Error updating goal template:', error);
      res.status(500).json({ error: 'Failed to update goal template' });
    }
  }
);

// Delete (deactivate) goal template (HR/Admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Verify template exists and belongs to user's organization
      const existing = await prisma.goalTemplate.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Soft delete by marking as inactive
      await prisma.goalTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting goal template:', error);
      res.status(500).json({ error: 'Failed to delete goal template' });
    }
  }
);

// Create goal from template
router.post(
  '/:id/use',
  authenticateToken,
  requireRole([UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { employeeId, targetValue, dueDate, visibility } = req.body;

      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      // Get the template
      const template = await prisma.goalTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Verify template belongs to user's organization
      if (template.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Verify employee belongs to user's organization
      const employee = await prisma.user.findUnique({ where: { id: employeeId } });
      if (!employee || employee.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Calculate due date if not provided
      let calculatedDueDate = dueDate;
      if (!calculatedDueDate && template.suggestedDuration) {
        const date = new Date();
        date.setDate(date.getDate() + template.suggestedDuration);
        calculatedDueDate = date.toISOString();
      }

      // Create goal from template
      const goal = await prisma.goal.create({
        data: {
          ownerId: employeeId,
          title: template.title,
          description: template.description,
          targetValue: targetValue || template.targetValue,
          unit: template.unit,
          dueDate: calculatedDueDate ? new Date(calculatedDueDate) : null,
          visibility: visibility || template.visibility,
          status: 'ACTIVE',
          organizationId: req.user!.organizationId,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json(goal);
    } catch (error) {
      console.error('Error creating goal from template:', error);
      res.status(500).json({ error: 'Failed to create goal from template' });
    }
  }
);

export default router;
