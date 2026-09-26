import { Router } from 'express';
import { locationController } from './location.controller.js';

export const locationRouter = Router();

// Geocoding and Reverse Geocoding
locationRouter.get('/geocode', (req, res, next) => locationController.geocode(req, res, next));
locationRouter.get('/reverse-geocode', (req, res, next) => locationController.reverseGeocode(req, res, next));

// Distance Matrix
locationRouter.get('/distance', (req, res, next) => locationController.distance(req, res, next));
locationRouter.post('/distance', (req, res, next) => locationController.distance(req, res, next));

// Walking Time Estimation
locationRouter.get('/walking-time', (req, res, next) => locationController.walkingTime(req, res, next));
locationRouter.post('/walking-time', (req, res, next) => locationController.walkingTime(req, res, next));
