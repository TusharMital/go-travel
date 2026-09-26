import { Router } from 'express';
import { tripsController } from './trips.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';

export const tripsRouter = Router();

// Protect all trip endpoints with authentication
tripsRouter.use(authenticate);

// Trip CRUD
tripsRouter.post('/', requireIdempotencyKey, tripsController.createTrip.bind(tripsController));
tripsRouter.get('/', tripsController.listTrips.bind(tripsController));
tripsRouter.get('/:id', tripsController.getTrip.bind(tripsController));
tripsRouter.put('/:id', requireIdempotencyKey, tripsController.updateTrip.bind(tripsController));
tripsRouter.delete('/:id', tripsController.deleteTrip.bind(tripsController));

// Itinerary Gap Detection
tripsRouter.get('/:id/gaps', tripsController.detectGaps.bind(tripsController));

// Itinerary Items CRUD
tripsRouter.post('/:id/itinerary', requireIdempotencyKey, tripsController.addItineraryItem.bind(tripsController));
tripsRouter.put('/:id/itinerary/:itemId', requireIdempotencyKey, tripsController.updateItineraryItem.bind(tripsController));
tripsRouter.delete('/:id/itinerary/:itemId', tripsController.deleteItineraryItem.bind(tripsController));
