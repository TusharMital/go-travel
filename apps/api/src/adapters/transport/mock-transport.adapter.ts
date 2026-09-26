import {
  ITransportProviderAdapter,
  TransportQuoteRequest,
  TransportQuoteResponse,
} from '@travel/shared';
import { getLocationProvider } from '../location/index.js';

export class MockTransportAdapter implements ITransportProviderAdapter {
  name = 'mock-transport-adapter';

  async getQuotes(request: TransportQuoteRequest): Promise<TransportQuoteResponse[]> {
    const locationProvider = getLocationProvider();
    const distanceRes = await locationProvider.distance(
      { lat: request.originLat, lng: request.originLng },
      { lat: request.destLat, lng: request.destLng }
    );

    const km = Math.max(0.5, distanceRes.distanceKm);

    // Realistic duration & pricing calculations based on distance
    const taxiDuration = Math.max(8, Math.round(km * 2.5));
    const taxiPrice = Math.round((5.0 + km * 2.2) * 100) / 100;

    const uberDuration = Math.max(7, Math.round(km * 2.2));
    const uberPrice = Math.round((6.0 + km * 1.95) * 100) / 100;

    const transitDuration = Math.max(12, Math.round(km * 3.2));
    const transitPrice = 3.6;

    const bikeDuration = Math.max(10, Math.round(km * 4.5));
    const bikePrice = Math.round((1.5 + km * 0.8) * 100) / 100;

    const quotes: TransportQuoteResponse[] = [
      // 1. Direct-Bookable Partner Licensed Taxi
      {
        providerId: 'prov-city-taxi',
        providerName: 'Partner Metropolitan Licensed Taxi',
        mode: 'taxi',
        estimatedPrice: taxiPrice,
        currency: 'USD',
        estimatedDurationMin: taxiDuration,
        isDirectBookable: true,
      },
      // 2. Direct-Bookable Public Transit with Step-by-Step Directions
      {
        providerId: 'prov-metro-transit',
        providerName: 'City Public Transit (S/U-Bahn & Bus)',
        mode: 'transit',
        estimatedPrice: transitPrice,
        currency: 'USD',
        estimatedDurationMin: transitDuration,
        isDirectBookable: true,
        transitSteps: [
          {
            instruction: 'Walk 200m to the nearest rapid transit platform',
            mode: 'WALK',
            durationMinutes: 3,
            distanceMeters: 200,
          },
          {
            instruction: 'Board Metro Express line towards city center (5 stops)',
            mode: 'SUBWAY',
            line: 'U2 / Line 4',
            durationMinutes: transitDuration - 6,
          },
          {
            instruction: 'Exit at destination station and walk 150m to arrival address',
            mode: 'WALK',
            durationMinutes: 3,
            distanceMeters: 150,
          },
        ],
      },
      // 3. Deep-Link Only Rideshare Provider (Handoff)
      {
        providerId: 'prov-uber-mock',
        providerName: 'Uber Comfort / Black',
        mode: 'rideshare',
        estimatedPrice: uberPrice,
        currency: 'USD',
        estimatedDurationMin: uberDuration,
        isDirectBookable: false,
        deepLinkUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${request.originLat}&pickup[longitude]=${request.originLng}&dropoff[latitude]=${request.destLat}&dropoff[longitude]=${request.destLng}`,
      },
      // 4. Deep-Link Only Micromobility (Lime E-Bike Handoff)
      {
        providerId: 'prov-lime-mock',
        providerName: 'Lime E-Bike & Scooter Share',
        mode: 'bike',
        estimatedPrice: bikePrice,
        currency: 'USD',
        estimatedDurationMin: bikeDuration,
        isDirectBookable: false,
        deepLinkUrl: `https://lime.bike/ride?lat=${request.originLat}&lng=${request.originLng}`,
      },
    ];

    if (request.mode && request.mode !== 'ALL') {
      const target = request.mode.toLowerCase();
      return quotes.filter((q) => q.mode.toLowerCase() === target);
    }

    return quotes;
  }
}
