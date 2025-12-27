import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { profilePictureUpload, deleteProfilePicture, getFilenameFromUrl } from '../middleware/profile-upload';
import { prisma } from '../lib/db';

const router = Router();

/**
 * Update own profile (non-password fields)
 * PATCH /api/profile/me
 */
router.patch('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { bio, phoneNumber, location } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        bio,
        phoneNumber,
        location,
      },
      include: {
        department: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Change password
 * PUT /api/profile/me/password
 */
router.put('/me/password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Strong password policy: min 8 chars, uppercase, lowercase, number, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * Upload profile picture
 * POST /api/profile/me/profile-picture
 */
router.post(
  '/me/profile-picture',
  authenticateToken,
  profilePictureUpload.single('profilePicture'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get current user to delete old profile picture
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Delete old profile picture if exists
      if (currentUser?.profilePicture) {
        const oldFilename = getFilenameFromUrl(currentUser.profilePicture);
        if (oldFilename) {
          deleteProfilePicture(oldFilename);
        }
      }

      // Update user with new profile picture URL
      const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { profilePicture: profilePictureUrl },
        include: {
          department: true,
          manager: { select: { id: true, name: true, email: true } },
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ error: 'Failed to upload profile picture' });
    }
  }
);

/**
 * Delete profile picture
 * DELETE /api/profile/me/profile-picture
 */
router.delete('/me/profile-picture', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.profilePicture) {
      const filename = getFilenameFromUrl(user.profilePicture);
      if (filename) {
        deleteProfilePicture(filename);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
      include: {
        department: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
});

export default router;
