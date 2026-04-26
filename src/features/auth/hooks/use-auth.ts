import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { signIn, signOut, signUp, AUTH_ERROR_MESSAGES } from '../api/auth';
import type { AuthError } from '../api/auth';

interface UseAuthReturn {
  isLoading: boolean;
  errorMessage: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const setUser = useAuthStore((s) => s.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      const result = await signIn(email, password);
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
        return false;
      }
      setUser(result.user);
      return true;
    },
    [setUser]
  );

  const register = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      const result = await signUp(email, password);
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
        return false;
      }
      setUser(result.user);
      return true;
    },
    [setUser]
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await signOut();
    setUser(null);
    setIsLoading(false);
  }, [setUser]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    errorMessage: error ? AUTH_ERROR_MESSAGES[error] : null,
    login,
    register,
    logout,
    clearError,
  };
}
