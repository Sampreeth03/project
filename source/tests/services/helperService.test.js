const { validatePassword, getTimeAgo, getNavLinks } = require('../../services/helperService');

describe('services/helperService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('validatePassword accepts strong password and rejects weak values', () => {
    expect(validatePassword('Pass@12')).toBe(true);
    expect(validatePassword('pass@12')).toBe(false);
    expect(validatePassword('PASS12')).toBe(false);
    expect(validatePassword('P@1')).toBe(false);
  });

  it('getTimeAgo formats pluralized day/hour/minute/second values', () => {
    expect(getTimeAgo('2025-12-30T00:00:00.000Z')).toBe('2 days ago');
    expect(getTimeAgo('2025-12-31T23:00:00.000Z')).toBe('1 hour ago');
    expect(getTimeAgo('2025-12-31T23:59:00.000Z')).toBe('1 minute ago');
    expect(getTimeAgo('2025-12-31T23:59:58.000Z')).toBe('2 seconds ago');
  });

  it('getNavLinks appends role-specific links and logout', () => {
    const adminLinks = getNavLinks({ role: 'admin' });
    const recruiterLinks = getNavLinks({ role: 'recruiter' });
    const userLinks = getNavLinks({ role: 'user' });

    expect(adminLinks.some((link) => link.name === 'Admin Panel')).toBe(true);
    expect(recruiterLinks.some((link) => link.name === 'Recruiter Dashboard')).toBe(true);
    expect(userLinks.some((link) => link.name === 'Admin Panel')).toBe(false);
    expect(userLinks[userLinks.length - 1]).toEqual(expect.objectContaining({ name: 'Logout' }));
  });
});