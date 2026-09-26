import { Request, Response } from 'express';
import { partnersService } from './partners.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import {
  PartnerOnboardingSchema,
  CreatePartnerLocationSchema,
  UpdateInventoryPricingSchema,
} from './partners.dto.js';
import { parsePagination } from '../../utils/pagination.js';
import { UpdatePartnerStatusDto } from '../notifications/notifications.dto.js';

export class PartnersController {
  async getProfile(req: Request, res: Response) {
    const profile = await partnersService.getPartnerProfile(req.user!.id);
    return res.json(profile);
  }

  async submitOnboarding(req: Request, res: Response) {
    const validated = PartnerOnboardingSchema.parse(req.body);
    const correlationId = (req as any).correlationId || 'corr-onboarding';
    const result = await partnersService.submitOnboarding(req.user!.id, validated, correlationId);
    return res.status(201).json(result);
  }

  async listLocations(req: Request, res: Response) {
    const locations = await partnersService.listLocations(req.user!.id);
    return res.json({ data: locations });
  }

  async createLocation(req: Request, res: Response) {
    const validated = CreatePartnerLocationSchema.parse(req.body);
    const correlationId = (req as any).correlationId || 'corr-create-location';
    const location = await partnersService.createLocation(req.user!.id, validated, correlationId);
    return res.status(201).json(location);
  }

  async updateLocationInventory(req: Request, res: Response) {
    const locationId = req.params.id;
    const validated = UpdateInventoryPricingSchema.parse(req.body);
    const correlationId = (req as any).correlationId || 'corr-update-inv';
    const result = await partnersService.updateLocationInventory(req.user!.id, locationId, validated, correlationId);
    return res.json(result);
  }

  async listBookings(req: Request, res: Response) {
    const pagination = parsePagination(req);
    const status = req.query.status as string | undefined;
    const result = await partnersService.listBookings(req.user!.id, pagination, status);
    return res.json(result);
  }

  async checkInBooking(req: Request, res: Response) {
    const bookingId = req.params.id;
    const correlationId = (req as any).correlationId || 'corr-check-in';
    const result = await partnersService.checkInBooking(bookingId, req.user!.id, correlationId);
    return res.json({ message: 'Booking checked in successfully.', booking: result });
  }

  async checkOutBooking(req: Request, res: Response) {
    const bookingId = req.params.id;
    const correlationId = (req as any).correlationId || 'corr-check-out';
    const result = await partnersService.checkOutBooking(bookingId, req.user!.id, correlationId);
    return res.json({ message: 'Booking checked out successfully.', booking: result });
  }

  async getPayoutSummary(req: Request, res: Response) {
    const summary = await partnersService.getPayoutSummary(req.user!.id);
    return res.json(summary);
  }

  async requestPayout(req: Request, res: Response) {
    const correlationId = (req as any).correlationId || 'corr-payout';
    const result = await partnersService.requestPayout(req.user!.id, correlationId);
    return res.json(result);
  }

  async updatePartnerStatus(req: Request, res: Response) {
    const partnerAccountId = req.params.id;
    const validated = UpdatePartnerStatusDto.parse(req.body);
    const correlationId = (req as any).correlationId || 'corr-partner-status';
    const result = await notificationsService.updatePartnerStatus(
      partnerAccountId,
      validated.status,
      validated.notes,
      req.user!.id,
      correlationId
    );
    return res.json(result);
  }
}

export const partnersController = new PartnersController();
