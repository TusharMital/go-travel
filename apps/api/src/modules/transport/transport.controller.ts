import { Request, Response, NextFunction } from 'express';
import { transportService } from './transport.service.js';
import {
  SearchTransportOptionsQueryDto,
  CreateTransportBookingDto,
  HandoffTransportDto,
} from './transport.dto.js';
import { parsePagination } from '../../utils/pagination.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class TransportController {
  async searchOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SearchTransportOptionsQueryDto.parse(req.query);
      const results = await transportService.searchOptions(validated);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }

  async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey = req.header('Idempotency-Key');
      if (!idempotencyKey) {
        throw new AppError('Idempotency-Key header is required for creating a transport booking.', 400, 'MISSING_IDEMPOTENCY_KEY');
      }

      const validated = CreateTransportBookingDto.parse(req.body);
      const result = await transportService.createBookingOrHandoff(
        req.user!.id,
        validated,
        idempotencyKey,
        req.correlationId || ''
      );

      res.status(result.handoff ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordHandoff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = HandoffTransportDto.parse(req.body);
      const result = await transportService.recordHandoff(
        req.user!.id,
        validated,
        req.correlationId || ''
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePagination(req);
      const status = req.query.status as string | undefined;
      const bookings = await transportService.listUserBookings(req.user!.id, pagination, status);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reason = req.body?.reason || 'Cancelled by traveler';
      const updated = await transportService.cancelBooking(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.correlationId || '',
        reason
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}

export const transportController = new TransportController();
