import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db';
import { UserRole } from '../types';

const router = Router();

// Generate URL-friendly slug from organization name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// Register new organization with admin user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { organizationName, adminEmail, adminName, adminPassword } = req.body;

    // Validate required fields
    if (!organizationName || !adminEmail || !adminName || !adminPassword) {
      return res.status(400).json({
        error: 'Organization name, admin email, admin name, and password are required',
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate unique slug
    let slug = generateSlug(organizationName);
    let slugExists = await prisma.organization.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(organizationName)}-${counter}`;
      slugExists = await prisma.organization.findUnique({ where: { slug } });
      counter++;
    }

    // Create organization and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
        },
      });

      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: UserRole.HR_ADMIN,
          organizationId: organization.id,
        },
      });

      return { organization, admin };
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: result.admin.id,
        email: result.admin.email,
        role: result.admin.role,
        organizationId: result.organization.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role,
        organizationId: result.organization.id,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    });
  } catch (error) {
    console.error('Organization registration error:', error);
    res.status(500).json({ error: 'Failed to register organization' });
  }
});

export default router;
