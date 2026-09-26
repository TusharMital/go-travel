import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockLocationProvider } from '../src/adapters/location/mock-location.provider.js';
import { getLocationProvider, setLocationProvider } from '../src/adapters/location/index.js';

describe('4.3 Mapping & Location Services', () => {
  const app = createApp();
  let provider: MockLocationProvider;

  beforeEach(() => {
    provider = new MockLocationProvider();
    setLocationProvider(provider);
  });

  describe('MockLocationProvider (Deterministic Unit Tests)', () => {
    it('geocodes known preset landmarks accurately', async () => {
      const berlinHbf = await provider.geocode('Berlin Hauptbahnhof');
      expect(berlinHbf.lat).toBeCloseTo(52.5251, 3);
      expect(berlinHbf.lng).toBeCloseTo(13.3694, 3);
      expect(berlinHbf.city).toBe('Berlin');
      expect(berlinHbf.country).toBe('Germany');

      const eiffel = await provider.geocode('Eiffel Tower');
      expect(eiffel.lat).toBeCloseTo(48.8584, 3);
      expect(eiffel.lng).toBeCloseTo(2.2945, 3);
      expect(eiffel.city).toBe('Paris');
      expect(eiffel.country).toBe('France');

      const tokyo = await provider.geocode('Tokyo Station');
      expect(tokyo.lat).toBeCloseTo(35.6812, 3);
      expect(tokyo.lng).toBeCloseTo(139.7671, 3);
      expect(tokyo.city).toBe('Tokyo');
      expect(tokyo.country).toBe('Japan');
    });

    it('geocodes city names deterministically', async () => {
      const res = await provider.geocode('Berlin, Germany');
      expect(res.lat).toBe(52.52);
      expect(res.lng).toBe(13.405);
      expect(res.city).toBe('Berlin');
    });

    it('produces repeatable deterministic results for arbitrary addresses', async () => {
      const addr = '742 Evergreen Terrace, Springfield';
      const res1 = await provider.geocode(addr);
      const res2 = await provider.geocode(addr);

      expect(res1.lat).toBe(res2.lat);
      expect(res1.lng).toBe(res2.lng);
      expect(res1.placeId).toBe(res2.placeId);
      expect(typeof res1.lat).toBe('number');
      expect(typeof res1.lng).toBe('number');
    });

    it('reverseGeocodes coordinates near landmarks to exact landmark addresses', async () => {
      // Coordinates right at Berlin Hauptbahnhof
      const res = await provider.reverseGeocode(52.5251, 13.3694);
      expect(res.city).toBe('Berlin');
      expect(res.country).toBe('Germany');
      expect(res.address).toContain('Europaplatz 1');
    });

    it('reverseGeocodes coordinates within known city bounding boxes', async () => {
      // Coordinates in Paris area
      const res = await provider.reverseGeocode(48.865, 2.34);
      expect(res.city).toBe('Paris');
      expect(res.country).toBe('France');
    });

    it('calculates zero distance for identical coordinates', async () => {
      const coord = { lat: 52.5251, lng: 13.3694 };
      const dist = await provider.distance(coord, coord);
      expect(dist.distanceMeters).toBe(0);
      expect(dist.distanceKm).toBe(0);
    });

    it('calculates realistic distance between Berlin Hbf and Alexanderplatz', async () => {
      const berlinHbf = { lat: 52.5251, lng: 13.3694 };
      const alexanderplatz = { lat: 52.5219, lng: 13.4132 };

      const dist = await provider.distance(berlinHbf, alexanderplatz);
      // Realistic straight line distance is ~3.0 km to 3.2 km
      expect(dist.distanceMeters).toBeGreaterThan(2800);
      expect(dist.distanceMeters).toBeLessThan(3400);
      expect(dist.distanceKm).toBeGreaterThanOrEqual(2.8);
      expect(dist.distanceKm).toBeLessThanOrEqual(3.4);
    });

    it('estimates walking time realistically with street routing factor', async () => {
      const berlinHbf = { lat: 52.5251, lng: 13.3694 };
      const alexanderplatz = { lat: 52.5219, lng: 13.4132 };

      const walking = await provider.estimateWalkingTime(berlinHbf, alexanderplatz);
      expect(walking.distanceMeters).toBeGreaterThan(2800);
      // At ~4.8 km/h with 1.2 street detour, ~3.6-3.8 km walking takes ~45 to 55 minutes
      expect(walking.walkingDurationMinutes).toBeGreaterThanOrEqual(40);
      expect(walking.walkingDurationMinutes).toBeLessThanOrEqual(60);
      expect(walking.walkingDurationSeconds).toBeGreaterThan(2400);
      expect(walking.walkingDurationMinutes).toBe(Math.max(1, Math.round(walking.walkingDurationSeconds / 60)));
      expect(walking.formattedDuration).toContain('mins');
    });

    it('handles zero-distance walking time gracefully', async () => {
      const coord = { lat: 52.52, lng: 13.4 };
      const walking = await provider.estimateWalkingTime(coord, coord);
      expect(walking.distanceMeters).toBe(0);
      expect(walking.walkingDurationMinutes).toBe(0);
      expect(walking.formattedDuration).toBe('0 mins');
    });

    it('supports backward-compatible calculateDistance for IMapsProvider', async () => {
      const result = await provider.calculateDistance(52.5251, 13.3694, 52.5219, 13.4132);
      expect(result.distanceMeters).toBeGreaterThan(2800);
      expect(result.durationSeconds).toBeGreaterThan(0);
    });
  });

  describe('Location REST API Endpoints (/api/v1/location)', () => {
    describe('GET /api/v1/location/geocode', () => {
      it('returns geocoded coordinates for valid address', async () => {
        const res = await request(app)
          .get('/api/v1/location/geocode?address=Berlin Hauptbahnhof')
          .expect(200);

        expect(res.body.lat).toBeCloseTo(52.5251, 3);
        expect(res.body.lng).toBeCloseTo(13.3694, 3);
        expect(res.body.city).toBe('Berlin');
        expect(res.headers['x-correlation-id']).toBeDefined();
      });

      it('returns 400 when address is missing or empty', async () => {
        const res = await request(app)
          .get('/api/v1/location/geocode?address=')
          .expect(400);

        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/v1/location/reverse-geocode', () => {
      it('returns address details for valid coordinates', async () => {
        const res = await request(app)
          .get('/api/v1/location/reverse-geocode?lat=48.8809&lng=2.3553')
          .expect(200);

        expect(res.body.city).toBe('Paris');
        expect(res.body.country).toBe('France');
        expect(res.body.address).toContain('Gare du Nord');
      });

      it('returns 400 when coordinates are out of valid range', async () => {
        const res = await request(app)
          .get('/api/v1/location/reverse-geocode?lat=195&lng=20')
          .expect(400);

        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('returns 400 when lat or lng is missing', async () => {
        const res = await request(app)
          .get('/api/v1/location/reverse-geocode?lat=48.8809')
          .expect(400);

        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET & POST /api/v1/location/distance', () => {
      it('calculates distance via GET query parameters', async () => {
        const res = await request(app)
          .get(
            '/api/v1/location/distance?origin_lat=52.5251&origin_lng=13.3694&dest_lat=52.5219&dest_lng=13.4132'
          )
          .expect(200);

        expect(res.body.distanceMeters).toBeGreaterThan(2800);
        expect(res.body.distanceKm).toBeGreaterThan(2.5);
      });

      it('calculates distance via POST JSON body', async () => {
        const res = await request(app)
          .post('/api/v1/location/distance')
          .send({
            origin: { lat: 52.5251, lng: 13.3694 },
            destination: { lat: 52.5219, lng: 13.4132 },
          })
          .expect(200);

        expect(res.body.distanceMeters).toBeGreaterThan(2800);
        expect(res.body.origin.lat).toBe(52.5251);
      });

      it('returns 400 on malformed distance request body', async () => {
        const res = await request(app)
          .post('/api/v1/location/distance')
          .send({ origin: { lat: 'invalid' } })
          .expect(400);

        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET & POST /api/v1/location/walking-time', () => {
      it('calculates walking time via GET query parameters', async () => {
        const res = await request(app)
          .get(
            '/api/v1/location/walking-time?origin_lat=52.5251&origin_lng=13.3694&dest_lat=52.5163&dest_lng=13.3777'
          )
          .expect(200);

        expect(res.body.distanceMeters).toBeGreaterThan(0);
        expect(res.body.walkingDurationMinutes).toBeGreaterThan(0);
        expect(res.body.formattedDuration).toBeDefined();
      });

      it('calculates walking time via POST body', async () => {
        const res = await request(app)
          .post('/api/v1/location/walking-time')
          .send({
            origin: { lat: 52.5251, lng: 13.3694 },
            destination: { lat: 52.5163, lng: 13.3777 },
          })
          .expect(200);

        expect(res.body.walkingDurationMinutes).toBeGreaterThan(0);
        expect(typeof res.body.formattedDuration).toBe('string');
      });

      it('returns 400 when walking time coordinates are invalid', async () => {
        const res = await request(app)
          .post('/api/v1/location/walking-time')
          .send({
            origin: { lat: 95, lng: 10 },
            destination: { lat: 52, lng: 13 },
          })
          .expect(400);

        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });
});
