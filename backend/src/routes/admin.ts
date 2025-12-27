import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { createAuditLog } from '../middleware/audit-logger';
import { encrypt, decrypt } from '../services/encryption.service';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Helper to check if user is super admin
const isSuperAdmin = (role: UserRole) => role === UserRole.SUPER_ADMIN;

// ===== SETTINGS ENDPOINTS =====

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get(
  '/settings',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const settings = await prisma.systemSettings.findMany({
        where: { organizationId: req.user!.organizationId }
      });

      const settingsObj: Record<string, any> = {};
      settings.forEach(s => {
        try {
          settingsObj[s.category] = JSON.parse(s.settings);
        } catch (e) {
          settingsObj[s.category] = {};
        }
      });

      res.json(settingsObj);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }
);

/**
 * GET /api/admin/settings/:category
 * Get settings for a specific category
 */
router.get(
  '/settings/:category',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { category } = req.params;

      const setting = await prisma.systemSettings.findUnique({
        where: {
          organizationId_category: {
            organizationId: req.user!.organizationId,
            category
          }
        }
      });

      if (!setting) {
        return res.json({});
      }

      res.json(JSON.parse(setting.settings));
    } catch (error) {
      console.error('Failed to fetch setting:', error);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  }
);

/**
 * PATCH /api/admin/settings
 * Update system settings for a category
 */
router.patch(
  '/settings',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { category, settings } = req.body;

      if (!category || !settings) {
        return res.status(400).json({ error: 'Category and settings are required' });
      }

      // Feature flags are SUPER_ADMIN only
      if (category === 'features' && !isSuperAdmin(req.user!.role)) {
        return res.status(403).json({ error: 'Only SUPER_ADMIN can modify feature flags' });
      }

      const existing = await prisma.systemSettings.findUnique({
        where: {
          organizationId_category: {
            organizationId: req.user!.organizationId,
            category
          }
        }
      });

      const updated = await prisma.systemSettings.upsert({
        where: {
          organizationId_category: {
            organizationId: req.user!.organizationId,
            category
          }
        },
        update: { settings: JSON.stringify(settings) },
        create: {
          category,
          settings: JSON.stringify(settings),
          organizationId: req.user!.organizationId
        }
      });

      await createAuditLog({
        userId: req.user!.id,
        action: existing ? 'UPDATE' : 'CREATE',
        resourceType: 'SystemSettings',
        resourceId: category,
        changes: {
          before: existing ? JSON.parse(existing.settings) : null,
          after: settings
        }
      });

      res.json(JSON.parse(updated.settings));
    } catch (error) {
      console.error('Failed to update settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// ===== USER MANAGEMENT ENDPOINTS =====

/**
 * PATCH /api/admin/users/:id/deactivate
 * Deactivate a user (soft delete)
 */
router.patch(
  '/users/:id/deactivate',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Prevent self-deactivation
      if (req.user!.id === id) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      const before = await prisma.user.findUnique({ where: { id } });

      if (!before) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify user belongs to same organization
      if (before.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        resourceType: 'User',
        resourceId: id,
        changes: {
          before: { isActive: true },
          after: { isActive: false }
        }
      });

      res.json(user);
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  }
);

/**
 * PATCH /api/admin/users/:id/reactivate
 * Reactivate a deactivated user
 */
router.patch(
  '/users/:id/reactivate',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Verify user belongs to same organization
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive: true }
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        resourceType: 'User',
        resourceId: id,
        changes: {
          before: { isActive: false },
          after: { isActive: true }
        }
      });

      res.json(user);
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      res.status(500).json({ error: 'Failed to reactivate user' });
    }
  }
);

/**
 * POST /api/admin/users/bulk-import
 * Bulk import users from CSV
 */
router.post(
  '/users/bulk-import',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as any[];

      if (records.length > 1000) {
        return res.status(400).json({ error: 'Maximum 1000 rows allowed per import' });
      }

      const results = { success: 0, errors: [] as any[] };

      for (const [index, record] of records.entries()) {
        try {
          // Validate required fields
          if (!record.name || !record.email) {
            results.errors.push({
              row: index + 1,
              error: 'Name and email are required',
              data: record
            });
            continue;
          }

          // Lookup manager by email if provided (within same org)
          let managerId = null;
          if (record.manager) {
            const manager = await prisma.user.findFirst({
              where: {
                email: record.manager,
                organizationId: req.user!.organizationId
              }
            });
            if (manager) {
              managerId = manager.id;
            }
          }

          // Lookup department by name if provided (within same org)
          let departmentId = null;
          if (record.department) {
            const department = await prisma.department.findFirst({
              where: {
                name: record.department,
                organizationId: req.user!.organizationId
              }
            });
            if (department) {
              departmentId = department.id;
            }
          }

          // Validate role
          const role = record.role?.toUpperCase() || 'EMPLOYEE';
          if (!['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role)) {
            results.errors.push({
              row: index + 1,
              error: `Invalid role: ${record.role}`,
              data: record
            });
            continue;
          }

          // Create user
          const user = await prisma.user.create({
            data: {
              name: record.name,
              email: record.email,
              title: record.title || null,
              role: role,
              managerId,
              departmentId,
              hireDate: record.hireDate ? new Date(record.hireDate) : null,
              isActive: true,
              organizationId: req.user!.organizationId
            }
          });

          await createAuditLog({
            userId: req.user!.id,
            action: 'CREATE',
            resourceType: 'User',
            resourceId: user.id,
            changes: { after: user }
          });

          results.success++;
        } catch (error: any) {
          results.errors.push({
            row: index + 1,
            error: error.message,
            data: record
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Failed to import users:', error);
      res.status(500).json({ error: 'Failed to import users' });
    }
  }
);

// ===== INTEGRATION ENDPOINTS =====

/**
 * GET /api/admin/integrations
 * Get all integrations with their status
 */
router.get(
  '/integrations',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const integrations = await prisma.integration.findMany({
        where: { organizationId: req.user!.organizationId }
      });

      // Don't expose config to non-super-admins
      const response = integrations.map(i => ({
        id: i.id,
        type: i.type,
        isConnected: i.isConnected,
        lastSyncAt: i.lastSyncAt,
        syncStatus: i.syncStatus,
        syncError: i.syncError,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      }));

      res.json(response);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  }
);

/**
 * GET /api/admin/integrations/:type
 * Get specific integration config (SUPER_ADMIN only)
 */
router.get(
  '/integrations/:type',
  authenticateToken,
  requireRole([UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { type } = req.params;

      const integration = await prisma.integration.findUnique({
        where: {
          organizationId_type: {
            organizationId: req.user!.organizationId,
            type
          }
        }
      });

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      let config = null;
      if (integration.config) {
        try {
          const decrypted = decrypt(integration.config);
          config = JSON.parse(decrypted);
        } catch (e) {
          console.error('Failed to decrypt integration config:', e);
        }
      }

      res.json({
        ...integration,
        config
      });
    } catch (error) {
      console.error('Failed to fetch integration:', error);
      res.status(500).json({ error: 'Failed to fetch integration' });
    }
  }
);

/**
 * PATCH /api/admin/integrations/:type/config
 * Update integration configuration (SUPER_ADMIN only)
 */
router.patch(
  '/integrations/:type/config',
  authenticateToken,
  requireRole([UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { type } = req.params;
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({ error: 'Config is required' });
      }

      // Encrypt the config before storing
      const encryptedConfig = encrypt(JSON.stringify(config));

      const integration = await prisma.integration.upsert({
        where: {
          organizationId_type: {
            organizationId: req.user!.organizationId,
            type
          }
        },
        update: {
          config: encryptedConfig,
          isConnected: true
        },
        create: {
          type,
          config: encryptedConfig,
          isConnected: true,
          organizationId: req.user!.organizationId
        }
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        resourceType: 'Integration',
        resourceId: type,
        changes: {
          after: { type, isConnected: true }
        }
      });

      res.json({
        id: integration.id,
        type: integration.type,
        isConnected: integration.isConnected,
        lastSyncAt: integration.lastSyncAt,
        syncStatus: integration.syncStatus
      });
    } catch (error) {
      console.error('Failed to update integration:', error);
      res.status(500).json({ error: 'Failed to update integration' });
    }
  }
);

/**
 * POST /api/admin/integrations/:type/disconnect
 * Disconnect an integration (SUPER_ADMIN only)
 */
router.post(
  '/integrations/:type/disconnect',
  authenticateToken,
  requireRole([UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { type } = req.params;

      const integration = await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: req.user!.organizationId,
            type
          }
        },
        data: {
          isConnected: false,
          config: null
        }
      });

      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        resourceType: 'Integration',
        resourceId: type,
        changes: {
          after: { isConnected: false }
        }
      });

      res.json(integration);
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      res.status(500).json({ error: 'Failed to disconnect integration' });
    }
  }
);

// ===== AUDIT LOG ENDPOINTS =====

/**
 * GET /api/admin/audit-logs
 * Query audit logs with filters
 */
router.get(
  '/audit-logs',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const {
        userId,
        action,
        resourceType,
        startDate,
        endDate,
        resourceId,
        ipAddress,
        search,
        status,
        limit = '100',
        offset = '0'
      } = req.query;

      const where: any = {
        organizationId: req.user!.organizationId
      };

      // HR_ADMIN can only see their own team's logs, SUPER_ADMIN sees all within org
      if (req.user!.role === UserRole.HR_ADMIN) {
        // For HR_ADMIN, limit to their actions and their team's actions
        // This would need to be expanded to include their reports
        where.userId = req.user!.id;
      }

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (status) where.status = status;

      // NEW: Resource ID search (partial match)
      if (resourceId) {
        where.resourceId = { contains: resourceId as string };
      }

      // NEW: IP address search in metadata JSON
      if (ipAddress) {
        where.metadata = { contains: ipAddress as string };
      }

      // NEW: Free-text search across description, changes, and metadata
      if (search) {
        where.OR = [
          { description: { contains: search as string } },
          { changes: { contains: search as string } },
          { metadata: { contains: search as string } }
        ];
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({ logs, total });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

/**
 * GET /api/admin/audit-logs/:id
 * Get specific audit log entry
 */
router.get(
  '/audit-logs/:id',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!log) {
        return res.status(404).json({ error: 'Audit log not found' });
      }

      res.json(log);
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  }
);

/**
 * POST /api/admin/audit-logs/export
 * Export audit logs (SUPER_ADMIN only)
 */
router.post(
  '/audit-logs/export',
  authenticateToken,
  requireRole([UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { userId, action, resourceType, startDate, endDate, format = 'csv' } = req.body;

      const where: any = {
        organizationId: req.user!.organizationId
      };
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
        res.send(JSON.stringify(logs, null, 2));
      } else {
        // CSV format
        const csvRows = [
          'Date,User,Action,Resource Type,Resource ID,Changes'
        ];

        logs.forEach(log => {
          const row = [
            log.createdAt.toISOString(),
            log.user?.name || 'System',
            log.action,
            log.resourceType,
            log.resourceId,
            log.changes ? `"${log.changes.replace(/"/g, '""')}"` : ''
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        res.send(csvRows.join('\n'));
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      res.status(500).json({ error: 'Failed to export audit logs' });
    }
  }
);

export default router;
