import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../middlewares/rate-limit.middleware.js';

export const authRouter = Router();

// Registration & Login
authRouter.post('/register', authController.register.bind(authController));
authRouter.post('/login', loginRateLimiter, authController.login.bind(authController));

// Token Refresh & Logout
authRouter.post('/refresh', authController.refresh.bind(authController));
authRouter.post('/logout', authController.logout.bind(authController));

// Profile
authRouter.get('/me', authenticate, authController.me.bind(authController));

// Password Reset Flow
authRouter.post('/forgot-password', authController.forgotPassword.bind(authController));
authRouter.post('/reset-password', authController.resetPassword.bind(authController));

// Email Verification Flow
authRouter.post('/verify-email/request', authController.requestEmailVerification.bind(authController));
authRouter.post('/verify-email/confirm', authController.confirmEmailVerification.bind(authController));
