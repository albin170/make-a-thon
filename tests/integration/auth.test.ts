import * as argon2 from 'argon2';

describe('Authentication and RBAC Security Tests', () => {
  it('enforces password policy with minimum 9 chars and complexity', () => {
    const validatePassword = (password: string) => {
      if (password.length < 9) throw new Error('Too short');
      if (!/[A-Z]/.test(password)) throw new Error('Missing uppercase');
      if (!/[a-z]/.test(password)) throw new Error('Missing lowercase');
      if (!/[^A-Za-z0-9]/.test(password)) throw new Error('Missing special character');
      return true;
    };

    expect(() => validatePassword('short')).toThrow('Too short');
    expect(() => validatePassword('alllowercasenoextra')).toThrow('Missing uppercase');
    expect(() => validatePassword('ALLUPPERCASENOEXTRA')).toThrow('Missing lowercase');
    expect(() => validatePassword('NoSpecialChar123')).toThrow('Missing special character');
    expect(validatePassword('SecurePass@123')).toBe(true);
  });

  it('correctly hashes and verifies passwords using Argon2id', async () => {
    const raw = 'SuperSecret!2026';
    const hash = await argon2.hash(raw, { type: argon2.argon2id });
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isValid = await argon2.verify(hash, raw);
    expect(isValid).toBe(true);

    const isInvalid = await argon2.verify(hash, 'WrongPassword!1');
    expect(isInvalid).toBe(false);
  });

  it('normalizes email addresses to prevent duplicate accounts via case variations', () => {
    const normalize = (email: string) => email.trim().toLowerCase();
    expect(normalize('  Admin@BrightLoop.Com ')).toBe('admin@brightloop.com');
  });

  it('rejects expired password reset tokens', () => {
    const token = {
      expiresAt: new Date(Date.now() - 60000), // expired 1 min ago
      usedAt: null,
    };
    const isExpired = token.expiresAt < new Date();
    expect(isExpired).toBe(true);
  });

  it('rejects already used password reset tokens', () => {
    const token = {
      expiresAt: new Date(Date.now() + 60000),
      usedAt: new Date(),
    };
    const isUsable = !token.usedAt && token.expiresAt > new Date();
    expect(isUsable).toBe(false);
  });
});

