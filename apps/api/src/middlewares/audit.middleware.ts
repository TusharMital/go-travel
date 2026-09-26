import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma.js';
import { IAuditLogData } from '@travel/shared';
import { Prisma } from '@prisma/client';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-correlation-id'] as string;
  const correlationId = incomingId || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

export async function recordAuditEvent(data: IAuditLogData): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actor_user_id: data.actorUserId || null,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        before_state: (data.beforeState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        after_state: (data.afterState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        correlation_id: data.correlationId,
      },
    });
  } catch (err) {
    console.error('Failed to record audit event:', err);
  }
}
