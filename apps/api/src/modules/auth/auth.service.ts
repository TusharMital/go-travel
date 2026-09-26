import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import { getNotificationsAdapter } from '../../adapters/notifications/index.js';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RequestVerificationInput,
  ConfirmVerificationInput,
} from './auth.dto.js';
import { UserRole, PartnerType, PartnerStatus, VerificationStatus } from '@travel/shared';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone?: string | null;
    email_verified_at?: Date | null;
    created_at: Date;
  };
}

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
    email_verified_at?: Date | null;
  }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        email_verified: !!user.email_verified_at,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
    );
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = uuidv4() + '.' + crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return rawToken;
  }

  async register(input: RegisterInput, correlationId: string): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          password_hash: passwordHash,
          full_name: input.full_name,
          phone: input.phone || null,
          role: input.role,
        },
      });

      if (input.role === UserRole.PARTNER_STORAGE) {
        const partnerAccount = await tx.partnerAccount.create({
          data: {
            user_id: user.id,
            type: PartnerType.STORAGE,
            status: PartnerStatus.PENDING,
          },
        });

        await tx.storageProvider.create({
          data: {
            partner_account_id: partnerAccount.id,
            business_name: input.business_name || `${input.full_name} Storage`,
            verification_status: VerificationStatus.PENDING,
          },
        });
      } else if (input.role === UserRole.PARTNER_TRANSPORT) {
        const partnerAccount = await tx.partnerAccount.create({
          data: {
            user_id: user.id,
            type: PartnerType.TRANSPORT,
            status: PartnerStatus.PENDING,
          },
        });

        await tx.transportProvider.create({
          data: {
            partner_account_id: partnerAccount.id,
            name: input.business_name || `${input.full_name} Transport`,
            modes_supported: ['taxi', 'rideshare'],
            verification_status: VerificationStatus.PENDING,
          },
        });
      }

      return user;
    });

    await recordAuditEvent({
      actorUserId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: newUser.id,
      beforeState: null,
      afterState: { id: newUser.id, email: newUser.email, role: newUser.role },
      correlationId,
    });

    const accessToken = this.generateAccessToken(newUser);
    const refreshToken = await this.generateRefreshToken(newUser.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone,
        email_verified_at: newUser.email_verified_at,
        created_at: newUser.created_at,
      },
    };
  }

  async login(input: LoginInput, correlationId: string): Promise<AuthResponse> {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deleted_at: null,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    await recordAuditEvent({
      actorUserId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      beforeState: null,
      afterState: { id: user.id, email: user.email },
      correlationId,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
      },
    };
  }

  async refreshToken(rawToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked_at || storedToken.expires_at < new Date()) {
      throw new AppError('Refresh token is invalid or expired.', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (storedToken.user.deleted_at) {
      throw new AppError('Account is no longer active.', 401, 'ACCOUNT_DEACTIVATED');
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    const newAccessToken = this.generateAccessToken(storedToken.user);
    const newRefreshToken = await this.generateRefreshToken(storedToken.user_id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(rawToken: string, correlationId?: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);

    const token = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (token) {
      await prisma.refreshToken.update({
        where: { id: token.id },
        data: { revoked_at: new Date() },
      });

      if (correlationId) {
        await recordAuditEvent({
          actorUserId: token.user_id,
          action: 'USER_LOGOUT',
          entityType: 'RefreshToken',
          entityId: token.id,
          beforeState: { revoked_at: null },
          afterState: { revoked_at: new Date() },
          correlationId,
        });
      }
    }
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        email_verified_at: true,
        created_at: true,
        partner_account: {
          select: {
            id: true,
            type: true,
            status: true,
            verified_at: true,
            storage_provider: {
              select: {
                id: true,
                business_name: true,
                verification_status: true,
              },
            },
            transport_provider: {
              select: {
                id: true,
                name: true,
                verification_status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    return user;
  }

  async forgotPassword(input: ForgotPasswordInput, correlationId: string): Promise<{ message: string }> {
    const user = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deleted_at: null },
    });

    if (!user) {
      // Do not reveal whether user exists for privacy and enumeration protection
      return { message: 'If that email is registered, a password reset link has been dispatched.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // Notify via decoupled notifications provider adapter
    const notifications = getNotificationsAdapter();
    await notifications.send({
      toUserId: user.id,
      recipientEmail: user.email,
      channel: 'EMAIL',
      template: 'PASSWORD_RESET',
      data: {
        resetToken: rawToken,
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await recordAuditEvent({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      beforeState: null,
      afterState: { email: user.email },
      correlationId,
    });

    return { message: 'If that email is registered, a password reset link has been dispatched.' };
  }

  async resetPassword(input: ResetPasswordInput, correlationId: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(input.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.used_at || resetToken.expires_at < new Date()) {
      throw new AppError('Password reset token is invalid or has expired.', 400, 'INVALID_RESET_TOKEN');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(input.newPassword, saltRounds);

    // Transaction to update password, mark token used, and revoke all active refresh tokens
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.user_id },
        data: { password_hash: newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used_at: new Date() },
      });

      await tx.refreshToken.updateMany({
        where: { user_id: resetToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    });

    await recordAuditEvent({
      actorUserId: resetToken.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: resetToken.user_id,
      beforeState: null,
      afterState: { password_updated: true },
      correlationId,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  async requestEmailVerification(
    input: RequestVerificationInput,
    currentUserId?: string,
    correlationId: string = ''
  ): Promise<{ message: string }> {
    let user;
    if (currentUserId) {
      user = await prisma.user.findUnique({ where: { id: currentUserId } });
    } else if (input.email) {
      user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    }

    if (!user) {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    if (user.email_verified_at) {
      throw new AppError('Email address is already verified.', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const notifications = getNotificationsAdapter();
    await notifications.send({
      toUserId: user.id,
      recipientEmail: user.email,
      channel: 'EMAIL',
      template: 'EMAIL_VERIFICATION',
      data: {
        verificationToken: rawToken,
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await recordAuditEvent({
      actorUserId: user.id,
      action: 'EMAIL_VERIFICATION_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      beforeState: null,
      afterState: { email: user.email },
      correlationId,
    });

    return { message: 'A verification email has been dispatched.' };
  }

  async confirmEmailVerification(
    input: ConfirmVerificationInput,
    correlationId: string
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(input.token);

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!verificationToken || verificationToken.used_at || verificationToken.expires_at < new Date()) {
      throw new AppError(
        'Email verification token is invalid or has expired.',
        400,
        'INVALID_VERIFICATION_TOKEN'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verificationToken.user_id },
        data: { email_verified_at: new Date() },
      });

      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used_at: new Date() },
      });
    });

    await recordAuditEvent({
      actorUserId: verificationToken.user_id,
      action: 'EMAIL_VERIFIED',
      entityType: 'User',
      entityId: verificationToken.user_id,
      beforeState: { email_verified_at: null },
      afterState: { email_verified_at: new Date() },
      correlationId,
    });

    return { message: 'Email address verified successfully.' };
  }
}

export const authService = new AuthService();
