import { Request, Response, NextFunction } from 'express';
import { storageService } from './storage.service.js';
import {
  SearchStorageLocationsQueryDto,
  UpdateInventoryDto,
  CreateStorageBookingDto,
  TransitionBookingStatusDto,
} from './storage.dto.js';
import { parsePagination } from '../../utils/pagination.js';
import { StorageBookingStatus } from '@travel/shared';
import { AppError } from '../../middlewares/error.middleware.js';

export class StorageController {
  async searchLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SearchStorageLocationsQueryDto.parse(req.query);
      const results = await storageService.searchLocations(validated);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fromCoord = req.query.from_lat && req.query.from_lng
        ? { lat: Number(req.query.from_lat), lng: Number(req.query.from_lng) }
        : undefined;

      const location = await storageService.getLocationById(req.params.id, fromCoord);
      res.status(200).json(location);
    } catch (err) {
      next(err);
    }
  }

  async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = UpdateInventoryDto.parse(req.body);
      const result = await storageService.updateInventory(
        req.user!.id,
        req.params.id,
        validated,
        req.correlationId || '',
        req.user!.role
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey = req.header('Idempotency-Key');
      if (!idempotencyKey) {
        throw new AppError('Idempotency-Key header is required for creating a booking.', 400, 'MISSING_IDEMPOTENCY_KEY');
      }

      const validated = CreateStorageBookingDto.parse(req.body);
      const booking = await storageService.createBooking(
        req.user!.id,
        validated,
        idempotencyKey,
        req.correlationId || ''
      );
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  }

  async listMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePagination(req);
      const status = req.query.status as string | undefined;
      const bookings = await storageService.listUserBookings(req.user!.id, pagination, status);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }

  async confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await storageService.transitionBookingStatus(
        req.params.id,
        req.user!.id,
        req.user!.role,
        StorageBookingStatus.CONFIRMED,
        req.correlationId || ''
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async checkInBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await storageService.transitionBookingStatus(
        req.params.id,
        req.user!.id,
        req.user!.role,
        StorageBookingStatus.CHECKED_IN,
        req.correlationId || ''
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async checkOutBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await storageService.transitionBookingStatus(
        req.params.id,
        req.user!.id,
        req.user!.role,
        StorageBookingStatus.CHECKED_OUT,
        req.correlationId || ''
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reason = req.body?.reason || 'Cancelled by user';
      const updated = await storageService.transitionBookingStatus(
        req.params.id,
        req.user!.id,
        req.user!.role,
        StorageBookingStatus.CANCELLED,
        req.correlationId || '',
        reason
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async transitionBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { target_status, cancellation_reason } = TransitionBookingStatusDto.parse(req.body);
      const updated = await storageService.transitionBookingStatus(
        req.params.id,
        req.user!.id,
        req.user!.role,
        target_status,
        req.correlationId || '',
        cancellation_reason
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}

export const storageController = new StorageController();
