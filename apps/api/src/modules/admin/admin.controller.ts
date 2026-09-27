import { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import {
  ApprovePartnerDto,
  SuspendPartnerDto,
  PartnerQueryDto,
  BookingLookupQueryDto,
  AuditLogQueryDto,
} from './admin.dto.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class AdminController {
  /**
   * GET /api/v1/admin/metrics
   */
  async getMetrics(_req: Request, res: Response): Promise<void> {
    const metrics = await adminService.getMetrics();
    res.json({
      status: 'success',
      data: metrics,
    });
  }

  /**
   * GET /api/v1/admin/partners
   */
  async getPartners(req: Request, res: Response): Promise<void> {
    const query = PartnerQueryDto.parse(req.query);
    const result = await adminService.getPartners(query);
    res.json({
      status: 'success',
      data: result.items,
      pagination: result.pagination,
      counts: result.counts,
    });
  }

  /**
   * GET /api/v1/admin/partners/:id
   */
  async getPartnerById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await adminService.getPartnerById(id);
    res.json({
      status: 'success',
      data: result,
    });
  }

  /**
   * POST /api/v1/admin/partners/:id/approve
   */
  async approvePartner(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const body = ApprovePartnerDto.parse(req.body);
    const adminUserId = req.user!.id;
    const correlationId = req.correlationId || 'admin-action';

    const result = await adminService.approvePartner(
      id,
      body.notes,
      adminUserId,
      correlationId
    );

    res.json({
      status: 'success',
      message: 'Partner verified successfully.',
      data: result,
    });
  }

  /**
   * POST /api/v1/admin/partners/:id/suspend
   */
  async suspendPartner(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const body = SuspendPartnerDto.parse(req.body);
    const adminUserId = req.user!.id;
    const correlationId = req.correlationId || 'admin-action';

    const result = await adminService.suspendPartner(
      id,
      body.reason,
      adminUserId,
      correlationId
    );

    res.json({
      status: 'success',
      message: 'Partner suspended successfully.',
      data: result,
    });
  }

  /**
   * GET /api/v1/admin/bookings/lookup
   */
  async lookupBookings(req: Request, res: Response): Promise<void> {
    const query = BookingLookupQueryDto.parse(req.query);
    const bookings = await adminService.lookupBookings(query);
    res.json({
      status: 'success',
      data: bookings,
      count: bookings.length,
    });
  }

  /**
   * GET /api/v1/admin/bookings/:type/:id
   */
  async getBookingDetail(req: Request, res: Response): Promise<void> {
    const { type, id } = req.params;
    if (type !== 'storage' && type !== 'transport') {
      throw new AppError("Invalid booking type parameter. Must be 'storage' or 'transport'.", 400, 'INVALID_PARAM');
    }

    const detail = await adminService.getBookingDetail(type, id);
    res.json({
      status: 'success',
      data: detail,
    });
  }

  /**
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    const query = AuditLogQueryDto.parse(req.query);
    const result = await adminService.getAuditLogs(query);
    res.json({
      status: 'success',
      data: result.events,
      pagination: result.pagination,
    });
  }

  /**
   * GET /api/v1/admin/audit-logs/entity/:entityId
   */
  async getAuditLogsByEntityId(req: Request, res: Response): Promise<void> {
    const { entityId } = req.params;
    const result = await adminService.getAuditLogsByEntityId(entityId);
    res.json({
      status: 'success',
      data: result,
    });
  }
}

export const adminController = new AdminController();

