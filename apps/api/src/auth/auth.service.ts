import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { addMinutes } from 'date-fns';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const emailNormalized = dto.email.trim().toLowerCase();

    const exists = await this.prisma.user.findUnique({ where: { emailNormalized } });
    if (exists) {
      throw new ConflictException('An account with this email already exists.');
    }

    this.validatePasswordStrength(dto.password);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        email: dto.email.trim(),
        emailNormalized,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'CUSTOMER',
        customer: {
          create: {
            id: uuidv4(),
            companyName: dto.companyName,
            currency: 'USD',
          },
        },
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, createdAt: true,
      },
    });

    return { user, message: 'Account created successfully.' };
  }

  async login(dto: LoginDto) {
    const emailNormalized = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { emailNormalized } });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Create session
    const sessionId = uuidv4();
    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async logout(sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const emailNormalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { emailNormalized } });
    // Silent: do nothing if user not found (prevent enumeration)
    if (!user) return;

    // Expire old tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes = this.config.get('PASSWORD_RESET_TOKEN_TTL_MINUTES') || 60;

    await this.prisma.passwordResetToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        tokenHash,
        expiresAt: addMinutes(new Date(), Number(ttlMinutes)),
      },
    });

    // Enqueue email via outbox
    await this.prisma.notificationOutbox.create({
      data: {
        id: uuidv4(),
        type: 'PASSWORD_RESET',
        payload: {
          to: user.email,
          firstName: user.firstName,
          resetUrl: `${this.config.get('APP_URL')}/reset-password?token=${rawToken}`,
        },
      },
    });

    this.logger.log(`Password reset requested for user ${user.id}`);
  }

  async resetPassword(rawToken: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired.');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoke all sessions
      this.prisma.userSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  async refreshToken(rawRefreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: rawRefreshToken },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active.');
    }

    const accessToken = this.jwtService.sign({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    });

    return { accessToken };
  }

  private validatePasswordStrength(password: string) {
    if (password.length < 9) {
      throw new BadRequestException('Password must be at least 9 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character.');
    }
  }
}

