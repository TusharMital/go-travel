import { PrismaClient, UserRole, PartnerType, PartnerStatus, VerificationStatus, TripStatus, ItineraryItemType, StorageBookingStatus, TransportMode, TransportBookingStatus, PaymentStatus, PaymentRelatedType, NotificationChannel, NotificationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing records in reverse dependency order
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.itineraryItem.deleteMany();
  await prisma.storageBooking.deleteMany();
  await prisma.transportBooking.deleteMany();
  await prisma.transportOption.deleteMany();
  await prisma.storageInventory.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.storageProvider.deleteMany();
  await prisma.transportProvider.deleteMany();
  await prisma.partnerAccount.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed 5 Users across distinct roles
  console.log('👤 Seeding users...');
  const traveler = await prisma.user.create({
    data: {
      email: 'traveler@example.com',
      password_hash: passwordHash,
      full_name: 'Elena Rostova',
      phone: '+49 170 1234567',
      role: UserRole.traveler,
      email_verified_at: new Date(),
    },
  });

  const storagePartnerUser = await prisma.user.create({
    data: {
      email: 'storage.partner@example.com',
      password_hash: passwordHash,
      full_name: 'Klaus Schmidt',
      phone: '+49 171 2345678',
      role: UserRole.partner_storage,
      email_verified_at: new Date(),
    },
  });

  const transportPartnerUser = await prisma.user.create({
    data: {
      email: 'transport.partner@example.com',
      password_hash: passwordHash,
      full_name: 'Jean Dupont',
      phone: '+33 6 12345678',
      role: UserRole.partner_transport,
      email_verified_at: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@platform.com',
      password_hash: passwordHash,
      full_name: 'Sarah Chen',
      phone: '+1 415 555 0199',
      role: UserRole.admin,
      email_verified_at: new Date(),
    },
  });

  const support = await prisma.user.create({
    data: {
      email: 'support@platform.com',
      password_hash: passwordHash,
      full_name: 'Marcus Vance',
      phone: '+1 415 555 0144',
      role: UserRole.support,
      email_verified_at: new Date(),
    },
  });

  // 2. Partner Accounts & Providers
  console.log('🏢 Seeding partner accounts & providers...');
  const storagePartnerAccount = await prisma.partnerAccount.create({
    data: {
      user_id: storagePartnerUser.id,
      type: PartnerType.storage,
      status: PartnerStatus.verified,
      verified_at: new Date(),
    },
  });

  const storageProvider = await prisma.storageProvider.create({
    data: {
      partner_account_id: storagePartnerAccount.id,
      business_name: 'Berlin & Paris Luggage Safekeep Network',
      verification_status: VerificationStatus.verified,
      payout_details_ref: 'stripe_acct_storage_001',
    },
  });

  const transportPartnerAccount = await prisma.partnerAccount.create({
    data: {
      user_id: transportPartnerUser.id,
      type: PartnerType.transport,
      status: PartnerStatus.verified,
      verified_at: new Date(),
    },
  });

  const transportProvider = await prisma.transportProvider.create({
    data: {
      partner_account_id: transportPartnerAccount.id,
      name: 'EuroConnect Mobility & Transit',
      modes_supported: ['taxi', 'rideshare', 'transit', 'bike'],
      verification_status: VerificationStatus.verified,
    },
  });

  // 3. Seed 10 Storage Locations across 2 Cities (Berlin & Paris)
  console.log('📍 Seeding storage locations and daily inventories...');
  const locationsData = [
    // Berlin Locations
    {
      name: 'Berlin Hauptbahnhof Central Locker Hub',
      city: 'Berlin',
      lat: 52.5251,
      lng: 13.3694,
      address: 'Europaplatz 1, 10557 Berlin',
      price: 8.5,
      capacity: 50,
      max_bag_size: 'large',
    },
    {
      name: 'Alexanderplatz Station Luggage Point',
      city: 'Berlin',
      lat: 52.5219,
      lng: 13.4132,
      address: 'Dircksenstr. 2, 10178 Berlin',
      price: 7.0,
      capacity: 35,
      max_bag_size: 'cabin',
    },
    {
      name: 'Brandenburg Gate Secure Storage',
      city: 'Berlin',
      lat: 52.5163,
      lng: 13.3777,
      address: 'Pariser Platz 4, 10117 Berlin',
      price: 9.5,
      capacity: 25,
      max_bag_size: 'large',
    },
    {
      name: 'Kreuzberg 24/7 Boutique Lockers',
      city: 'Berlin',
      lat: 52.4986,
      lng: 13.4034,
      address: 'Oranienstr. 45, 10969 Berlin',
      price: 6.5,
      capacity: 20,
      max_bag_size: 'oversized',
    },
    {
      name: 'BER Airport Express Luggage Lounge',
      city: 'Berlin',
      lat: 52.3667,
      lng: 13.5033,
      address: 'Willy-Brandt-Platz 1, 12529 Schönefeld',
      price: 10.0,
      capacity: 80,
      max_bag_size: 'oversized',
    },
    // Paris Locations
    {
      name: 'Gare du Nord Express Baggage',
      city: 'Paris',
      lat: 48.8809,
      lng: 2.3553,
      address: '18 Rue de Dunkerque, 75010 Paris',
      price: 9.0,
      capacity: 60,
      max_bag_size: 'large',
    },
    {
      name: 'Eiffel Tower - Champ de Mars Cloakroom',
      city: 'Paris',
      lat: 48.8584,
      lng: 2.2945,
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      price: 12.0,
      capacity: 40,
      max_bag_size: 'cabin',
    },
    {
      name: 'Châtelet - Les Halles City Lockers',
      city: 'Paris',
      lat: 48.8619,
      lng: 2.3470,
      address: '101 Rue Rambuteau, 75001 Paris',
      price: 8.0,
      capacity: 45,
      max_bag_size: 'large',
    },
    {
      name: 'Gare de Lyon Storage & Rest Lounge',
      city: 'Paris',
      lat: 48.8443,
      lng: 2.3744,
      address: 'Place Louis-Armand, 75012 Paris',
      price: 9.0,
      capacity: 50,
      max_bag_size: 'oversized',
    },
    {
      name: 'Montmartre Sacré-Cœur Luggage Depot',
      city: 'Paris',
      lat: 48.8867,
      lng: 2.3431,
      address: '35 Rue du Chevalier de la Barre, 75018 Paris',
      price: 7.5,
      capacity: 25,
      max_bag_size: 'cabin',
    },
  ];

  const createdLocations = [];
  for (const item of locationsData) {
    const loc = await prisma.storageLocation.create({
      data: {
        provider_id: storageProvider.id,
        name: item.name,
        city: item.city,
        lat: item.lat,
        lng: item.lng,
        address: item.address,
        max_bag_size: item.max_bag_size,
        opening_hours: {
          mon: { open: '08:00', close: '22:00' },
          tue: { open: '08:00', close: '22:00' },
          wed: { open: '08:00', close: '22:00' },
          thu: { open: '08:00', close: '22:00' },
          fri: { open: '08:00', close: '23:00' },
          sat: { open: '08:00', close: '23:00' },
          sun: { open: '09:00', close: '21:00' },
        },
        accepted_item_categories: ['luggage', 'backpack', 'shopping_bags'],
        photos: [
          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
          'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
        ],
        is_active: true,
      },
    });

    createdLocations.push(loc);

    // Create 14 days of inventory for each location
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const invDate = new Date(today);
      invDate.setDate(today.getDate() + dayOffset);

      await prisma.storageInventory.create({
        data: {
          location_id: loc.id,
          date: invDate,
          total_capacity: item.capacity,
          booked_capacity: Math.floor(Math.random() * 5),
          price_per_bag_per_day: item.price,
        },
      });
    }
  }

  // 4. Seed 5 Transport Options
  console.log('🚆 Seeding transport options...');
  const transportOptions = await Promise.all([
    prisma.transportOption.create({
      data: {
        provider_id: transportProvider.id,
        mode: TransportMode.transit,
        origin_lat: 52.3667,
        origin_lng: 13.5033,
        destination_lat: 52.5251,
        destination_lng: 13.3694,
        estimated_price: 4.4,
        currency: 'USD',
        estimated_duration_min: 30,
      },
    }),
    prisma.transportOption.create({
      data: {
        provider_id: transportProvider.id,
        mode: TransportMode.taxi,
        origin_lat: 52.5251,
        origin_lng: 13.3694,
        destination_lat: 52.5219,
        destination_lng: 13.4132,
        estimated_price: 18.0,
        currency: 'USD',
        estimated_duration_min: 15,
      },
    }),
    prisma.transportOption.create({
      data: {
        provider_id: transportProvider.id,
        mode: TransportMode.transit,
        origin_lat: 49.0097,
        origin_lng: 2.5479,
        destination_lat: 48.8809,
        destination_lng: 2.3553,
        estimated_price: 11.8,
        currency: 'USD',
        estimated_duration_min: 35,
      },
    }),
    prisma.transportOption.create({
      data: {
        provider_id: transportProvider.id,
        mode: TransportMode.rideshare,
        origin_lat: 48.8809,
        origin_lng: 2.3553,
        destination_lat: 48.8584,
        destination_lng: 2.2945,
        estimated_price: 24.5,
        currency: 'USD',
        estimated_duration_min: 25,
        deep_link_url: 'https://m.uber.com/ul/?client_id=travelsync',
      },
    }),
    prisma.transportOption.create({
      data: {
        provider_id: transportProvider.id,
        mode: TransportMode.bike,
        origin_lat: 48.8619,
        origin_lng: 2.347,
        destination_lat: 48.8606,
        destination_lng: 2.3376,
        estimated_price: 4.5,
        currency: 'USD',
        estimated_duration_min: 10,
        deep_link_url: 'https://lime.bike/paris',
      },
    }),
  ]);

  // 5. Seed 3 Trips with realistic itinerary gaps
  console.log('✈️ Seeding trips and itineraries...');
  const tripBerlin = await prisma.trip.create({
    data: {
      user_id: traveler.id,
      title: 'Berlin Weekend Exploration',
      origin_place: 'London Heathrow (LHR)',
      destination_place: 'Berlin Brandenburg (BER)',
      start_date: new Date(Date.now() + 86400000), // Tomorrow
      end_date: new Date(Date.now() + 4 * 86400000),
      timezone: 'Europe/Berlin',
      status: TripStatus.confirmed,
    },
  });

  const tripParis = await prisma.trip.create({
    data: {
      user_id: traveler.id,
      title: 'Paris Art & Culture Tour',
      origin_place: 'London St Pancras',
      destination_place: 'Paris Gare du Nord',
      start_date: new Date(Date.now() + 10 * 86400000),
      end_date: new Date(Date.now() + 14 * 86400000),
      timezone: 'Europe/Paris',
      status: TripStatus.planning,
    },
  });

  const tripMunich = await prisma.trip.create({
    data: {
      user_id: traveler.id,
      title: 'Munich Transit & Meeting',
      origin_place: 'Frankfurt Hbf',
      destination_place: 'Munich Hbf',
      start_date: new Date(Date.now() + 20 * 86400000),
      end_date: new Date(Date.now() + 22 * 86400000),
      timezone: 'Europe/Berlin',
      status: TripStatus.planning,
    },
  });

  // 6. Seed Sample Bookings across diverse states
  console.log('📦 Seeding bookings in various states (confirmed, checked_in, pending, cancelled)...');
  const corrId = uuidv4();

  // Booking 1: Confirmed Storage Booking (Berlin Hbf)
  const dropOff1 = new Date(tripBerlin.start_date);
  dropOff1.setHours(10, 0, 0, 0);
  const pickUp1 = new Date(tripBerlin.start_date);
  pickUp1.setHours(18, 0, 0, 0);

  const storageBooking1 = await prisma.storageBooking.create({
    data: {
      user_id: traveler.id,
      location_id: createdLocations[0].id,
      trip_id: tripBerlin.id,
      status: StorageBookingStatus.confirmed,
      bag_count: 2,
      drop_off_at: dropOff1,
      pick_up_at: pickUp1,
      price_total: 17.0,
      currency: 'USD',
      idempotency_key: `seed-storage-booking-${uuidv4()}`,
    },
  });

  await prisma.payment.create({
    data: {
      user_id: traveler.id,
      related_type: PaymentRelatedType.storage_booking,
      related_id: storageBooking1.id,
      status: PaymentStatus.captured,
      amount: 17.0,
      currency: 'USD',
      provider_ref: 'pi_mock_seed_001',
      idempotency_key: `seed-payment-${uuidv4()}`,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actor_user_id: traveler.id,
      action: 'STORAGE_BOOKING_CREATED',
      entity_type: 'StorageBooking',
      entityId: storageBooking1.id,
      before_state: null,
      after_state: { id: storageBooking1.id, status: 'confirmed', bag_count: 2 },
      correlation_id: corrId,
    },
  });

  // Add itinerary item linking this storage
  await prisma.itineraryItem.create({
    data: {
      trip_id: tripBerlin.id,
      type: ItineraryItemType.storage,
      title: 'Luggage Storage @ Berlin Hbf',
      location_lat: createdLocations[0].lat,
      location_lng: createdLocations[0].lng,
      address: createdLocations[0].address,
      starts_at: dropOff1,
      ends_at: pickUp1,
      sequence_order: 1,
      linked_storage_booking_id: storageBooking1.id,
    },
  });

  // Booking 2: Checked In Storage Booking (Gare du Nord Paris)
  const dropOff2 = new Date();
  dropOff2.setHours(9, 0, 0, 0);
  const pickUp2 = new Date();
  pickUp2.setHours(17, 30, 0, 0);

  const storageBooking2 = await prisma.storageBooking.create({
    data: {
      user_id: traveler.id,
      location_id: createdLocations[5].id, // Gare du Nord
      status: StorageBookingStatus.checked_in,
      bag_count: 1,
      drop_off_at: dropOff2,
      pick_up_at: pickUp2,
      price_total: 9.0,
      currency: 'USD',
      idempotency_key: `seed-storage-booking-${uuidv4()}`,
    },
  });

  await prisma.payment.create({
    data: {
      user_id: traveler.id,
      related_type: PaymentRelatedType.storage_booking,
      related_id: storageBooking2.id,
      status: PaymentStatus.captured,
      amount: 9.0,
      currency: 'USD',
      provider_ref: 'pi_mock_seed_002',
    },
  });

  // Booking 3: Cancelled & Refunded Storage Booking
  const storageBooking3 = await prisma.storageBooking.create({
    data: {
      user_id: traveler.id,
      location_id: createdLocations[3].id,
      status: StorageBookingStatus.cancelled,
      bag_count: 1,
      drop_off_at: new Date(),
      pick_up_at: new Date(Date.now() + 7200000),
      price_total: 6.5,
      currency: 'USD',
      idempotency_key: `seed-storage-booking-${uuidv4()}`,
    },
  });

  await prisma.payment.create({
    data: {
      user_id: traveler.id,
      related_type: PaymentRelatedType.storage_booking,
      related_id: storageBooking3.id,
      status: PaymentStatus.refunded,
      amount: 6.5,
      currency: 'USD',
      provider_ref: 'pi_mock_seed_003',
    },
  });

  // Booking 4: Confirmed Transport Booking
  const transportBooking1 = await prisma.transportBooking.create({
    data: {
      user_id: traveler.id,
      transport_option_id: transportOptions[2].id, // Paris RER B
      trip_id: tripParis.id,
      status: TransportBookingStatus.confirmed,
      scheduled_at: new Date(tripParis.start_date),
      price_total: 11.8,
      currency: 'USD',
      idempotency_key: `seed-transport-booking-${uuidv4()}`,
    },
  });

  await prisma.itineraryItem.create({
    data: {
      trip_id: tripParis.id,
      type: ItineraryItemType.transport,
      title: 'Airport RER B Transit to Gare du Nord',
      location_lat: transportOptions[2].origin_lat,
      location_lng: transportOptions[2].origin_lng,
      starts_at: new Date(tripParis.start_date),
      ends_at: new Date(tripParis.start_date.getTime() + 35 * 60000),
      sequence_order: 1,
      linked_transport_booking_id: transportBooking1.id,
    },
  });

  // Notification Demo Record
  await prisma.notification.create({
    data: {
      user_id: traveler.id,
      channel: NotificationChannel.email,
      template: 'BOOKING_CONFIRMED',
      payload: {
        bookingId: storageBooking1.id,
        locationName: createdLocations[0].name,
        priceTotal: 17.0,
      },
      status: NotificationStatus.sent,
      sent_at: new Date(),
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Seed Summary:');
  console.log(`- 5 Users: traveler, storage_partner, transport_partner, admin, support`);
  console.log(`- 10 Storage Locations across Berlin & Paris with 14-day inventories`);
  console.log(`- 5 Multi-modal Transport Options`);
  console.log(`- 3 Trips with itinerary gap scenarios`);
  console.log(`- Multiple sample bookings across confirmed, checked_in, and cancelled states`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
