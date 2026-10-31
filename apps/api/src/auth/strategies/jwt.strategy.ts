import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'brightloop_default_jwt_secret_fallback_key_2026',
    });
  }

  async validate(payload: any) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked.');
    }

    // Subscription and invoice endpoints are keyed by Customer.id, while the
    // JWT subject is User.id. Resolve the relation here so every protected
    // customer-scoped endpoint can apply the correct ownership filter.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        customer: { select: { id: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
      customerId: user.customer?.id,
    };
  }
}


