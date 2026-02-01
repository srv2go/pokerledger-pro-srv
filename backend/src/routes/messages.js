const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/messages
 * Get inbox messages for current user
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('unreadOnly').optional().isBoolean()
], async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, unreadOnly } = req.query;
    const userId = req.user.id;

    // Check if user has PREMIUM subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true }
    });

    if (user.subscriptionTier !== 'PREMIUM') {
      return res.status(403).json({ 
        error: 'In-app messaging is only available for PREMIUM users',
        upgradeRequired: true
      });
    }

    const where = {
      recipientId: userId
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: { id: true, displayName: true, avatarUrl: true }
          },
          game: {
            select: { id: true, name: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.message.count({ where })
    ]);

    const unreadCount = await prisma.message.count({
      where: { recipientId: userId, isRead: false }
    });

    res.json({
      messages,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/messages
 * Send a message to another user
 */
router.post('/', [
  body('recipientId').isUUID(),
  body('subject').optional().trim().isLength({ max: 200 }),
  body('body').trim().isLength({ min: 1, max: 5000 }),
  body('gameId').optional().isUUID(),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId, subject, body, gameId, priority = 'NORMAL' } = req.body;
    const senderId = req.user.id;

    // Verify sender is HOST, ADMIN, or SUPER_ADMIN
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { role: true, subscriptionTier: true }
    });

    if (!['HOST', 'ADMIN', 'SUPER_ADMIN'].includes(sender.role)) {
      return res.status(403).json({ error: 'Only hosts and admins can send messages' });
    }

    // Verify recipient exists and has PREMIUM
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { subscriptionTier: true }
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient.subscriptionTier !== 'PREMIUM') {
      return res.status(400).json({ 
        error: 'Recipient must have PREMIUM subscription to receive messages' 
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId,
        subject,
        body,
        gameId,
        priority
      },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true }
        },
        game: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({ message, success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/messages/:id/read
 * Mark message as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId !== userId) {
      return res.status(403).json({ error: 'Not your message' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: updatedMessage, success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message (recipient only)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId !== userId) {
      return res.status(403).json({ error: 'Not your message' });
    }

    await prisma.message.delete({ where: { id } });

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
