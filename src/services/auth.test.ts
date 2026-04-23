import { signIn, signUp, signOut, getSession, AUTH_ERROR_MESSAGES } from './auth';

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const fakeSupabaseUser = {
  id: 'user-123',
  email: 'a@b.com',
  created_at: '2026-04-23T10:00:00Z',
};

beforeEach(() => {
  mockSignUp.mockReset();
  mockSignInWithPassword.mockReset();
  mockSignOut.mockReset();
  mockGetSession.mockReset();
});

describe('signUp', () => {
  it('returns user on success', async () => {
    mockSignUp.mockResolvedValue({ data: { user: fakeSupabaseUser }, error: null });
    const res = await signUp('a@b.com', 'pw123456');
    expect(res.error).toBeNull();
    expect(res.user).toEqual({ id: 'user-123', email: 'a@b.com', createdAt: '2026-04-23T10:00:00Z' });
  });

  it('maps "already registered" to email_taken', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } });
    const res = await signUp('a@b.com', 'pw123456');
    expect(res.user).toBeNull();
    expect(res.error).toBe('email_taken');
  });

  it('maps "Password should" to weak_password', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'Password should be at least 6 characters' } });
    const res = await signUp('a@b.com', '123');
    expect(res.error).toBe('weak_password');
  });

  it('returns network_error on thrown error', async () => {
    mockSignUp.mockRejectedValue(new Error('network down'));
    const res = await signUp('a@b.com', 'pw123456');
    expect(res.error).toBe('network_error');
  });

  it('returns unknown when no user and no error', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: null });
    const res = await signUp('a@b.com', 'pw123456');
    expect(res.error).toBe('unknown');
  });
});

describe('signIn', () => {
  it('returns user on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: fakeSupabaseUser }, error: null });
    const res = await signIn('a@b.com', 'pw123456');
    expect(res.error).toBeNull();
    expect(res.user?.id).toBe('user-123');
  });

  it('maps "Invalid login credentials" to invalid_credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } });
    const res = await signIn('a@b.com', 'wrong');
    expect(res.error).toBe('invalid_credentials');
  });

  it('returns network_error on fetch failure', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('fetch failed'));
    const res = await signIn('a@b.com', 'pw');
    expect(res.error).toBe('network_error');
  });
});

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('resolves even if supabase throws', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'network' } });
    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe('getSession', () => {
  it('returns null when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await getSession()).toBeNull();
  });

  it('returns user when session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: fakeSupabaseUser } } });
    const user = await getSession();
    expect(user?.email).toBe('a@b.com');
  });
});

describe('AUTH_ERROR_MESSAGES', () => {
  it('has a message for every AuthError code', () => {
    expect(AUTH_ERROR_MESSAGES.email_taken).toBeTruthy();
    expect(AUTH_ERROR_MESSAGES.weak_password).toBeTruthy();
    expect(AUTH_ERROR_MESSAGES.invalid_credentials).toBeTruthy();
    expect(AUTH_ERROR_MESSAGES.network_error).toBeTruthy();
    expect(AUTH_ERROR_MESSAGES.unknown).toBeTruthy();
  });
});
