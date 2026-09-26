import {
  ITransportProviderAdapter,
  TransportQuoteRequest,
  TransportQuoteResponse,
} from '@travel/shared';

export class MockTransportAdapter implements ITransportProviderAdapter {
  name = 'mock-transport-adapter';

  async getQuotes(request: TransportQuoteRequest): Promise<TransportQuoteResponse[]> {
    // Return sample quotes with realistic durations & pricing
    return [
      {
        providerId: 'prov-uber-mock',
        providerName: 'Uber Black / Comfort',
        mode: 'rideshare',
        estimatedPrice: 28.5,
        currency: 'USD',
        estimatedDurationMin: 18,
        deepLinkUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${request.originLat}&pickup[longitude]=${request.originLng}&dropoff[latitude]=${request.destLat}&dropoff[longitude]=${request.destLng}`,
      },
      {
        providerId: 'prov-metro-mock',
        providerName: 'City Express Transit (U-Bahn)',
        mode: 'transit',
        estimatedPrice: 3.8,
        currency: 'USD',
        estimatedDurationMin: 24,
      },
      {
        providerId: 'prov-city-taxi',
        providerName: 'Metropolitan Licensed Taxi',
        mode: 'taxi',
        estimatedPrice: 32.0,
        currency: 'USD',
        estimatedDurationMin: 16,
      },
      {
        providerId: 'prov-lime-mock',
        providerName: 'City E-Bike Share',
        mode: 'bike',
        estimatedPrice: 5.5,
        currency: 'USD',
        estimatedDurationMin: 22,
        deepLinkUrl: 'https://lime.bike/ride',
      },
    ];
  }
}
