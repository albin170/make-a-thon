import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };

  function contextFor(role?: string) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    } as any;
  }

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['ADMIN', ['ADMIN', 'STAFF']],
    ['STAFF', ['ADMIN', 'STAFF']],
    ['CUSTOMER', ['CUSTOMER']],
  ])('allows %s when its role is required', (role, requiredRoles) => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    expect(new RolesGuard(reflector as any).canActivate(contextFor(role))).toBe(true);
  });

  it('denies a role that is not required', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => new RolesGuard(reflector as any).canActivate(contextFor('CUSTOMER')))
      .toThrow(ForbiddenException);
  });

  it('denies requests without an authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue(['CUSTOMER']);
    expect(() => new RolesGuard(reflector as any).canActivate(contextFor()))
      .toThrow(ForbiddenException);
  });
});
