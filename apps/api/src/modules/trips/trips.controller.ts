import { Request, Response, NextFunction } from 'express';
import { tripsService } from './trips.service.js';
import {
  CreateTripDto,
  UpdateTripDto,
  CreateItineraryItemDto,
  UpdateItineraryItemDto,
} from './trips.dto.js';
import { parsePagination } from '../../utils/pagination.js';

export class TripsController {
  async createTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateTripDto.parse(req.body);
      const trip = await tripsService.createTrip(
        req.user!.id,
        validated,
        req.correlationId || ''
      );
      res.status(201).json(trip);
    } catch (err) {
      next(err);
    }
  }

  async listTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePagination(req);
      const statusFilter = req.query.status as string | undefined;
      const result = await tripsService.listTrips(req.user!.id, pagination, statusFilter);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trip = await tripsService.getTripById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json(trip);
    } catch (err) {
      next(err);
    }
  }

  async updateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = UpdateTripDto.parse(req.body);
      const updated = await tripsService.updateTrip(
        req.params.id,
        req.user!.id,
        validated,
        req.correlationId || '',
        req.user!.role
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tripsService.deleteTrip(
        req.params.id,
        req.user!.id,
        req.correlationId || '',
        req.user!.role
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // Itinerary Item Endpoints
  async addItineraryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateItineraryItemDto.parse(req.body);
      const item = await tripsService.addItineraryItem(
        req.params.id,
        req.user!.id,
        validated,
        req.correlationId || '',
        req.user!.role
      );
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }

  async updateItineraryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = UpdateItineraryItemDto.parse(req.body);
      const updated = await tripsService.updateItineraryItem(
        req.params.id,
        req.params.itemId,
        req.user!.id,
        validated,
        req.correlationId || '',
        req.user!.role
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteItineraryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tripsService.deleteItineraryItem(
        req.params.id,
        req.params.itemId,
        req.user!.id,
        req.correlationId || '',
        req.user!.role
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // Gap Detection Endpoint
  async detectGaps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gaps = await tripsService.detectItineraryGaps(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({ data: gaps });
    } catch (err) {
      next(err);
    }
  }
}

export const tripsController = new TripsController();
