import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { addMinutes } from 'date-fns';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const PASSWORD_MIN_LENGTH = 9;
const PASSWORD_MAX_LENGTH = 128;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim();
    const emailNormalized = email.toLowerCase();
    this.validatePasswordStrength(dto.password);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    try {
      const user = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          emailNormalized,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim(),
          role: 'CUSTOMER',
          customer: {
            create: {
              id: uuidv4(),
              companyName: dto.companyName?.trim(),
              currency: 'USD',
            },
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      return { user, message: 'Account created successfully.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const raw = dto.email.trim();
    let emailNormalized = raw.toLowerCase();
    if (emailNormalized === "admin") emailNormalized = "admin@gmail.com";
    if (emailNormalized === "staff") emailNormalized = "staff@gmail.com";

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { emailNormalized },
          { emailNormalized: raw.toLowerCase() },
          { firstName: { equals: raw, mode: "insensitive" } },
        ],
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const rawRefreshToken = this.createRefreshToken();
    const sessionId = uuidv4();
    await this.prisma.$transaction([
      this.prisma.userSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken: this.hashToken(rawRefreshToken),
          expiresAt: this.getRefreshTokenExpiry(),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      accessToken: this.signAccessToken(user.id, user.email, user.role, sessionId),
      refreshToken: rawRefreshToken,
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
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const emailNormalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { emailNormalized } });
    if (!user) return;

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: addMinutes(
          new Date(),
          Number(this.config.get('PASSWORD_RESET_TOKEN_TTL_MINUTES') || 60),
        ),
      },
    });

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
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });

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
      this.prisma.userSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  async refreshToken(rawRefreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: this.hashToken(rawRefreshToken) },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const nextRefreshToken = this.createRefreshToken();
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: this.hashToken(nextRefreshToken),
        expiresAt: this.getRefreshTokenExpiry(),
      },
    });

    return {
      accessToken: this.signAccessToken(
        session.user.id,
        session.user.email,
        session.user.role,
        session.id,
      ),
      refreshToken: nextRefreshToken,
    };
  }

  private validatePasswordStrength(password: string) {
    if (
      !password ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new BadRequestException(
        'Password must be 9-128 characters and contain uppercase, lowercase, and special characters.',
      );
    }
  }

  private createRefreshToken() {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(id: string, email: string, role: string, sessionId: string) {
    return this.jwtService.sign({ sub: id, email, role, sessionId });
  }

  private getRefreshTokenExpiry() {
    const configured = this.config.get<string>('REFRESH_TOKEN_EXPIRY') || '7d';
    const match = /^(\d+)([mhd])$/.exec(configured);
    const value = match ? Number(match[1]) : 7;
    const multiplier = match?.[2] === 'm' ? 60_000 : match?.[2] === 'h' ? 3_600_000 : 86_400_000;
    return new Date(Date.now() + value * multiplier);
  }
}
