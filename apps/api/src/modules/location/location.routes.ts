import { Router } from 'express';
import { locationController } from './location.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
  GeocodeQuerySchema,
  ReverseGeocodeQuerySchema,
  CoordinatePairQuerySchema,
  CoordinatePairBodySchema,
} from './location.dto.js';

export const locationRouter = Router();

// Geocoding and Reverse Geocoding
locationRouter.get(
  '/geocode',
  validateRequest({ query: GeocodeQuerySchema }),
  (req, res, next) => locationController.geocode(req, res, next)
);
locationRouter.get(
  '/reverse-geocode',
  validateRequest({ query: ReverseGeocodeQuerySchema }),
  (req, res, next) => locationController.reverseGeocode(req, res, next)
);

// Distance Matrix
locationRouter.get(
  '/distance',
  validateRequest({ query: CoordinatePairQuerySchema }),
  (req, res, next) => locationController.distance(req, res, next)
);
locationRouter.post(
  '/distance',
  validateRequest({ body: CoordinatePairBodySchema }),
  (req, res, next) => locationController.distance(req, res, next)
);

// Walking Time Estimation
locationRouter.get(
  '/walking-time',
  validateRequest({ query: CoordinatePairQuerySchema }),
  (req, res, next) => locationController.walkingTime(req, res, next)
);
locationRouter.post(
  '/walking-time',
  validateRequest({ body: CoordinatePairBodySchema }),
  (req, res, next) => locationController.walkingTime(req, res, next)
);

