describe('middleware/securityMiddleware', () => {
  const loadMiddleware = () => {
    jest.resetModules();
    return require('../../middleware/securityMiddleware');
  };

  it('allows missing origin requests', () => {
    const { corsOptions } = loadMiddleware();

    const callback = jest.fn();
    corsOptions.origin(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('allows localhost origin in production mode', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { corsOptions } = loadMiddleware();

    const callback = jest.fn();
    corsOptions.origin('http://localhost:5173', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    process.env.NODE_ENV = prev;
  });

  it('blocks unknown origin in production mode', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevCors = process.env.CORS_ALLOWED_ORIGINS;

    process.env.NODE_ENV = 'production';
    process.env.CORS_ALLOWED_ORIGINS = 'https://allowed.example.com';

    const { corsOptions } = loadMiddleware();
    const callback = jest.fn();
    corsOptions.origin('https://evil.example.com', callback);

    expect(callback).toHaveBeenCalled();
    const firstArg = callback.mock.calls[0][0];
    expect(firstArg).toBeInstanceOf(Error);
    expect(firstArg.message).toContain('Not allowed by CORS');

    process.env.NODE_ENV = prevNodeEnv;
    process.env.CORS_ALLOWED_ORIGINS = prevCors;
  });
});