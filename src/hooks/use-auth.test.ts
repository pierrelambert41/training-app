import { act, renderHook } from '@testing-library/react-native';
import { useAuth } from './use-auth';
import { useAuthStore } from '@/stores/auth-store';

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/services/auth', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  AUTH_ERROR_MESSAGES: {
    email_taken: 'Cette adresse email est déjà utilisée.',
    weak_password: 'Le mot de passe doit contenir au moins 6 caractères.',
    invalid_credentials: 'Email ou mot de passe incorrect.',
    network_error: 'Erreur réseau. Vérifiez votre connexion.',
    unknown: 'Une erreur inattendue est survenue.',
  },
}));

const fakeUser = { id: 'u1', email: 'a@b.com', createdAt: '2026-04-23T10:00:00Z' };

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignUp.mockReset();
  mockSignOut.mockReset();
  useAuthStore.setState({ user: null, isAuthenticated: false, isHydrated: false });
});

describe('useAuth.login', () => {
  it('sets user in store on success', async () => {
    mockSignIn.mockResolvedValue({ user: fakeUser, error: null });
    const { result } = renderHook(() => useAuth());
    let ok = false;
    await act(async () => {
      ok = await result.current.login('a@b.com', 'pw');
    });
    expect(ok).toBe(true);
    expect(useAuthStore.getState().user).toEqual(fakeUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(result.current.errorMessage).toBeNull();
  });

  it('exposes an error message on failure and does not set user', async () => {
    mockSignIn.mockResolvedValue({ user: null, error: 'invalid_credentials' });
    const { result } = renderHook(() => useAuth());
    let ok = true;
    await act(async () => {
      ok = await result.current.login('a@b.com', 'wrong');
    });
    expect(ok).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(result.current.errorMessage).toBe('Email ou mot de passe incorrect.');
  });
});

describe('useAuth.register', () => {
  it('sets user in store on success', async () => {
    mockSignUp.mockResolvedValue({ user: fakeUser, error: null });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.register('a@b.com', 'pw123456');
    });
    expect(useAuthStore.getState().user).toEqual(fakeUser);
  });

  it('exposes error message for email_taken', async () => {
    mockSignUp.mockResolvedValue({ user: null, error: 'email_taken' });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.register('a@b.com', 'pw123456');
    });
    expect(result.current.errorMessage).toBe('Cette adresse email est déjà utilisée.');
  });
});

describe('useAuth.logout', () => {
  it('clears user in store', async () => {
    mockSignOut.mockResolvedValue(undefined);
    useAuthStore.setState({ user: fakeUser, isAuthenticated: true, isHydrated: true });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useAuth.clearError', () => {
  it('resets error message after a failure', async () => {
    mockSignIn.mockResolvedValue({ user: null, error: 'invalid_credentials' });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('a@b.com', 'wrong');
    });
    expect(result.current.errorMessage).not.toBeNull();
    act(() => {
      result.current.clearError();
    });
    expect(result.current.errorMessage).toBeNull();
  });
});
