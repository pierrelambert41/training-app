import { supabase } from './supabase';
import type { User } from '@/types/user';

export type AuthError =
  | 'email_taken'
  | 'weak_password'
  | 'invalid_credentials'
  | 'network_error'
  | 'unknown';

export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: AuthError };

function mapSupabaseError(message: string): AuthError {
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'email_taken';
  }
  if (message.includes('Password should') || message.includes('weak')) {
    return 'weak_password';
  }
  if (
    message.includes('Invalid login') ||
    message.includes('invalid_grant') ||
    message.includes('Email not confirmed') ||
    message.includes('Invalid email or password')
  ) {
    return 'invalid_credentials';
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return 'network_error';
  }
  return 'unknown';
}

function toUser(supabaseUser: { id: string; email?: string; created_at: string }): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    createdAt: supabaseUser.created_at,
  };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { user: null, error: mapSupabaseError(error.message) };
    }
    if (!data.user) {
      return { user: null, error: 'unknown' };
    }
    return { user: toUser(data.user), error: null };
  } catch {
    return { user: null, error: 'network_error' };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { user: null, error: mapSupabaseError(error.message) };
    }
    if (!data.user) {
      return { user: null, error: 'unknown' };
    }
    return { user: toUser(data.user), error: null };
  } catch {
    return { user: null, error: 'network_error' };
  }
}

export async function signOut(): Promise<void> {
  // Offline-first: on ignore une éventuelle erreur réseau côté Supabase.
  // La session locale est vidée par l'appelant via setUser(null).
  await supabase.auth.signOut();
}

export async function getSession(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  return toUser(data.session.user);
}

export const AUTH_ERROR_MESSAGES: Record<AuthError, string> = {
  email_taken: 'Cette adresse email est déjà utilisée.',
  weak_password: 'Le mot de passe doit contenir au moins 6 caractères.',
  invalid_credentials: 'Email ou mot de passe incorrect.',
  network_error: 'Erreur réseau. Vérifiez votre connexion.',
  unknown: 'Une erreur inattendue est survenue.',
};
