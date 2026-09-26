import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto } from './auth.dto.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RegisterDto.parse(req.body);
      const result = await authService.register(validated, req.correlationId || '');
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LoginDto.parse(req.body);
      const result = await authService.login(validated, req.correlationId || '');
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RefreshTokenDto.parse(req.body);
      const result = await authService.refreshToken(validated.refreshToken);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RefreshTokenDto.parse(req.body);
      await authService.logout(validated.refreshToken, req.correlationId);
      res.status(200).json({ message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
