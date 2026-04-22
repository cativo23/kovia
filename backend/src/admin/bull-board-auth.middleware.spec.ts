import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';

const mockJwtService = {
  verify: vi.fn(),
};

const mockConfig = {
  get: vi.fn().mockReturnValue('test-access-secret'),
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return { headers: {}, query: {}, ...overrides } as any;
}

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
}

describe('BullBoardAuthMiddleware', () => {
  let middleware: BullBoardAuthMiddleware;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new BullBoardAuthMiddleware(
      mockJwtService as any,
      mockConfig as any,
    );
    next = vi.fn();
  });

  it('should reject with 401 when no token is provided', () => {
    const req = makeReq();
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject with 403 when JWT role is not PLATFORM_ADMIN', () => {
    mockJwtService.verify.mockReturnValue({ role: 'ADOPTER' });
    const req = makeReq({ headers: { authorization: 'Bearer some-token' } });
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() when JWT role is PLATFORM_ADMIN', () => {
    mockJwtService.verify.mockReturnValue({ role: 'PLATFORM_ADMIN' });
    const req = makeReq({ headers: { authorization: 'Bearer admin-token' } });
    const res = makeRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject with 401 when JWT verification throws', () => {
    mockJwtService.verify.mockImplementation(() => { throw new Error('invalid signature'); });
    const req = makeReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept token from ?token= query param when no Authorization header', () => {
    mockJwtService.verify.mockReturnValue({ role: 'PLATFORM_ADMIN' });
    const req = makeReq({ query: { token: 'query-token' } });
    const res = makeRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(mockJwtService.verify).toHaveBeenCalledWith('query-token', { secret: 'test-access-secret' });
  });
});
