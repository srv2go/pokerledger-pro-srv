const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireMinRole } = require('../middleware/auth');
const { ensureDefaultAutomations, ALLOWED_PRESETS } = require('../services/automationDefaults');

const router = express.Router();
const prisma = new PrismaClient();


const serializeAutomation = (record) => ({
  id: record.id,
  key: record.key,
  name: record.name,
  description: record.description,
  trigger: record.trigger,
  enabled: record.enabled,
  channels: record.channels || [],
  schedule: {
    preset: record.preset,
    timezone: record.timezone,
    cronExpression: record.cronExpression || '',
  },
  updatedAt: record.updatedAt,
});

const serializeOverride = (record) => ({
  id: record.id,
  automationId: record.automationId,
  playerId: record.playerId,
  channels: record.channels || [],
  muted: record.muted,
  metadata: record.metadata || null,
  updatedAt: record.updatedAt,
});

const normalizePreset = (preset) => {
  if (!preset) return undefined;
  const key = String(preset).toUpperCase();
  return ALLOWED_PRESETS.has(key) ? key : 'CUSTOM';
};

const normalizeChannels = (channels) => {
  if (!channels) return undefined;
  if (!Array.isArray(channels)) return undefined;
  const clean = channels
    .map(ch => String(ch || '').trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(clean));
};

// ─── LIST AUTOMATIONS ──────────────────────────────────
router.get('/', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const automations = await ensureDefaultAutomations(req.user.id);
    res.json({ automations: automations.map(serializeAutomation) });
  } catch (err) { next(err); }
});

// ─── UPDATE AUTOMATION (schedule / enabled) ────────────
router.put('/:id', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const hostId = req.user.id;
    const automation = await prisma.automation.findFirst({ where: { id: req.params.id, hostId } });
    if (!automation) return res.status(404).json({ error: 'Automation not found' });

    const data = {};
    if (typeof req.body.enabled === 'boolean') data.enabled = req.body.enabled;

    if (req.body.schedule) {
      const { preset, timezone, cronExpression } = req.body.schedule;
      const normalizedPreset = normalizePreset(preset);
      if (normalizedPreset) data.preset = normalizedPreset;
      if (typeof timezone === 'string' && timezone.trim()) data.timezone = timezone.trim();
      if (typeof cronExpression === 'string') {
        const cleanCron = cronExpression.trim();
        data.cronExpression = cleanCron.length ? cleanCron : null;
      }
    }

    const channelUpdate = normalizeChannels(req.body.channels);
    if (channelUpdate) data.channels = channelUpdate;

    const updated = await prisma.automation.update({ where: { id: automation.id }, data });
    res.json({ automation: serializeAutomation(updated) });
  } catch (err) { next(err); }
});

// ─── PLAYER OVERRIDE (mute / custom channels) ───────────
router.post('/player/:playerId', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const hostId = req.user.id;
    const { playerId } = req.params;
    const { automationId, channels, muted, metadata } = req.body || {};
    if (!automationId) return res.status(400).json({ error: 'automationId is required' });

    const automation = await prisma.automation.findFirst({ where: { id: automationId, hostId } });
    if (!automation) return res.status(404).json({ error: 'Automation not found' });

    const player = await prisma.user.findUnique({ where: { id: playerId } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const override = await prisma.automationOverride.upsert({
      where: { automationId_playerId: { automationId, playerId } },
      update: {
        muted: typeof muted === 'boolean' ? muted : false,
        channels: normalizeChannels(channels) || automation.channels,
        metadata: metadata || null,
      },
      create: {
        automationId,
        playerId,
        channels: normalizeChannels(channels) || automation.channels,
        muted: typeof muted === 'boolean' ? muted : false,
        metadata: metadata || null,
      },
    });

    res.json({ override: serializeOverride(override) });
  } catch (err) { next(err); }
});

module.exports = router;
