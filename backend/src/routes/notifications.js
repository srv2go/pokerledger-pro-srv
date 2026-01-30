const express = require('express');
const { query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/notifications
 * Get notifications for current user
 */
router.get('/', [
  query('status').optional().isIn(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']),
  query('channel').optional().isIn(['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('unreadOnly').optional().isBoolean()
], async (req, res, next) => {
  try {
    const { status, channel, limit = 50, unreadOnly } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (unreadOnly === 'true') where.readAt = null;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { 
        id: req.params.id,
        userId: req.user.id
      },
      data: { 
        readAt: new Date(),
        status: 'READ'
      }
    });

    res.json({ notification });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Notification not found' });
    }
    next(error);
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null
      },
      data: {
        readAt: new Date(),
        status: 'READ'
      }
    });

    res.json({ message: `${result.count} notifications marked as read` });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.notification.delete({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Notification not found' });
    }
    next(error);
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { preferences: true }
    });

    const defaultPreferences = {
      channels: {
        inApp: true,
        sms: false,
        whatsapp: true,
        email: true
      },
      types: {
        gameInvitation: true,
        topUpRequest: true,
        topUpApproved: true,
        gameReminder: true,
        gameSummary: true,
        balanceReminder: true
      }
    };

    res.json({
      preferences: user?.preferences?.notifications || defaultPreferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', async (req, res, next) => {
  try {
    const { preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        preferences: {
          ...(await prisma.user.findUnique({ where: { id: req.user.id } }))?.preferences,
          notifications: preferences
        }
      },
      select: { preferences: true }
    });

    res.json({ preferences: user.preferences?.notifications });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
