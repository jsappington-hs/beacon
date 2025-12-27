import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole, ReviewStatus } from "../types";
import { prisma } from '../lib/db';
import { DEFAULT_COMPETENCIES, DEFAULT_SELF_REFLECTION_QUESTIONS } from '../config/default-competencies';

const router = Router();

// ===== REVIEW CYCLES =====

// Get all review cycles
router.get('/cycles', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const cycles = await prisma.reviewCycle.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { startDate: 'desc' },
    });
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review cycles' });
  }
});

// Get review cycle by ID
router.get('/cycles/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const cycle = await prisma.reviewCycle.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            reviewee: { select: { id: true, name: true, email: true } },
            reviewer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!cycle) {
      return res.status(404).json({ error: 'Review cycle not found' });
    }

    // Verify cycle belongs to same organization
    if (cycle.organizationId !== req.user!.organizationId) {
      return res.status(404).json({ error: 'Review cycle not found' });
    }

    res.json(cycle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review cycle' });
  }
});

// Create review cycle (HR Admin only)
router.post(
  '/cycles',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { name, type, startDate, endDate } = req.body;

      const cycle = await prisma.reviewCycle.create({
        data: {
          name,
          type,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          organizationId: req.user!.organizationId,
        },
      });

      res.status(201).json(cycle);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create review cycle' });
    }
  }
);

// Update review cycle
router.patch(
  '/cycles/:id',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verify cycle belongs to same organization
      const existing = await prisma.reviewCycle.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Review cycle not found' });
      }

      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);
      delete updates.organizationId;

      const cycle = await prisma.reviewCycle.update({
        where: { id },
        data: updates,
      });

      res.json(cycle);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update review cycle' });
    }
  }
);

// ===== REVIEWS =====

// Get all reviews (HR Admin only)
router.get('/all-reviews', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user!.role;

    // Only HR Admins and Super Admins can see all reviews
    if (userRole !== 'HR_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. HR Admin role required.' });
    }

    // Filter by organization through the cycle
    const reviews = await prisma.review.findMany({
      where: {
        cycle: { organizationId: req.user!.organizationId },
      },
      include: {
        reviewee: { select: { id: true, name: true, email: true, title: true } },
        reviewer: { select: { id: true, name: true, email: true, title: true } },
        cycle: true,
        peerFeedback: {
          select: {
            id: true,
            feedback: true,
            rating: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviews for current user (as reviewee or reviewer)
router.get('/my-reviews', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const reviews = await prisma.review.findMany({
      where: {
        OR: [{ revieweeId: userId }, { reviewerId: userId }],
      },
      include: {
        reviewee: { select: { id: true, name: true, email: true, title: true } },
        reviewer: { select: { id: true, name: true, email: true, title: true } },
        cycle: true,
        peerFeedback: {
          select: {
            id: true,
            feedback: true,
            rating: true,
            createdAt: true,
            // Don't include giver info for anonymity
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get review by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        reviewee: { select: { id: true, name: true, email: true, title: true } },
        reviewer: { select: { id: true, name: true, email: true, title: true } },
        cycle: true,
        peerFeedback: {
          select: {
            id: true,
            feedback: true,
            rating: true,
            createdAt: true,
            // Anonymous - don't include giver
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only allow access to own review or if user is reviewer/HR admin
    const hasAccess =
      review.revieweeId === userId ||
      review.reviewerId === userId ||
      req.user!.role === UserRole.HR_ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Create review
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { revieweeId, reviewerId, cycleId } = req.body;

      const review = await prisma.review.create({
        data: {
          revieweeId,
          reviewerId,
          cycleId,
          status: ReviewStatus.NOT_STARTED,
        },
        include: {
          reviewee: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
          cycle: true,
        },
      });

      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create review' });
    }
  }
);

// Bulk assign reviews for a cycle
router.post(
  '/bulk-assign',
  authenticateToken,
  requireRole([UserRole.HR_ADMIN, UserRole.SUPER_ADMIN]),
  async (req: AuthRequest, res) => {
    try {
      const { cycleId, employeeIds } = req.body;

      if (!cycleId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ error: 'Cycle ID and employee IDs are required' });
      }

      // Verify cycle belongs to user's organization
      const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
      if (!cycle || cycle.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Review cycle not found' });
      }

      // Get employees with their managers (scoped to organization)
      const employees = await prisma.user.findMany({
        where: {
          id: { in: employeeIds },
          organizationId: req.user!.organizationId,
        },
        select: { id: true, name: true, email: true, managerId: true },
      });

      // Create reviews for each employee
      const reviews = [];
      for (const employee of employees) {
        // Skip if employee has no manager
        if (!employee.managerId) {
          continue;
        }

        // Check if review already exists
        const existing = await prisma.review.findFirst({
          where: {
            revieweeId: employee.id,
            cycleId,
          },
        });

        if (existing) {
          continue; // Skip if already assigned
        }

        const review = await prisma.review.create({
          data: {
            revieweeId: employee.id,
            reviewerId: employee.managerId,
            cycleId,
            status: ReviewStatus.NOT_STARTED,
            competencies: JSON.stringify(DEFAULT_COMPETENCIES),
            selfReflections: JSON.stringify(DEFAULT_SELF_REFLECTION_QUESTIONS),
          },
          include: {
            reviewee: { select: { id: true, name: true, email: true } },
            reviewer: { select: { id: true, name: true, email: true } },
          },
        });

        reviews.push(review);
      }

      res.status(201).json({
        message: `Successfully assigned ${reviews.length} reviews`,
        reviews,
      });
    } catch (error) {
      console.error('Bulk assign error:', error);
      res.status(500).json({ error: 'Failed to bulk assign reviews' });
    }
  }
);

// Submit self-assessment
router.patch('/:id/self-assessment', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { selfAssessment } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.revieweeId !== userId) {
      return res.status(403).json({ error: 'Can only submit your own self-assessment' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        selfAssessment,
        status: ReviewStatus.IN_PROGRESS,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit self-assessment' });
  }
});

// Submit manager assessment (legacy endpoint)
router.patch('/:id/manager-assessment', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { managerAssessment, overallRating } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewerId !== userId) {
      return res.status(403).json({ error: 'Can only submit assessment for your reports' });
    }

    if (overallRating && (overallRating < 1 || overallRating > 4)) {
      return res.status(400).json({ error: 'Rating must be between 1-4' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        managerAssessment,
        overallManagerRating: overallRating, // Map to new field
        status: ReviewStatus.COMPLETED,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit manager assessment' });
  }
});

// ===== PEER FEEDBACK =====

// Submit anonymous peer feedback
router.post('/:reviewId/peer-feedback', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId } = req.params;
    const { feedback, rating } = req.body;
    const giverId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (rating && (rating < 1 || rating > 4)) {
      return res.status(400).json({ error: 'Rating must be between 1-4' });
    }

    const peerFeedback = await prisma.peerFeedback.create({
      data: {
        reviewId,
        giverId,
        receiverId: review.revieweeId,
        feedback,
        rating,
      },
    });

    // Return without giver info to maintain anonymity
    res.status(201).json({
      id: peerFeedback.id,
      feedback: peerFeedback.feedback,
      rating: peerFeedback.rating,
      createdAt: peerFeedback.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit peer feedback' });
  }
});

// Get peer feedback for a review (anonymous)
router.get('/:reviewId/peer-feedback', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only reviewee, reviewer, or HR can see peer feedback
    const hasAccess =
      review.revieweeId === userId ||
      review.reviewerId === userId ||
      req.user!.role === UserRole.HR_ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const feedback = await prisma.peerFeedback.findMany({
      where: { reviewId },
      select: {
        id: true,
        feedback: true,
        rating: true,
        createdAt: true,
        // Don't include giver info - keep it anonymous
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch peer feedback' });
  }
});

// ===== COMPETENCY RATINGS =====

// Submit competency self-ratings
router.patch('/:id/competency-self-ratings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { competencies, overallSelfRating } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.revieweeId !== userId) {
      return res.status(403).json({ error: 'Can only submit your own ratings' });
    }

    // Validate ratings
    if (competencies && Array.isArray(competencies)) {
      for (const comp of competencies) {
        if (comp.selfRating && (comp.selfRating < 1 || comp.selfRating > 4)) {
          return res.status(400).json({ error: 'All ratings must be between 1-4' });
        }
      }
    }

    if (overallSelfRating && (overallSelfRating < 1 || overallSelfRating > 4)) {
      return res.status(400).json({ error: 'Overall rating must be between 1-4' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        competencies: JSON.stringify(competencies),
        overallSelfRating,
        status: ReviewStatus.IN_PROGRESS,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit competency ratings' });
  }
});

// Submit competency manager ratings
router.patch('/:id/competency-manager-ratings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { competencies, overallManagerRating } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Allow reviewer, HR_ADMIN, or SUPER_ADMIN
    const canSubmit = review.reviewerId === userId ||
                      req.user!.role === UserRole.HR_ADMIN ||
                      req.user!.role === UserRole.SUPER_ADMIN;

    if (!canSubmit) {
      return res.status(403).json({ error: 'Can only submit ratings as the reviewer' });
    }

    // Validate ratings
    if (competencies && Array.isArray(competencies)) {
      for (const comp of competencies) {
        if (comp.managerRating && (comp.managerRating < 1 || comp.managerRating > 4)) {
          return res.status(400).json({ error: 'All ratings must be between 1-4' });
        }
      }
    }

    if (overallManagerRating && (overallManagerRating < 1 || overallManagerRating > 4)) {
      return res.status(400).json({ error: 'Overall rating must be between 1-4' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        competencies: JSON.stringify(competencies),
        overallManagerRating,
        status: ReviewStatus.IN_PROGRESS,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit manager ratings' });
  }
});

// ===== SELF-REFLECTIONS =====

// Submit self-reflections
router.patch('/:id/self-reflections', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { selfReflections } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Allow reviewee (to answer), reviewer (to modify questions), and admins
    const canModify = review.revieweeId === userId ||
                      review.reviewerId === userId ||
                      req.user!.role === UserRole.HR_ADMIN ||
                      req.user!.role === UserRole.SUPER_ADMIN;

    if (!canModify) {
      return res.status(403).json({ error: 'Can only modify your own reflections or as the reviewer' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        selfReflections: JSON.stringify(selfReflections),
        status: ReviewStatus.IN_PROGRESS,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit self-reflections' });
  }
});

// ===== ASSIGNED GOALS =====

// Assign goals to review
router.patch('/:id/assign-goals', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { assignedGoals } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Allow reviewer, HR_ADMIN, or SUPER_ADMIN to assign goals
    const canAssign = review.reviewerId === userId ||
                      req.user!.role === UserRole.HR_ADMIN ||
                      req.user!.role === UserRole.SUPER_ADMIN;

    if (!canAssign) {
      return res.status(403).json({ error: 'Only the reviewer can assign goals' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        assignedGoals: JSON.stringify(assignedGoals),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign goals' });
  }
});

// ===== REVIEW HISTORY =====

// Get review history for a user
router.get('/history/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Only user, their manager, or HR can view history
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasAccess =
      userId === currentUserId ||
      user.managerId === currentUserId ||
      req.user!.role === UserRole.HR_ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        cycle: true,
        reviewer: { select: { id: true, name: true, email: true, title: true } },
        reviewee: { select: { id: true, name: true, email: true, title: true } },
        peerFeedback: {
          select: {
            id: true,
            feedback: true,
            rating: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
});

// ===== COMPETENCY COMMENTS =====

// Get comments for a specific competency
router.get('/:reviewId/competency-comments/:competencyName', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId, competencyName } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this review
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const hasAccess =
      review.revieweeId === userId ||
      review.reviewerId === userId ||
      req.user!.role === UserRole.HR_ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comments = await prisma.competencyComment.findMany({
      where: {
        reviewId,
        competencyName: decodeURIComponent(competencyName),
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch competency comments' });
  }
});

// Create a competency comment
router.post('/:reviewId/competency-comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId } = req.params;
    const { competencyName, content } = req.body;
    const userId = req.user!.id;

    if (!competencyName || !content) {
      return res.status(400).json({ error: 'Competency name and content are required' });
    }

    // Verify user has access to this review
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only reviewee, reviewer, or admins can comment
    const isReviewee = review.revieweeId === userId;
    const isReviewer = review.reviewerId === userId || req.user!.role === UserRole.HR_ADMIN || req.user!.role === UserRole.SUPER_ADMIN;

    if (!isReviewee && !isReviewer) {
      return res.status(403).json({ error: 'Only reviewee or reviewer can comment' });
    }

    const authorRole = isReviewee ? 'EMPLOYEE' : 'MANAGER';

    const comment = await prisma.competencyComment.create({
      data: {
        reviewId,
        competencyName,
        authorId: userId,
        authorRole,
        content,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a competency comment
router.patch('/:reviewId/competency-comments/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Verify comment exists and user is the author
    const comment = await prisma.competencyComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.reviewId !== reviewId) {
      return res.status(400).json({ error: 'Comment does not belong to this review' });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Can only edit your own comments' });
    }

    const updated = await prisma.competencyComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a competency comment
router.delete('/:reviewId/competency-comments/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const userId = req.user!.id;

    // Verify comment exists and user is the author
    const comment = await prisma.competencyComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.reviewId !== reviewId) {
      return res.status(400).json({ error: 'Comment does not belong to this review' });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Can only delete your own comments' });
    }

    await prisma.competencyComment.delete({
      where: { id: commentId },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ===== GOAL COMMENTS =====

// Get all comments for a specific goal
router.get('/:reviewId/goal-comments/:goalId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId, goalId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this review
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const hasAccess =
      review.revieweeId === userId ||
      review.reviewerId === userId ||
      req.user!.role === UserRole.HR_ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comments = await prisma.goalComment.findMany({
      where: {
        reviewId,
        goalId: decodeURIComponent(goalId),
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a new goal comment
router.post('/:reviewId/goal-comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId } = req.params;
    const { goalId, content } = req.body;
    const userId = req.user!.id;

    if (!goalId || !content) {
      return res.status(400).json({ error: 'Goal ID and content are required' });
    }

    // Verify user has access to this review
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only reviewee, reviewer, or admins can comment
    const isReviewee = review.revieweeId === userId;
    const isReviewer = review.reviewerId === userId || req.user!.role === UserRole.HR_ADMIN || req.user!.role === UserRole.SUPER_ADMIN;

    if (!isReviewee && !isReviewer) {
      return res.status(403).json({ error: 'Only reviewee or reviewer can comment' });
    }

    const authorRole = isReviewee ? 'EMPLOYEE' : 'MANAGER';

    const comment = await prisma.goalComment.create({
      data: {
        reviewId,
        goalId,
        content,
        authorId: userId,
        authorRole,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a goal comment
router.patch('/:reviewId/goal-comments/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Verify comment exists and user is the author
    const comment = await prisma.goalComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.reviewId !== reviewId) {
      return res.status(400).json({ error: 'Comment does not belong to this review' });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Can only edit your own comments' });
    }

    const updated = await prisma.goalComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a goal comment
router.delete('/:reviewId/goal-comments/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const userId = req.user!.id;

    // Verify comment exists and user is the author
    const comment = await prisma.goalComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.reviewId !== reviewId) {
      return res.status(400).json({ error: 'Comment does not belong to this review' });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Can only delete your own comments' });
    }

    await prisma.goalComment.delete({
      where: { id: commentId },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ===== SUMMARY COMMENTS =====

// Update summary comments
router.patch('/:id/summary-comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { summaryComments } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Parse existing summary comments
    let currentComments: any = {};
    if (review.summaryComments) {
      try {
        currentComments = JSON.parse(review.summaryComments);
      } catch (e) {
        currentComments = {};
      }
    }

    // Employee can update employeeComment, Manager can update managerComment
    if (review.revieweeId === userId && summaryComments.employeeComment !== undefined) {
      currentComments.employeeComment = summaryComments.employeeComment;
    } else if (review.reviewerId === userId && summaryComments.managerComment !== undefined) {
      currentComments.managerComment = summaryComments.managerComment;
    } else {
      return res.status(403).json({ error: 'Can only update your own summary comment' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        summaryComments: JSON.stringify(currentComments),
        status: ReviewStatus.IN_PROGRESS,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update summary comments' });
  }
});

export default router;
