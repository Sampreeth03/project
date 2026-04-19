const { signToken, verifyToken } = require('../../config/jwt');

describe('config/jwt', () => {
  it('signs and verifies token payload', () => {
    const payload = { id: 'u1', email: 'user@example.com', role: 'user' };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).toMatchObject(payload);
  });

  it('returns null for invalid token', () => {
    expect(verifyToken('not-a-valid-token')).toBeNull();
  });
});
