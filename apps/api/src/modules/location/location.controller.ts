import { Request, Response, NextFunction } from 'express';
import { locationService } from './location.service.js';
import {
  GeocodeQuerySchema,
  ReverseGeocodeQuerySchema,
  CoordinatePairQuerySchema,
  CoordinatePairBodySchema,
} from './location.dto.js';

export class LocationController {
  async geocode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { address } = GeocodeQuerySchema.parse(req.query);
      const result = await locationService.geocode(address);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async reverseGeocode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng } = ReverseGeocodeQuerySchema.parse(req.query);
      const result = await locationService.reverseGeocode(lat, lng);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async distance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let origin: { lat: number; lng: number };
      let destination: { lat: number; lng: number };

      if (req.method === 'POST') {
        const body = CoordinatePairBodySchema.parse(req.body);
        origin = body.origin;
        destination = body.destination;
      } else {
        const query = CoordinatePairQuerySchema.parse(req.query);
        origin = { lat: query.origin_lat, lng: query.origin_lng };
        destination = { lat: query.dest_lat, lng: query.dest_lng };
      }

      const result = await locationService.getDistance(origin, destination);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async walkingTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let origin: { lat: number; lng: number };
      let destination: { lat: number; lng: number };

      if (req.method === 'POST') {
        const body = CoordinatePairBodySchema.parse(req.body);
        origin = body.origin;
        destination = body.destination;
      } else {
        const query = CoordinatePairQuerySchema.parse(req.query);
        origin = { lat: query.origin_lat, lng: query.origin_lng };
        destination = { lat: query.dest_lat, lng: query.dest_lng };
      }

      const result = await locationService.getWalkingTime(origin, destination);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const locationController = new LocationController();
