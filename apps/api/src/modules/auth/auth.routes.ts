import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginRateLimiter, authRateLimiter } from '../../middlewares/rate-limit.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RequestVerificationDto,
  ConfirmVerificationDto,
} from './auth.dto.js';

export const authRouter = Router();

// Registration & Login
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: RegisterDto }),
  authController.register.bind(authController)
);
authRouter.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: LoginDto }),
  authController.login.bind(authController)
);

// Token Refresh & Logout
authRouter.post(
  '/refresh',
  validateRequest({ body: RefreshTokenDto }),
  authController.refresh.bind(authController)
);
authRouter.post(
  '/logout',
  validateRequest({ body: RefreshTokenDto }),
  authController.logout.bind(authController)
);

// Profile
authRouter.get('/me', authenticate, authController.me.bind(authController));

// Password Reset Flow
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest({ body: ForgotPasswordDto }),
  authController.forgotPassword.bind(authController)
);
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validateRequest({ body: ResetPasswordDto }),
  authController.resetPassword.bind(authController)
);

// Email Verification Flow
authRouter.post(
  '/verify-email/request',
  authRateLimiter,
  validateRequest({ body: RequestVerificationDto }),
  authController.requestEmailVerification.bind(authController)
);
authRouter.post(
  '/verify-email/confirm',
  authRateLimiter,
  validateRequest({ body: ConfirmVerificationDto }),
  authController.confirmEmailVerification.bind(authController)
);

