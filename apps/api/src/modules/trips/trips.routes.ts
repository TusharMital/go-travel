import { Router } from 'express';
import { z } from 'zod';
import { tripsController } from './trips.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';
import { validateRequest, IdParamDto } from '../../middlewares/validation.middleware.js';
import {
  CreateTripDto,
  UpdateTripDto,
  CreateItineraryItemDto,
  UpdateItineraryItemDto,
} from './trips.dto.js';

export const tripsRouter = Router();

// Protect all trip endpoints with authentication
tripsRouter.use(authenticate);

const ItineraryItemParamDto = z.object({
  id: z.string().min(1).max(128),
  itemId: z.string().min(1).max(128),
});

// Trip CRUD
tripsRouter.post(
  '/',
  requireIdempotencyKey,
  validateRequest({ body: CreateTripDto }),
  tripsController.createTrip.bind(tripsController)
);
tripsRouter.get('/', tripsController.listTrips.bind(tripsController));
tripsRouter.get(
  '/:id',
  validateRequest({ params: IdParamDto }),
  tripsController.getTrip.bind(tripsController)
);
tripsRouter.put(
  '/:id',
  requireIdempotencyKey,
  validateRequest({ params: IdParamDto, body: UpdateTripDto }),
  tripsController.updateTrip.bind(tripsController)
);
tripsRouter.delete(
  '/:id',
  validateRequest({ params: IdParamDto }),
  tripsController.deleteTrip.bind(tripsController)
);

// Itinerary Gap Detection
tripsRouter.get(
  '/:id/gaps',
  validateRequest({ params: IdParamDto }),
  tripsController.detectGaps.bind(tripsController)
);

// Itinerary Items CRUD
tripsRouter.post(
  '/:id/itinerary',
  requireIdempotencyKey,
  validateRequest({ params: IdParamDto, body: CreateItineraryItemDto }),
  tripsController.addItineraryItem.bind(tripsController)
);
tripsRouter.put(
  '/:id/itinerary/:itemId',
  requireIdempotencyKey,
  validateRequest({ params: ItineraryItemParamDto, body: UpdateItineraryItemDto }),
  tripsController.updateItineraryItem.bind(tripsController)
);
tripsRouter.delete(
  '/:id/itinerary/:itemId',
  validateRequest({ params: ItineraryItemParamDto }),
  tripsController.deleteItineraryItem.bind(tripsController)
);

