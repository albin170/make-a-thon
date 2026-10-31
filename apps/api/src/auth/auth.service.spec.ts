import { AuthService } from './auth.service';

describe('AuthService security policy', () => {
  const service = new AuthService({} as any, {} as any, { get: jest.fn() } as any);

  it('accepts a password that meets the policy', () => {
    expect(() => (service as any).validatePasswordStrength('SecurePass@123')).not.toThrow();
  });

  it.each([
    'short',
    'alllowercase123!',
    'ALLUPPERCASE123!',
    'NoSpecialChar123',
    'A1!short',
  ])('rejects weak password %s', (password: string) => {
    expect(() => (service as any).validatePasswordStrength(password)).toThrow(
      'Password must be 9-128 characters and contain uppercase, lowercase, and special characters.',
    );
  });

  it('does not generate the same refresh expiry for malformed configuration', () => {
    const expiry = (service as any).getRefreshTokenExpiry() as Date;
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});
